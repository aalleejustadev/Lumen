import { db } from "@/lib/db"
import { REPORTED_REVIEWS_PAGE_SIZE } from "@/lib/config/admin-reviews"
import type { ReportReason, UserStatus } from "@/lib/generated/prisma/client"

/**
 * The read behind `/dashboard/admin/reviews`, from
 * `ui-design/light/dashboard/admin/reported-reviews__admin.png`.
 *
 * Pulls in `lib/db`, so the same "never import this from a Client Component"
 * rule as the rest of `lib/admin/` applies — and, as on the Users and Courses
 * pages, the page size and the pill vocabulary live in
 * `lib/config/admin-reviews.ts` so the list can import them without dragging
 * the Postgres driver into the browser bundle.
 *
 * **Nothing on the page is demo data.** `CourseReview` and `ContentReport`
 * already exist, docstrings and all — `ContentReport`'s own note names this
 * screen ("resolved by admins on Reported reviews") and `ReviewStatus`'s names
 * its three buttons ("keep it, hide it while the author appeals, or remove
 * it") — and the seed already writes the three open reports the export draws.
 *
 * **The queue is exactly what the sidebar badge counts**: open reports whose
 * target is a review. `getAttentionFacts` counts that same pair, so the badge
 * and the page can never disagree about how much work is waiting.
 */

export type ReportedReviewRow = {
  /** The **report** id, not the review's — a decision resolves the report. */
  id: string
  reason: ReportReason
  reportedAt: Date
  reviewId: string
  /** The review body, which is the thing under judgement. See the card. */
  body: string
  courseTitle: string
  authorId: string
  authorName: string
  authorEmail: string
  authorImage: string | null
  /** Whether "Suspend reviewer" still has anything to do. */
  authorStatus: UserStatus
}

export type ReportedReviewsPage = {
  rows: ReportedReviewRow[]
  total: number
  page: number
  pageCount: number
  /**
   * When this view was read. Every card says how long ago it was reported, so
   * one clock for the page is what stops two cards a millisecond apart being
   * measured from different instants — and reading it here rather than in a
   * component keeps the render pure (`Date.now()` in a component body is a
   * `react-hooks/purity` error).
   */
  generatedAt: Date
}

export type ReviewsQuery = { page: number }

/**
 * Turns whatever arrived in the URL into a query this module will act on.
 * Exported because the page and the pagination links have to agree on it, and
 * because a hand-edited query string has to resolve to something sane rather
 * than reaching Prisma.
 */
export function parseReviewsQuery(params: {
  page?: string | string[]
}): ReviewsQuery {
  const raw = Array.isArray(params.page) ? params.page[0] : params.page
  const page = Number(raw)
  return { page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1 }
}

/**
 * One page of the queue.
 *
 * **Ordered newest first**, which is what the export draws — 4 hours, 1 day,
 * 2 days, top to bottom. A backlog-first ordering would be the other defensible
 * reading of a queue, and it is not the one drawn.
 *
 * It takes **two** queries rather than a join because `ContentReport` is
 * polymorphic: `targetId` is a plain string pointing at whichever table
 * `targetType` names, so there is no relation for Prisma to include. The
 * reports are paged in the database and only that page's reviews are read.
 *
 * A report whose review no longer exists is dropped from the rendered list.
 * That only happens if the author's account or the whole course was deleted
 * out from under an open report — `CourseReview` cascades from both — because
 * every decision this page offers resolves the report rather than deleting the
 * row (Remove is the soft delete `CourseReview.deletedAt` exists for).
 */
export async function getReportedReviewsPage(
  query: ReviewsQuery
): Promise<ReportedReviewsPage> {
  const where = { status: "OPEN", targetType: "REVIEW" } as const

  const total = await db.contentReport.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / REPORTED_REVIEWS_PAGE_SIZE))
  const page = Math.min(query.page, pageCount)

  const reports = await db.contentReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * REPORTED_REVIEWS_PAGE_SIZE,
    take: REPORTED_REVIEWS_PAGE_SIZE,
    select: { id: true, targetId: true, reason: true, createdAt: true },
  })

  const reviews = await db.courseReview.findMany({
    where: { id: { in: reports.map((report) => report.targetId) } },
    select: {
      id: true,
      body: true,
      course: { select: { title: true } },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          status: true,
        },
      },
    },
  })

  const byId = new Map(reviews.map((review) => [review.id, review]))

  const rows = reports.flatMap<ReportedReviewRow>((report) => {
    const review = byId.get(report.targetId)
    if (!review) return []
    return [
      {
        id: report.id,
        reason: report.reason,
        reportedAt: report.createdAt,
        reviewId: review.id,
        body: review.body,
        courseTitle: review.course.title,
        authorId: review.user.id,
        authorName: review.user.name,
        authorEmail: review.user.email,
        authorImage: review.user.image,
        authorStatus: review.user.status,
      },
    ]
  })

  return { rows, total, page, pageCount, generatedAt: new Date() }
}
