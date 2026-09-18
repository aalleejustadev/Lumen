import "server-only"

import { getSession } from "@/lib/auth"
import {
  categoryGradients,
  FALLBACK_CATEGORY_GRADIENT,
} from "@/lib/config/admin-overview"
import type {
  EnrolledCourse,
  LearningStat,
} from "@/lib/config/my-learning-shape"
import { db } from "@/lib/db"

/**
 * My Learning, read from the learner's own `Enrollment` rows.
 *
 * **This replaces `lib/config/my-learning.ts`.** That file seeded five
 * enrolments as plain data and resolved the *course* out of the static catalog
 * by slug — so a learner who actually bought something saw somebody else's
 * demo shelf, and nothing they did ever changed it. Buying a course now
 * creates an enrolment (`lib/enrolment.ts`) and ticking a lesson moves its
 * progress (`lib/completion.ts`), and this is what draws both.
 *
 * Two things the old file modelled that are worth keeping:
 *
 *  - **`progress` is the stored column, not a lesson ratio.** The export's own
 *    cards contradict the ratio on purpose — 14 of 25 lessons against 55% —
 *    which is what time-weighted progress looks like, and
 *    `Enrollment.progressPercent` is the column that holds it.
 *  - **The counts come from one list**, so the stat row, the tabs and the
 *    footer cannot disagree about how many courses are in progress.
 */

export type { EnrolledCourse, LearningStat }

export type MyLearning = {
  courses: EnrolledCourse[]
  stats: {
    inProgress: number
    completed: number
    /** Whole hours of the enrolled courses' own length. */
    hours: number
    certificates: number
  }
}

export async function getMyLearning(): Promise<MyLearning> {
  const empty: MyLearning = {
    courses: [],
    stats: { inProgress: 0, completed: 0, hours: 0, certificates: 0 },
  }

  const session = await getSession()
  if (!session) return empty

  const rows = await db.enrollment.findMany({
    where: { userId: session.user.id },
    orderBy: [{ lastAccessedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      progressPercent: true,
      completedLessons: true,
      completedAt: true,
      currentLessonId: true,
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          level: true,
          durationHours: true,
          rating: true,
          reviewsCount: true,
          priceCents: true,
          listPriceCents: true,
          lessonCount: true,
          thumbnailUrl: true,
          instructor: { select: { name: true } },
          category: { select: { name: true, slug: true, accentColor: true } },
          sections: {
            orderBy: { order: "asc" },
            select: {
              lessons: {
                orderBy: { order: "asc" },
                select: { id: true, title: true },
              },
            },
          },
        },
      },
    },
  })

  const courses: EnrolledCourse[] = rows.map((row) => {
    const lessons = row.course.sections.flatMap((section) => section.lessons)
    // "Continue" resumes at the stored lesson, else the first one not yet
    // ticked, else the first — the same fallback ladder `getLessonView` uses.
    const next =
      lessons.find((lesson) => lesson.id === row.currentLessonId) ??
      lessons[row.completedLessons] ??
      lessons[0]

    return {
      id: row.course.id,
      slug: row.course.slug,
      title: row.course.title,
      instructor: row.course.instructor.name,
      categoryName: row.course.category.name,
      categorySlug: row.course.category.slug,
      art:
        categoryGradients[row.course.category.accentColor] ??
        FALLBACK_CATEGORY_GRADIENT,
      thumbnailUrl: row.course.thumbnailUrl,
      level: row.course.level,
      durationHours: row.course.durationHours,
      rating: row.course.rating,
      reviews: row.course.reviewsCount,
      price: row.course.priceCents / 100,
      listPrice: (row.course.listPriceCents || row.course.priceCents) / 100,
      completedLessons: row.completedLessons,
      totalLessons: lessons.length || row.course.lessonCount,
      progress: row.progressPercent,
      nextLesson: next?.title ?? "Start the course",
      completed: row.completedAt !== null,
    }
  })

  const certificates = await db.certificate.count({
    where: { userId: session.user.id },
  })

  return {
    courses,
    stats: {
      inProgress: courses.filter((course) => !course.completed).length,
      completed: courses.filter((course) => course.completed).length,
      hours: Math.round(
        courses.reduce((sum, course) => sum + course.durationHours, 0)
      ),
      certificates,
    },
  }
}
