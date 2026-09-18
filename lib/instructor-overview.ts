import "server-only"

import { getSession } from "@/lib/auth"
import {
  categoryGradients,
  FALLBACK_CATEGORY_GRADIENT,
} from "@/lib/config/admin-overview"
import type {
  InstructorOverview,
  ProductionCourse,
  TopCourse,
} from "@/lib/config/instructor-overview"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"

/**
 * `/dashboard/instructor` — the workspace's Overview, from
 * `ui-design/light/dashboard/instructor/instructor-dashboard.png`.
 *
 * **Every figure is the signed-in instructor's own, and nothing is invented.**
 * The page was a placeholder until now for a stated reason: its seven cards
 * need enrolments, lesson-publication state, watch progress and per-instructor
 * revenue, and none of those had a writer. All four exist now — enrolment on
 * purchase, `LessonProgress` from the lesson player, `InstructorEarning` at
 * fulfilment — so the export can be built against real rows rather than
 * approximated.
 *
 * An account with no courses gets zeroes and empty states, which is what a new
 * instructor should see; there is no seed behind any of it.
 *
 * Two definitions are reused rather than re-derived, because two instructor
 * screens must not show two numbers under one label:
 *
 *  - **Completion rate** is `Enrollment.completedAt` over enrolments, the
 *    manage page's and the Students page's own definition.
 *  - **Avg. watch completion** is the mean of `Enrollment.progressPercent`,
 *    which that column's docstring says *is* watch time rather than a stand-in
 *    for it.
 *
 * One is new and needed a decision: **"Where students spend time" is counted
 * by `CourseLesson.type` over lessons students have actually completed** —
 * Video / Reading / Quizzes are exactly that enum, so the donut is a real
 * count rather than a mood. It is the same reading `lib/dashboard-overview.ts`
 * settled for the learner's own activity donut, so the two cannot disagree
 * about what "reading" means.
 */

const DAY = 24 * 60 * 60 * 1000
const MONTHS = 6

/**
 * The six month buckets the chart plots, newest last.
 *
 * Built from computed boundaries rather than from whatever rows exist, so a
 * month with no sales draws a zero instead of vanishing and leaving a short
 * axis — the trap `getRevenueByMonth` documents for the console's chart.
 *
 * **An account with no courses gets the same six, all zero**, which is what
 * stops the card's date range being computed from an empty array: it read
 * `revenue.length - 1` and produced a window that started *after* it ended
 * ("1 Oct – 18 Sep"). The empty *state* is still drawn, off `hasAny`.
 */
function emptyMonths(now: Date) {
  return Array.from({ length: MONTHS }, (_, index) => {
    const from = new Date(
      now.getFullYear(),
      now.getMonth() - (MONTHS - 1 - index),
      1
    )
    return { month: from.toLocaleString("en-US", { month: "short" }), cents: 0 }
  })
}

/** Courses that are not on sale — what the export calls "in production". */
const IN_PRODUCTION = ["DRAFT", "IN_REVIEW", "NEEDS_CHANGES"] as const

export async function getInstructorOverview(): Promise<InstructorOverview | null> {
  const session = await getSession()
  if (!session) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  const firstName = (profile.name ?? session.user.name).split(" ")[0] ?? "there"
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const courses = await db.course.findMany({
    where: { instructorId: profile.id },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      rating: true,
      enrollmentCount: true,
      thumbnailUrl: true,
      category: { select: { name: true, slug: true, accentColor: true } },
      sections: {
        select: { lessons: { select: { id: true, isPublished: true } } },
      },
    },
    orderBy: { enrollmentCount: "desc" },
  })

  const courseIds = courses.map((course) => course.id)

  // Nothing published and nothing drafted — a brand-new teaching account.
  if (courseIds.length === 0) {
    return {
      firstName,
      learnersThisMonth: 0,
      production: [],
      completion: {
        percent: 0,
        deltaPercent: 0,
        previousPercent: 0,
        enrolled: 0,
        completed: 0,
      },
      output: {
        watchPercent: 0,
        publishedLessonPercent: 0,
        completionPercent: 0,
        drafts: 0,
        published: 0,
      },
      spend: [],
      revenue: emptyMonths(now),
      revenueDeltaPercent: 0,
      topCourses: [],
    }
  }

  const [enrolments, learnersThisMonth, lessonTypes, earnings] =
    await Promise.all([
      db.enrollment.findMany({
        where: { courseId: { in: courseIds } },
        select: { completedAt: true, progressPercent: true, createdAt: true },
      }),
      db.enrollment.count({
        where: { courseId: { in: courseIds }, createdAt: { gte: monthStart } },
      }),
      // Only lessons a student has actually finished, which is what "spend
      // time" means — an unopened lesson is not time spent.
      db.lessonProgress.findMany({
        where: {
          NOT: { completedAt: null },
          lesson: { section: { courseId: { in: courseIds } } },
        },
        select: { lesson: { select: { type: true } } },
      }),
      db.instructorEarning.findMany({
        where: {
          instructorId: profile.id,
          status: { not: "REVERSED" },
          createdAt: { gte: new Date(now.getTime() - 400 * DAY) },
        },
        select: { netCents: true, createdAt: true },
      }),
    ])

  // --- completion ---------------------------------------------------------
  const enrolled = enrolments.length
  const completed = enrolments.filter((row) => row.completedAt !== null).length
  const percent = enrolled ? Math.round((completed / enrolled) * 100) : 0

  // The same rate as it stood 30 days ago, over the enrolments that existed
  // then — a running total compared with itself, the reading Platform
  // Overview's four cards settled. Comparing two periods' *activity* would
  // make a reputation look like a batch.
  const cutoff = new Date(now.getTime() - 30 * DAY)
  const older = enrolments.filter((row) => row.createdAt < cutoff)
  const previousPercent = older.length
    ? Math.round(
        (older.filter((row) => row.completedAt !== null).length /
          older.length) *
          100
      )
    : 0

  // --- output -------------------------------------------------------------
  const allLessons = courses.flatMap((course) =>
    course.sections.flatMap((section) => section.lessons)
  )
  const publishedLessons = allLessons.filter((lesson) => lesson.isPublished)
  const watchPercent = enrolled
    ? Math.round(
        enrolments.reduce((sum, row) => sum + row.progressPercent, 0) / enrolled
      )
    : 0

  // --- where students spend time ------------------------------------------
  const byType = { VIDEO: 0, ARTICLE: 0, QUIZ: 0 } as Record<string, number>
  for (const row of lessonTypes) {
    byType[row.lesson.type] = (byType[row.lesson.type] ?? 0) + 1
  }
  const spendTotal = lessonTypes.length
  const spend = spendTotal
    ? [
        {
          label: "Video",
          value: +((byType.VIDEO / spendTotal) * 100).toFixed(1),
          color: "var(--chart-1)" as const,
        },
        {
          label: "Reading",
          value: +((byType.ARTICLE / spendTotal) * 100).toFixed(1),
          color: "var(--chart-2)" as const,
        },
        {
          label: "Quizzes",
          value: +((byType.QUIZ / spendTotal) * 100).toFixed(1),
          color: "var(--chart-3)" as const,
        },
      ]
    : []

  // --- revenue by month ---------------------------------------------------
  // The last six **complete** months plus the current one, built from computed
  // boundaries and filled from the rows, so a month with no sales draws a zero
  // rather than vanishing and leaving a short axis — the trap
  // `getRevenueByMonth` documents for the console's own chart.
  const revenue = Array.from({ length: MONTHS }, (_, index) => {
    const from = new Date(
      now.getFullYear(),
      now.getMonth() - (MONTHS - 1 - index),
      1
    )
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1)
    const cents = earnings
      .filter((row) => row.createdAt >= from && row.createdAt < to)
      .reduce((sum, row) => sum + row.netCents, 0)
    return {
      month: from.toLocaleString("en-US", { month: "short" }),
      cents,
    }
  })
  const last = revenue.at(-1)?.cents ?? 0
  const prior = revenue.at(-2)?.cents ?? 0
  const revenueDeltaPercent = prior
    ? Math.round(((last - prior) / prior) * 1000) / 10
    : 0

  const production: ProductionCourse[] = courses
    .filter((course) =>
      (IN_PRODUCTION as readonly string[]).includes(course.status)
    )
    .map((course) => {
      const lessons = course.sections.flatMap((section) => section.lessons)
      return {
        slug: course.slug,
        title: course.title,
        published: lessons.filter((lesson) => lesson.isPublished).length,
        total: lessons.length,
      }
    })

  const topCourses: TopCourse[] = courses
    .filter((course) => course.status === "PUBLISHED")
    .map((course) => ({
      slug: course.slug,
      title: course.title,
      categoryName: course.category.name,
      categorySlug: course.category.slug,
      art:
        categoryGradients[course.category.accentColor] ??
        FALLBACK_CATEGORY_GRADIENT,
      thumbnailUrl: course.thumbnailUrl,
      rating: course.rating,
      students: course.enrollmentCount,
    }))

  return {
    firstName,
    learnersThisMonth,
    production,
    completion: {
      percent,
      deltaPercent: percent - previousPercent,
      previousPercent,
      enrolled,
      completed,
    },
    output: {
      watchPercent,
      publishedLessonPercent: allLessons.length
        ? Math.round((publishedLessons.length / allLessons.length) * 100)
        : 0,
      completionPercent: percent,
      drafts: courses.filter((course) => course.status !== "PUBLISHED").length,
      published: courses.filter((course) => course.status === "PUBLISHED")
        .length,
    },
    spend,
    revenue,
    revenueDeltaPercent,
    topCourses,
  }
}
