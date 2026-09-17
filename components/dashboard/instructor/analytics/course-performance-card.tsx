import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CourseArt } from "@/components/dashboard/course-art"
import { formatStatValue } from "@/components/dashboard/stat-format"
import { analyticsCopy } from "@/lib/config/instructor-analytics"
import type { CoursePerformanceRow } from "@/lib/instructor-analytics"

const counts = new Intl.NumberFormat("en-US")

/**
 * "Course performance", from
 * `ui-design/light/dashboard/instructor/analytics-page.png` — the instructor's
 * courses ranked by the enrolments they took in the selected period.
 *
 * Measured off that export at DPR 2: a card on **28px** horizontal / 24px
 * vertical padding, a 20px/700 title over a 14px muted lead, a 14px muted
 * header row closed by a `--border` hairline, then **55px** rows divided by
 * `--border-subtle` — a **40 x 28** `rounded-md` thumbnail 12px from a 15px
 * title, with the three figures at 43%, 61% and 81% of the content width.
 *
 * Four things about it are decisions rather than markup:
 *
 *  - **Row art is the per-category gradient + icon**, not the export's
 *    photographs — `lumen-course-card-art`, through the shared `CourseArt` so
 *    a course cannot wear two tiles on two screens. `Course.thumbnailUrl` is
 *    honoured when the instructor has uploaded a cover.
 *  - **A row is not a link.** The export draws no chevron or other affordance,
 *    so it renders as the flat informational row it is — the rule
 *    `help-topic-card.tsx` states and the Reviews page's by-course card keeps.
 *  - **The last row keeps its hairline.** `TableBody` carries
 *    `[&_tr:last-child]:border-0`, which the export contradicts — it draws a
 *    divider under the final row — so the border is put back on the `Table`
 *    itself rather than by re-declaring the arbitrary variant, which would
 *    only win on Tailwind's emission order. The trick `settings-billing.tsx`
 *    records, read the other way round.
 *  - **Completion and Watch time are the course's all-time health**, the
 *    identical definitions the manage page's Course health card draws, so one
 *    course cannot report two completion rates on two instructor screens. Only
 *    **Enrolments** is the period figure, which is what the card's own lead
 *    says it ranks on. Both render an em dash before anybody has enrolled,
 *    rather than a 0% nobody measured.
 */
function CoursePerformanceCard({ rows }: { rows: CoursePerformanceRow[] }) {
  return (
    <Card className="gap-0 overflow-hidden px-7 py-6 ring-border [--card-spacing:0px]">
      {/* `font-bold` explicitly, for the reason `CLAUDE.md` gives. */}
      <h2 className="text-xl leading-none font-bold">
        {analyticsCopy.performanceHeading}
      </h2>
      <p className="mt-2.5 text-[14px] text-muted-foreground">
        {analyticsCopy.performanceLead}
      </p>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {analyticsCopy.performanceEmpty}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          {/* The repo's own `Table`, not a hand-rolled one: its container is
              what clips a wide table to the card. Rolled by hand the coupons
              table escaped its wrapper and gave the *page* a horizontal
              scrollbar at phone width — that file's note. */}
          <Table className="min-w-[680px] border-b border-border-subtle">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="h-[38px] w-[44%] px-0 text-[14px] font-normal text-muted-foreground">
                  {analyticsCopy.columns.course}
                </TableHead>
                <TableHead className="h-[38px] px-0 text-[14px] font-normal text-muted-foreground">
                  {analyticsCopy.columns.enrolments}
                </TableHead>
                <TableHead className="h-[38px] px-0 text-[14px] font-normal text-muted-foreground">
                  {analyticsCopy.columns.completion}
                </TableHead>
                <TableHead className="h-[38px] px-0 text-[14px] font-normal text-muted-foreground">
                  {analyticsCopy.columns.watchTime}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-border-subtle hover:bg-transparent"
                >
                  <TableCell className="h-[55px] px-0">
                    <div className="flex items-center gap-3">
                      <CourseArt
                        thumbnailUrl={row.thumbnailUrl}
                        categorySlug={row.categorySlug}
                        categoryAccent={row.categoryAccent}
                        className="h-7 w-10 rounded-md"
                        iconClassName="size-3"
                      />
                      <span className="min-w-0 truncate text-[15px] font-semibold">
                        {row.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="h-[55px] px-0 text-[15px] font-semibold tabular-nums">
                    {counts.format(row.enrolments)}
                  </TableCell>
                  <TableCell className="h-[55px] px-0 text-[15px] text-muted-foreground tabular-nums">
                    {formatStatValue(row.completion, "percent1")}
                  </TableCell>
                  <TableCell className="h-[55px] px-0 text-[15px] text-muted-foreground tabular-nums">
                    {formatStatValue(row.watchTime, "percent1")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}

export { CoursePerformanceCard }
