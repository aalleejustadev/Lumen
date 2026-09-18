import "server-only"

import { getSession } from "@/lib/auth"
import {
  categoryGradients,
  FALLBACK_CATEGORY_GRADIENT,
} from "@/lib/config/admin-overview"
import type {
  ActivitySlice,
  ContinueLearningCourse,
  LearningPath,
  OverviewData,
} from "@/lib/config/dashboard-overview-shape"
import { db } from "@/lib/db"

/**
 * The student Overview page's bento grid, computed from the learner's own
 * rows.
 *
 * **This replaces the demo figures in `lib/config/dashboard-overview.ts`.**
 * Every card on that page was a constant — 72% overall, 14 courses enrolled,
 * a hand-drawn twelve-week curve — so the first thing a real learner saw
 * after signing up was somebody else's progress. All of it now comes from
 * `Enrollment` and `LessonProgress`, and an account with neither gets zeroes
 * and empty states, which is the honest answer.
 *
 * Two cards needed a definition rather than a lookup:
 *
 *  - **Activity breakdown is by lesson *type*** — video, article, quiz — over
 *    the lessons this learner has completed. The export labels the slices
 *    Watching / Reading / Quizzes, which is exactly `CourseLesson.type`, so
 *    the donut is a real count rather than a mood.
 *  - **The progress curve is lessons completed per week** over the last
 *    twelve, from `LessonProgress.completedAt`. The old constant was "a
 *    percentage-style score, not tied to a real metric" by its own admission.
 */

const WEEK = 7 * 24 * 60 * 60 * 1000
const WEEKS = 12

export type { OverviewData }

export async function getDashboardOverview(): Promise<OverviewData> {
  const empty: OverviewData = {
    learningPaths: [],
    overall: {
      percent: 0,
      deltaPercent: 0,
      coursesEnrolled: 0,
      coursesCompleted: 0,
    },
    activity: [],
    weekly: [],
    continueLearning: [],
  }

  const session = await getSession()
  if (!session) return empty

  const userId = session.user.id
  const enrolments = await db.enrollment.findMany({
    where: { userId },
    orderBy: [{ lastAccessedAt: "desc" }, { createdAt: "desc" }],
    select: {
      progressPercent: true,
      completedAt: true,
      course: {
        select: {
          slug: true,
          title: true,
          rating: true,
          category: { select: { name: true, slug: true, accentColor: true } },
        },
      },
    },
  })

  if (enrolments.length === 0) return empty

  const completed = enrolments.filter((row) => row.completedAt !== null).length
  const percent = Math.round(
    enrolments.reduce((sum, row) => sum + row.progressPercent, 0) /
      enrolments.length
  )

  // --- activity, by lesson type -------------------------------------------
  const done = await db.lessonProgress.findMany({
    where: { enrollment: { userId }, NOT: { completedAt: null } },
    select: { completedAt: true, lesson: { select: { type: true } } },
  })

  const byType = { VIDEO: 0, ARTICLE: 0, QUIZ: 0 } as Record<string, number>
  for (const row of done) {
    byType[row.lesson.type] = (byType[row.lesson.type] ?? 0) + 1
  }
  const totalDone = done.length
  const activity: ActivitySlice[] = totalDone
    ? [
        {
          label: "Watching",
          value: +((byType.VIDEO / totalDone) * 100).toFixed(1),
          color: "var(--chart-1)",
        },
        {
          label: "Reading",
          value: +((byType.ARTICLE / totalDone) * 100).toFixed(1),
          color: "var(--chart-2)",
        },
        {
          label: "Quizzes",
          value: +((byType.QUIZ / totalDone) * 100).toFixed(1),
          color: "var(--chart-3)",
        },
      ]
    : []

  // --- the twelve-week curve ----------------------------------------------
  const now = Date.now()
  const weekly = Array.from({ length: WEEKS }, (_, index) => {
    const from = now - (WEEKS - index) * WEEK
    const to = from + WEEK
    const value = done.filter((row) => {
      const at = row.completedAt!.getTime()
      return at >= from && at < to
    }).length
    return { week: `W${index + 1}`, value }
  })

  // --- a "path" per category the learner is studying ----------------------
  // The export draws two named tracks; there is no `LearningPath` model and
  // inventing one would be a second taxonomy, so a path is a category the
  // learner already has courses in — real, and the same grouping the donut
  // and the catalog use.
  const byCategory = new Map<string, { done: number; total: number }>()
  for (const row of enrolments) {
    const key = row.course.category.name
    const entry = byCategory.get(key) ?? { done: 0, total: 0 }
    entry.total += 1
    if (row.completedAt) entry.done += 1
    byCategory.set(key, entry)
  }
  const learningPaths: LearningPath[] = [...byCategory.entries()]
    .slice(0, 2)
    .map(([title, counts]) => ({
      title,
      completed: counts.done,
      total: counts.total,
      tone: counts.done >= counts.total ? "success" : "warning",
    }))

  const continueLearning: ContinueLearningCourse[] = enrolments
    .filter((row) => row.completedAt === null)
    .slice(0, 4)
    .map((row) => ({
      slug: row.course.slug,
      title: row.course.title,
      category: row.course.category.name,
      categorySlug: row.course.category.slug,
      score: row.course.rating,
      progress: row.progressPercent,
      art:
        categoryGradients[row.course.category.accentColor] ??
        FALLBACK_CATEGORY_GRADIENT,
    }))

  return {
    learningPaths,
    overall: {
      percent,
      // No history is stored for this, so there is nothing honest to compare
      // against — drawn as flat rather than invented.
      deltaPercent: 0,
      coursesEnrolled: enrolments.length,
      coursesCompleted: completed,
    },
    activity,
    weekly,
    continueLearning,
  }
}
