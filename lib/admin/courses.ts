import { cache } from "react"

import { db } from "@/lib/db"
import { COURSES_PAGE_SIZE } from "@/lib/config/admin-courses"
import type { CourseStatus, Prisma } from "@/lib/generated/prisma/client"

/**
 * Reads for `/dashboard/admin/courses` and `/dashboard/admin/courses/[slug]`,
 * from `ui-design/light/dashboard/admin/courses-page__admin.png` and
 * `course-view-page__admin.png`.
 *
 * Pulls in `lib/db`, so the same "never import this from a Client Component"
 * rule as the rest of `lib/admin/` applies — and, as on the Users page, the
 * page size and the client-safe helpers live in `lib/config/admin-courses.ts`
 * so the list component can import them without dragging the Postgres driver
 * into the browser bundle.
 *
 * **Nothing on either page is demo data.** `Course`, `CourseSubmission` and
 * `CourseSubmissionCheck` already exist and the seed already writes the review
 * queue; these are the queries the exports were drawn against.
 */

/** The five segments in the filter row, in the order they are drawn. */
export type CoursesTab =
  "all" | "in-review" | "needs-changes" | "published" | "rejected"

export type CoursesQuery = {
  tab: CoursesTab
  page: number
}

export type CourseRow = {
  id: string
  slug: string
  title: string
  status: CourseStatus
  instructorName: string
  lessonCount: number
  submittedAt: Date | null
  /** Instructor-uploaded art, once that feature exists; null draws the tile. */
  thumbnailUrl: string | null
  /** Both halves of the placeholder tile — see `lumen-course-card-art`. */
  categorySlug: string
  categoryAccent: string
}

export type CoursesPage = {
  rows: CourseRow[]
  total: number
  page: number
  pageCount: number
  counts: Record<CoursesTab, number>
  /**
   * When this view was read. Every row says how long ago it was submitted, so
   * one clock for the page is what stops two rows a millisecond apart being
   * measured from different instants — and reading it here rather than in a
   * component keeps the render pure (`Date.now()` in a component body is a
   * `react-hooks/purity` error).
   */
  generatedAt: Date
}

/** One row of the **Submission checklist** on the course view. */
export type SubmissionCheck = {
  key: string
  label: string
  passed: boolean
  /** False for "audio is clear", the one verdict a human makes. */
  automated: boolean
}

/** One row of the **Curriculum preview**. */
export type CurriculumRow = {
  id: string
  title: string
  type: "VIDEO" | "ARTICLE" | "QUIZ" | "PRACTICE"
  /**
   * A lesson carries one of these two, never both — `CourseLesson`'s own note
   * — which is what decides whether the row reads "14 min" or "5 questions".
   */
  durationMinutes: number | null
  questionsCount: number | null
}

export type CourseReview = {
  id: string
  slug: string
  title: string
  subtitle: string
  status: CourseStatus
  instructorName: string
  lessonCount: number
  submittedAt: Date | null
  thumbnailUrl: string | null
  categorySlug: string
  categoryAccent: string
  checks: SubmissionCheck[]
  curriculum: CurriculumRow[]
  /** The note and reasons from the last time it was sent back, if it was. */
  lastDecision: {
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED"
    noteToInstructor: string | null
    changeReasons: string[]
    reviewedAt: Date | null
  } | null
  generatedAt: Date
}

const COURSES_TABS: CoursesTab[] = [
  "all",
  "in-review",
  "needs-changes",
  "published",
  "rejected",
]

/**
 * Turns whatever arrived in the URL into a query this module will act on.
 * Exported because the page, the filter row and the pagination links all have
 * to agree on it, and because a hand-edited query string has to resolve to
 * something sane rather than reaching Prisma.
 */
export function parseCoursesQuery(params: {
  tab?: string | string[]
  page?: string | string[]
}): CoursesQuery {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const tab = first(params.tab)
  const page = Number(first(params.page))

  return {
    tab: COURSES_TABS.includes(tab as CoursesTab) ? (tab as CoursesTab) : "all",
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  }
}

const TAB_STATUS: Record<Exclude<CoursesTab, "all">, CourseStatus> = {
  "in-review": "IN_REVIEW",
  "needs-changes": "NEEDS_CHANGES",
  published: "PUBLISHED",
  rejected: "REJECTED",
}

/**
 * **DRAFT courses are excluded**, and that is the one editorial decision in
 * this query. A draft has not been submitted to anybody: it is an instructor's
 * unfinished work, and the page's own lead — "approve submissions, request
 * changes, and manage the live catalog" — describes neither. ARCHIVED is left
 * in, because an archived course was live once and is part of the catalog's
 * history.
 */
function coursesWhere(tab: CoursesTab): Prisma.CourseWhereInput {
  if (tab === "all") return { status: { not: "DRAFT" } }
  return { status: TAB_STATUS[tab] }
}

const ROW_SELECT = {
  id: true,
  slug: true,
  title: true,
  status: true,
  lessonCount: true,
  submittedAt: true,
  thumbnailUrl: true,
  instructor: { select: { name: true } },
  category: { select: { slug: true, accentColor: true } },
} satisfies Prisma.CourseSelect

function toRow(row: {
  instructor: { name: string }
  category: { slug: string; accentColor: string }
  [key: string]: unknown
}): CourseRow {
  const { instructor, category, ...rest } = row
  return {
    ...(rest as Omit<
      CourseRow,
      "instructorName" | "categorySlug" | "categoryAccent"
    >),
    instructorName: instructor.name,
    categorySlug: category.slug,
    categoryAccent: category.accentColor,
  }
}

export const getCoursesPage = cache(async function getCoursesPage(
  input: CoursesQuery
): Promise<CoursesPage> {
  const where = coursesWhere(input.tab)

  const [total, grouped, rows] = await Promise.all([
    db.course.count({ where }),
    // Tab counts, from one grouped query rather than five counts. Unlike the
    // Users page there is no search to respect, so each tab's number is simply
    // how many courses hold that status.
    db.course.groupBy({
      by: ["status"],
      where: { status: { not: "DRAFT" } },
      _count: { _all: true },
    }),
    db.course.findMany({
      where,
      // Most recently submitted first, which is exactly the order the export
      // draws (yesterday, 2 days, 3 days, 1 week, 3 weeks, 1 month) across a
      // mix of statuses. `nulls: "last"` because an ARCHIVED course that
      // predates submissions has nothing to sort on and belongs at the bottom
      // rather than — as Postgres would default for DESC — at the very top.
      orderBy: { submittedAt: { sort: "desc", nulls: "last" } },
      skip: (input.page - 1) * COURSES_PAGE_SIZE,
      take: COURSES_PAGE_SIZE,
      select: ROW_SELECT,
    }),
  ])

  const byStatus = new Map(
    grouped.map((entry) => [entry.status, entry._count._all])
  )

  return {
    rows: rows.map(toRow),
    total,
    page: input.page,
    pageCount: Math.max(1, Math.ceil(total / COURSES_PAGE_SIZE)),
    counts: {
      all: grouped.reduce((sum, entry) => sum + entry._count._all, 0),
      "in-review": byStatus.get("IN_REVIEW") ?? 0,
      "needs-changes": byStatus.get("NEEDS_CHANGES") ?? 0,
      published: byStatus.get("PUBLISHED") ?? 0,
      rejected: byStatus.get("REJECTED") ?? 0,
    },
    generatedAt: new Date(),
  }
})

/** How many lessons the **Curriculum preview** shows before it stops. */
const CURRICULUM_PREVIEW_LIMIT = 5

/**
 * The course view page: everything `course-view-page__admin.png` draws.
 *
 * The checklist comes from the **latest submission**, not from the course:
 * `CourseSubmission` is one trip through review and its checks are the verdict
 * recorded for that trip, which is the whole reason they are stored rather
 * than recomputed (the audio row is a human judgement — see the model's note).
 * A course that has never been submitted has no checklist, and the page says
 * so rather than inventing four passes.
 *
 * The curriculum preview is the first few lessons in order across sections,
 * which is what the export draws — five rows with no section headings.
 */
export const getCourseReview = cache(async function getCourseReview(
  slug: string
): Promise<CourseReview | null> {
  const course = await db.course.findUnique({
    where: { slug },
    select: {
      ...ROW_SELECT,
      subtitle: true,
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: {
          decision: true,
          reviewedAt: true,
          changeReasons: true,
          noteToInstructor: true,
          checks: {
            select: {
              key: true,
              label: true,
              passed: true,
              automated: true,
            },
          },
        },
      },
      sections: {
        orderBy: { order: "asc" },
        select: {
          order: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              durationMinutes: true,
              questionsCount: true,
            },
          },
        },
      },
    },
  })

  if (!course || course.status === "DRAFT") return null

  const { submissions, sections, subtitle, ...rest } = course
  const submission = submissions[0] ?? null

  const curriculum: CurriculumRow[] = sections
    .flatMap((section) => section.lessons)
    .slice(0, CURRICULUM_PREVIEW_LIMIT)
    .map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      durationMinutes: lesson.durationMinutes,
      questionsCount: lesson.questionsCount,
    }))

  return {
    ...toRow(rest),
    subtitle,
    curriculum,
    // Ordered by the model's own `key` order rather than however Postgres
    // returned them, so the four rows don't shuffle between renders.
    checks: (submission?.checks ?? []).slice().sort((a, b) => {
      const order = CHECK_ORDER.indexOf(a.key) - CHECK_ORDER.indexOf(b.key)
      return order !== 0 ? order : a.key.localeCompare(b.key)
    }),
    lastDecision: submission?.decision
      ? {
          decision: submission.decision,
          noteToInstructor: submission.noteToInstructor,
          changeReasons: submission.changeReasons,
          reviewedAt: submission.reviewedAt,
        }
      : null,
    generatedAt: new Date(),
  }
})

/**
 * The order the export draws the checklist in: the three computable rows, then
 * the human verdict. An unknown key sorts to the end rather than being
 * dropped, so a check added later still shows up.
 */
const CHECK_ORDER = [
  "min_lessons_and_video",
  "audio_quality",
  "cover_resolution",
  "closes_with_quiz",
]
