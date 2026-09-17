import { StarIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Stars } from "@/components/dashboard/instructor/reviews/stars"
import { reviewsCopy } from "@/lib/config/instructor-reviews"
import type { ReviewsSummary } from "@/lib/instructor-reviews"

/**
 * The left half of the two-up row on `reviews-page.png`: the headline rating
 * with its stars and quarter-on-quarter delta, beside the five-bar star
 * breakdown.
 *
 * Measured off that export at DPR 2: a 738px card on **24px** padding whose
 * content is **vertically centred** — it is the shorter of the pair, so the
 * grid stretches it to the "Rating by course" card's height and the export
 * leaves 116px of air above and below rather than pinning the content to the
 * top. A 108px-wide centred left column (a **52px/800** figure over 14px stars
 * on a 5px gap over the 14px delta line), a 24px gutter, then a 15px lead over
 * five rows on a **22px** pitch: a 13px digit, a 12px star, a **7px**
 * `rounded-full` track and the count right-aligned at the card's edge.
 *
 * Three things about it are decisions rather than markup:
 *
 *  - **The track is `rounded-full`, so a star nobody gave draws nothing and a
 *    1% star still draws a dot.** That is exactly what the export's own 33
 *    one-star reviews look like against 2,364 five-star ones, and it is the
 *    reason the bar is not clamped to a minimum width: the shape does the job
 *    without lying about the number.
 *  - **The delta line is dropped, not drawn as "+0.0"**, when there is no
 *    quarter to compare with — the "an empty queue is dropped rather than
 *    drawn as a zero" rule. It is `--success` when it rises and
 *    `--destructive` when it falls; the export only draws the first.
 *  - **A drop is not red-alarmed with an icon.** The export draws the figure
 *    alone, and a rating easing from 4.9 to 4.7 is information rather than an
 *    incident.
 *
 * What each figure *means* is decided in `lib/instructor-reviews.ts`; this is
 * only how it is drawn.
 */
function RatingSummaryCard({ summary }: { summary: ReviewsSummary }) {
  return (
    <Card className="justify-center p-6 ring-border [--card-spacing:0px]">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex w-27 shrink-0 flex-col items-center">
          {/* `.stat-figure` is the app's own 800-weight tabular treatment;
              52px is the export's, measured off the digit cap. */}
          <p className="stat-figure text-[52px]">
            {summary.rating === null ? "—" : summary.rating.toFixed(1)}
          </p>
          <div className="mt-3">
            <Stars
              rating={summary.rating ?? 0}
              className="size-3.5"
              gapClassName="gap-[5px]"
            />
          </div>
          {summary.trend === null ? null : (
            <p
              className={
                summary.trend < 0
                  ? "mt-2.5 text-[14px] font-semibold text-destructive"
                  : "mt-2.5 text-[14px] font-semibold text-success"
              }
            >
              {reviewsCopy.trend(summary.trend)}
            </p>
          )}
        </div>

        <div className="min-w-70 flex-1">
          <p className="text-[15px] text-muted-foreground">
            {reviewsCopy.summary(summary.total, summary.courses)}
          </p>

          <div className="mt-3.5 flex flex-col gap-[7px]">
            {summary.breakdown.map((row) => (
              <div
                key={row.stars}
                className="flex items-center gap-3 text-[13px] leading-[15px] text-muted-foreground"
              >
                <span className="w-2 shrink-0 text-right tabular-nums">
                  {row.stars}
                </span>
                <StarIcon className="size-3 shrink-0 fill-star text-star" />
                <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-track">
                  <span
                    className="block h-full rounded-full bg-star"
                    style={{ width: `${row.percent}%` }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right tabular-nums">
                  {row.count.toLocaleString("en-US")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

export { RatingSummaryCard }
