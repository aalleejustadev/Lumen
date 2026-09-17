import { Card } from "@/components/ui/card"
import {
  analyticsCopy,
  enrolmentSources,
} from "@/lib/config/instructor-analytics"
import type { SourceRow } from "@/lib/instructor-analytics"
import { cn } from "@/lib/utils"

/**
 * "Where enrolments come from", from
 * `ui-design/light/dashboard/instructor/analytics-page.png`.
 *
 * Measured off that export at DPR 2: a **24px**-inset card, an 18px/700 title,
 * then rows on a **47.5px** pitch — a 10px coloured dot 12px from a 15px
 * label, the percentage right-aligned at the card's edge, and a **7px**
 * `rounded-full` track 10px under them, filled to that same percentage. The
 * bar is a plain share of the full width; the drawn fills measure 42/24/19/15%
 * against figures of 42/24/19/15, so unlike the chart beside it this card's
 * geometry *is* honest and is reproduced exactly.
 *
 * It hugs its content rather than stretching to the chart's height: measured,
 * the export's two cards are 256px and 352.5px, so the row is `items-start`.
 *
 * **What the rows are is the one place this page departs from its export**, and
 * the reasoning lives on `enrolmentSources` in
 * `lib/config/instructor-analytics.ts`: the drawn channels are traffic
 * attribution that nothing in this app records, and `EnrollmentSource` is the
 * real answer to the question the heading asks.
 */
function EnrolmentSourcesCard({ rows }: { rows: SourceRow[] }) {
  return (
    <Card className="gap-0 p-6 ring-border [--card-spacing:0px]">
      {/* `font-bold` explicitly, for the reason `CLAUDE.md` gives. */}
      <h2 className="text-lg leading-none font-bold">
        {analyticsCopy.sourcesHeading}
      </h2>

      {rows.length === 0 ? (
        <p className="mt-5 text-[15px] text-muted-foreground">
          {analyticsCopy.sourcesEmpty}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-[18px]">
          {rows.map((row) => {
            const source = enrolmentSources.find(
              (entry) => entry.value === row.source
            )
            return (
              <li key={row.source}>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      source?.dot ?? "bg-muted-foreground"
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-[15px]">
                    {source?.label ?? row.source}
                  </span>
                  <span className="shrink-0 text-[15px] font-bold tabular-nums">
                    {row.percent}%
                  </span>
                </div>
                <span className="mt-2.5 block h-[7px] overflow-hidden rounded-full bg-track">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      source?.bar ?? "bg-muted-foreground"
                    )}
                    style={{ width: `${row.percent}%` }}
                  />
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export { EnrolmentSourcesCard }
