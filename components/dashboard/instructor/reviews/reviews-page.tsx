import { RatingByCourseCard } from "@/components/dashboard/instructor/reviews/rating-by-course-card"
import { RatingSummaryCard } from "@/components/dashboard/instructor/reviews/rating-summary-card"
import { ReviewsBoard } from "@/components/dashboard/instructor/reviews/reviews-board"
import { reviewsCopy } from "@/lib/config/instructor-reviews"
import type { ReviewsPage as ReviewsPageData } from "@/lib/instructor-reviews"

/**
 * `/dashboard/instructor/reviews`, from
 * `ui-design/light/dashboard/instructor/reviews-page.png`.
 *
 * A **Server Component**, and more of one than its neighbours: only the filter
 * row down needs the client, so the header and both summary cards — a `52px`
 * figure, five bars, five course rows and their gradient art — are evaluated
 * here and never reach the bundle. `students-page.tsx` has to hand its stat
 * row to the board as `children` because the export puts controls in the
 * heading row; this export does not, so the split falls in the ordinary place.
 *
 * Measured off that export at DPR 2: the instructor shell's usual page inset
 * over a full-width column, a header block **pixel-identical** to
 * `students-page.png`'s and `coupons-page__main.png`'s — the h1 cap and the
 * lead ink land on the same rows in all three — so it is that header, reused
 * rather than re-measured. Then a **two-up grid of equal 738px cards on a 16px
 * gap**, which is what makes the shorter left card stretch to the taller
 * right one and centre its own content, exactly as drawn.
 */
function ReviewsPage({ page }: { page: ReviewsPageData }) {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="min-w-0">
        {/* `font-bold` explicitly: `globals.css` sets every `h1` to 800 and
            the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
        <h1 className="text-[32px] leading-none font-bold">
          {reviewsCopy.title}
        </h1>
        <p className="mt-2.5 text-[15px] text-muted-foreground">
          {reviewsCopy.description}
        </p>
      </div>

      <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-2">
        <RatingSummaryCard summary={page.summary} />
        <RatingByCourseCard rows={page.byCourse} />
      </div>

      <ReviewsBoard page={page} />
    </main>
  )
}

export { ReviewsPage }
