import { cache } from "react"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { longAgo } from "@/lib/relative-time"
import { getInstructorProfile } from "@/lib/instructor"
import { hasBeenLive } from "@/lib/config/instructor-courses"
import type { ActivityKind } from "@/lib/config/instructor-course-manage"
import type { CourseStatus } from "@/lib/generated/prisma/client"

/**
 * The reads behind `/dashboard/instructor/courses/[slug]`, from
 * `ui-design/light/dashboard/instructor/manage-course.png` — where My Courses'
 * **Manage** goes.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy and the row vocabulary live in
 * `lib/config/instructor-course-manage.ts`.
 *
 * **Nothing on the page is demo data and it needed no migration.** Every
 * figure comes out of a table that already existed, and the three that have no
 * writer yet say so rather than drawing a zero. Six definitions decide what
 * the page means, and the export settles none of them:
 *
 *  - **The page is only for a course that has been live.** My Courses sends
 *    Manage here and Continue editing to the authoring flow, so a draft's
 *    destination is that wizard, not this page — and every block here assumes
 *    a course with students: the stats, the health bars, the activity feed.
 *    `notFound()` for anything else, the console's reasoning about not
 *    distinguishing "you may not see this" from "there is nothing here".
 *  - **Revenue is the instructor's own net**, excluding REVERSED rows, which
 *    is the same figure My Courses' row draws for this course. Two screens
 *    under one label must not show two numbers.
 *  - **Completion rate is `Enrollment.completedAt`**, the share of enrolled
 *    students who finished — the plain reading of the words, and the one the
 *    column exists for.
 *  - **Avg. watch time is the mean of `Enrollment.progressPercent`.** That is
 *    not a stand-in for watch time, it *is* watch time: the column's own
 *    docstring says it is "computed from watch seconds against lesson
 *    duration", which is why the export's own My Learning card shows 14 of 25
 *    lessons against 55%. Averaging the per-enrolment roll-up beats summing
 *    `LessonProgress` again and getting a second answer.
 *  - **Quiz pass rate is `QuizAttempt.passed` over submitted attempts**, and
 *    it is the one metric with no writer: there is no scoring flow yet (the
 *    quiz page is local state), so it reads null and the bar says "No data
 *    yet" rather than claiming a 0% pass rate, which would be a far worse lie
 *    than an absence. The whole row is dropped when the course has no quiz
 *    lessons at all.
 *  - **Recent activity is a merged feed of real rows**, not a stored log:
 *    enrolments in the last day, the newest reviews and questions, and the
 *    week's earnings. There is no activity table and inventing one would put a
 *    second copy of facts four other tables already hold — the reasoning
 *    `Discussion.replyCount` records from the other side.
 */

export type ManageFacts = {
  sections: number
  lessons: number
  quizzes: number
  students: number
  unansweredQuestions: number
  unrepliedReviews: number
  activeCoupons: number
}

export type ActivityItem = {
  id: string
  kind: ActivityKind
  text: string
  /** Already written, e.g. "Today" or "3 days ago" — see the module note. */
  when: string
}

export type ManageCoursePage = {
  id: string
  slug: string
  title: string
  status: CourseStatus
  categorySlug: string
  categoryAccent: string
  thumbnailUrl: string | null
  stats: {
    students: number
    /** Null until something has been rated — renders an em dash. */
    rating: number | null
    revenueCents: number
    lessons: number
  }
  facts: ManageFacts
  /** The course's quiz lessons, in curriculum order — what the Manage page's
   *  Quizzes row opens. See `manageRowHref`. */
  quizLessonIds: string[]
  health: {
    completion: number | null
    watchTime: number | null
    quizPass: number | null
  }
  activity: ActivityItem[]
}

/**
 * Wrapped in React `cache` because the route reads it **twice** — once in
 * `generateMetadata` to name the course in the tab title and once to render —
 * and unlike `fetch`, a Prisma call is not deduped for free. The call
 * `getAttentionFacts` already makes for the console's layout and page.
 */
export const getManageCoursePage = cache(async function getManageCoursePage(
  slug: string
): Promise<ManageCoursePage | null> {
  const session = await getSession()
  if (!session) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  // Scoped by `instructorId` in the `where`, never checked afterwards: a slug
  // from another instructor's catalog has to come back as nothing rather than
  // as a row this then decides to hide.
  const course = await db.course.findFirst({
    where: { slug, instructorId: profile.id },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      thumbnailUrl: true,
      lessonCount: true,
      enrollmentCount: true,
      rating: true,
      reviewsCount: true,
      category: { select: { slug: true, accentColor: true } },
    },
  })
  if (!course || !hasBeenLive(course.status)) return null

  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // **Wave one.** Everything the page needs is independent of everything else
  // it needs, so it goes in one round of hops rather than in series — the
  // arrangement `lib/messages.ts` records at length.
  const [
    sections,
    quizzes,
    enrolmentAgg,
    completed,
    quizAttempts,
    quizPassed,
    unansweredQuestions,
    unrepliedReviews,
    activeCoupons,
    earnings,
    newEnrolments,
    recentReviews,
    recentQuestions,
  ] = await Promise.all([
    db.courseSection.count({ where: { courseId: course.id } }),
    // Ids rather than a `count()`: the Manage page's Quizzes row opens the
    // quiz directly when there is exactly one, and `/edit/quiz/<lessonId>`
    // addresses a lesson. In curriculum order, so "the only quiz" and "the
    // first quiz" are the same row the editor would show. A course has a
    // handful at most, so this costs nothing over counting.
    db.courseLesson.findMany({
      where: { section: { courseId: course.id }, type: "QUIZ" },
      orderBy: [{ section: { order: "asc" } }, { order: "asc" }],
      select: { id: true },
    }),
    db.enrollment.aggregate({
      where: { courseId: course.id },
      _count: { _all: true },
      _avg: { progressPercent: true },
    }),
    db.enrollment.count({
      where: { courseId: course.id, completedAt: { not: null } },
    }),
    db.quizAttempt.count({
      where: {
        enrollment: { courseId: course.id },
        submittedAt: { not: null },
      },
    }),
    db.quizAttempt.count({
      where: {
        enrollment: { courseId: course.id },
        submittedAt: { not: null },
        passed: true,
      },
    }),
    db.courseQuestion.count({
      where: { courseId: course.id, answeredByInstructor: false },
    }),
    db.courseReview.count({
      where: {
        courseId: course.id,
        status: "VISIBLE",
        deletedAt: null,
        reply: null,
      },
    }),
    db.coupon.count({
      where: {
        courseId: course.id,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
    }),
    db.instructorEarning.aggregate({
      where: {
        instructorId: profile.id,
        courseId: course.id,
        status: { not: "REVERSED" },
      },
      _sum: { netCents: true },
    }),
    db.enrollment.count({
      where: { courseId: course.id, createdAt: { gte: dayAgo } },
    }),
    db.courseReview.findMany({
      where: { courseId: course.id, status: "VISIBLE", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        rating: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
    db.courseQuestion.findMany({
      where: { courseId: course.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        createdAt: true,
        author: { select: { name: true } },
        lesson: { select: { title: true, order: true } },
      },
    }),
  ])

  // The week's earnings, for the feed's money line. Separate from the
  // lifetime sum above because they answer different questions.
  const weekEarnings = await db.instructorEarning.aggregate({
    where: {
      instructorId: profile.id,
      courseId: course.id,
      status: { not: "REVERSED" },
      createdAt: { gte: weekAgo },
    },
    _sum: { netCents: true },
  })

  const enrolled = enrolmentAgg._count._all

  const activity: { at: Date; item: ActivityItem }[] = []

  if (newEnrolments > 0) {
    activity.push({
      at: now,
      item: {
        id: "enrolments",
        kind: "enrolment",
        text: `${newEnrolments} new ${newEnrolments === 1 ? "enrolment" : "enrolments"}`,
        when: "Today",
      },
    })
  }

  for (const review of recentReviews) {
    activity.push({
      at: review.createdAt,
      item: {
        id: `review-${review.id}`,
        kind: "review",
        text: `${firstNameLast(review.user.name)} left a ${review.rating}★ review`,
        when: longAgo(review.createdAt, now),
      },
    })
  }

  for (const question of recentQuestions) {
    // `CourseLesson.order` is 0-based, so the human label is `order + 1` —
    // the trap `seedCourseQuestions` already records.
    const where = question.lesson
      ? `lesson ${question.lesson.order + 1}`
      : "this course"
    activity.push({
      at: question.createdAt,
      item: {
        id: `question-${question.id}`,
        kind: "question",
        text: `${firstNameLast(question.author.name)} asked about ${where}`,
        when: longAgo(question.createdAt, now),
      },
    })
  }

  const weekCents = weekEarnings._sum.netCents ?? 0
  if (weekCents > 0) {
    activity.push({
      at: weekAgo,
      item: {
        id: "earnings",
        kind: "earning",
        text: `${formatMoneyWhole(weekCents)} earned this week`,
        when: "Last 7 days",
      },
    })
  }

  activity.sort((a, b) => b.at.getTime() - a.at.getTime())

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    status: course.status,
    categorySlug: course.category.slug,
    categoryAccent: course.category.accentColor,
    thumbnailUrl: course.thumbnailUrl,
    stats: {
      // The denormalised counter, not `enrolled`: it is what the catalog, the
      // sale page and My Courses' own row already draw for this course.
      students: course.enrollmentCount,
      rating: course.reviewsCount > 0 ? course.rating : null,
      revenueCents: earnings._sum.netCents ?? 0,
      lessons: course.lessonCount,
    },
    quizLessonIds: quizzes.map((lesson) => lesson.id),
    facts: {
      sections,
      lessons: course.lessonCount,
      quizzes: quizzes.length,
      students: course.enrollmentCount,
      unansweredQuestions,
      unrepliedReviews,
      activeCoupons,
    },
    health: {
      completion:
        enrolled === 0 ? null : Math.round((completed / enrolled) * 100),
      watchTime:
        enrolmentAgg._avg.progressPercent === null
          ? null
          : Math.round(enrolmentAgg._avg.progressPercent),
      // Null where the card says "No data yet"; the row is dropped entirely
      // when `facts.quizzes` is 0 — see `course-health-card.tsx`.
      quizPass:
        quizAttempts === 0
          ? null
          : Math.round((quizPassed / quizAttempts) * 100),
    },
    activity: activity.slice(0, 5).map((entry) => entry.item),
  }
})

/** "Nadia Rahman", untouched — a first name alone reads as a nickname in a
 *  feed an instructor skims, and the export writes both. */
function firstNameLast(name: string): string {
  return name.trim() || "A learner"
}

function formatMoneyWhole(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100))
}
