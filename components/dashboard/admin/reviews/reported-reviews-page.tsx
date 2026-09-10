import { ReportedReviewsList } from "@/components/dashboard/admin/reviews/reported-reviews-list"
import type { ReportedReviewCardRow } from "@/components/dashboard/admin/reviews/reported-review-card"
import {
  formatReportedAt,
  formatReportedExact,
} from "@/components/dashboard/admin/reviews/reviews-format"
import { adminReviewsCopy } from "@/lib/config/admin-reviews"
import { getReportedReviewsPage, type ReviewsQuery } from "@/lib/admin/reviews"

/**
 * `/dashboard/admin/reviews`, from
 * `ui-design/light/dashboard/admin/reported-reviews__admin.png`: the title
 * with its lead, and one card per open report.
 *
 * Measured off that export at DPR 2 and matched, pixel for pixel, to its
 * siblings — the h1 cap and the lead ink land on exactly the same rows here as
 * in `courses-page__admin.png`, so the header is that page's, not a second
 * measurement. The title takes an explicit `font-bold` for the reason
 * `CLAUDE.md` gives: `globals.css` sets every `h1` to 800 and the dashboard
 * exports draw 700.
 *
 * The role guard lives in `app/(admin)/layout.tsx`, which covers every route
 * in the group.
 *
 * **"4 hours ago" is written here, on the server**, and crosses as a string,
 * for the two reasons `reviews-format.ts` records. Every card is measured
 * against the single `ReportedReviewsPage.generatedAt` clock the read returns.
 */
async function ReportedReviewsPage({ query }: { query: ReviewsQuery }) {
  const page = await getReportedReviewsPage(query)

  const rows: ReportedReviewCardRow[] = page.rows.map((row) => ({
    id: row.id,
    reason: row.reason,
    reportedLabel: formatReportedAt(row.reportedAt, page.generatedAt),
    reportedTitle: formatReportedExact(row.reportedAt),
    body: row.body,
    courseTitle: row.courseTitle,
    authorName: row.authorName,
    authorEmail: row.authorEmail,
    authorImage: row.authorImage,
    authorSuspended: row.authorStatus === "SUSPENDED",
  }))

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <h1 className="text-[32px] leading-none font-bold">
        {adminReviewsCopy.title}
      </h1>
      <p className="mt-2.5 text-[15px] text-muted-foreground">
        {adminReviewsCopy.description}
      </p>

      <ReportedReviewsList
        rows={rows}
        page={page.page}
        pageCount={page.pageCount}
        total={page.total}
      />
    </main>
  )
}

export { ReportedReviewsPage }
