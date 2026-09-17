import { Card } from "@/components/ui/card"
import { CourseArt } from "@/components/dashboard/course-art"
import { formatMoney } from "@/components/dashboard/instructor/revenue/revenue-format"
import { revenueCopy } from "@/lib/config/instructor-revenue"
import type { CourseEarningRow } from "@/lib/instructor-revenue"

/**
 * "Earnings by course", from
 * `ui-design/light/dashboard/instructor/revenue-page.png` — where this
 * month's money came from.
 *
 * Measured off that export at DPR 2: a **26px**-inset card, a 20px/700 title
 * over a 14px muted lead, then rows on a **44px** pitch — a **66 x 30**
 * `rounded-md` thumbnail 14px from a 15px title, a **9px** `rounded-full`
 * track filling the middle, and the amount right-aligned at the card's edge.
 *
 * Three things about it are decisions rather than markup:
 *
 *  - **The bar is a share of the month's total, not of the leading course.**
 *    The export's top bar fills 34% of its track against $6,180 of an $18,240
 *    month, which is 33.9% — so it is drawn honestly, unlike its own chart
 *    above. Normalising to the leader would make every list's first row full
 *    whatever it earned, which tells you nothing about the split.
 *  - **The lead repeats the "This month" card's figure on purpose.** Both are
 *    the calendar month's `netCents`, read once in
 *    `lib/instructor-revenue.ts`, so the two cannot disagree — and seeing the
 *    total that the bars are shares *of* is what makes them readable.
 *  - **Row art is the per-category gradient + icon** (`lumen-course-card-art`)
 *    through the shared `CourseArt`, not the export's photographs, and a row
 *    is **not a link** — the export draws no affordance on one, the rule
 *    `help-topic-card.tsx` states.
 */
function EarningsByCourseCard({
  rows,
  totalCents,
}: {
  rows: CourseEarningRow[]
  totalCents: number
}) {
  return (
    <Card className="gap-0 p-6.5 ring-border [--card-spacing:0px]">
      {/* `font-bold` explicitly, for the reason `CLAUDE.md` gives. */}
      <h2 className="text-xl leading-none font-bold">
        {revenueCopy.byCourseHeading}
      </h2>
      <p className="mt-2.5 text-[14px] text-muted-foreground">
        {revenueCopy.byCourseLead(formatMoney(totalCents))}
      </p>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {revenueCopy.byCourseEmpty}
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3.5">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3.5">
              <CourseArt
                thumbnailUrl={row.thumbnailUrl}
                categorySlug={row.categorySlug}
                categoryAccent={row.categoryAccent}
                className="h-[30px] w-[66px] rounded-md"
                iconClassName="size-3.5"
              />
              {/* A fixed share of the row rather than `flex-1`, so the bars all
                  start on the same x whatever the titles are — which is what
                  the export draws and what makes them comparable at a glance.
                  It collapses below `lg`, where there is no room for a track. */}
              <span className="min-w-0 flex-1 truncate text-[15px] lg:w-[280px] lg:flex-none">
                {row.title}
              </span>
              <span className="hidden h-[9px] flex-1 overflow-hidden rounded-full bg-track lg:block">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${row.percent}%` }}
                />
              </span>
              <span className="w-24 shrink-0 text-right text-[15px] font-semibold tabular-nums">
                {formatMoney(row.cents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export { EarningsByCourseCard }
