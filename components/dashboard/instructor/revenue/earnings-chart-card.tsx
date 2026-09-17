"use client"

import { Bar, BarChart, LabelList, XAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import {
  formatMoney,
  formatMoneyCompact,
} from "@/components/dashboard/instructor/revenue/revenue-format"
import { formatDelta } from "@/components/dashboard/stat-format"
import { revenueCopy } from "@/lib/config/instructor-revenue"
import type { EarningSeries } from "@/lib/instructor-revenue"

const chartConfig = {
  cents: { label: "Earnings", color: "var(--bar-fill)" },
} satisfies ChartConfig

const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
})

/**
 * "Earnings by month", from
 * `ui-design/light/dashboard/instructor/revenue-page.png`.
 *
 * The third card of this shape in the app, after the console's
 * `revenue-chart-card.tsx` and the instructor's `enrolments-chart-card.tsx`,
 * and still not a shared component for the reason that second one records:
 * the three exports draw the same *kind* of card at different sizes with
 * different copy, formatting and data shapes, and one component taking eight
 * props to reconcile them would be the worse trade. What they genuinely share
 * — `formatDelta`, and the two readings below — is shared.
 *
 * Measured off this export at DPR 2: a **26px**-inset card, an 18px/700 title
 * over a 14px muted lead, the trend as a filled pill in the top-right corner,
 * then six bars with their values above and a 13px muted month label below.
 *
 * Two things about it are decisions rather than markup:
 *
 *  - **Six *complete* months, so the chart deliberately excludes the "This
 *    month" card's figure.** That is what the export draws — its last bar is
 *    August's $22.1k against a This month card of $18,240 — and the trap
 *    `getRevenueByMonth` documents: a partial month plotted beside complete
 *    ones reads as a collapse.
 *  - **Bars are plotted from zero**, and this export's happen to be honest
 *    about it (its $9.2k bar is 42% of its $22.1k one, where the numbers say
 *    42%), unlike the two charts it is a sibling of. No tooltip: every bar
 *    already carries its value.
 *
 * `ChartContainer` gets an explicit pixel height rather than an aspect ratio,
 * per the note in `CLAUDE.md` — it renders at 0×0 otherwise.
 */
function EarningsChartCard({ series }: { series: EarningSeries }) {
  const delta = formatDelta(series.delta)
  const empty = series.months.every((month) => month.cents === 0)

  const data = series.months.map((month) => ({
    label: monthLabel.format(month.month),
    cents: month.cents,
  }))

  return (
    <Card className="gap-0 p-6.5 ring-border [--card-spacing:0px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* `font-bold` explicitly: `globals.css` sets every `h2` to 800 and
              the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
          <h2 className="text-lg leading-none font-bold">
            {revenueCopy.earningsHeading}
          </h2>
          <p className="mt-2.5 text-[14px] text-muted-foreground">
            {revenueCopy.earningsLead(
              formatMoney(series.totalCents),
              series.bestMonth
            )}
          </p>
        </div>
        {delta ? (
          <Badge className="h-6.5 shrink-0 bg-foreground px-2.5 text-[13px] font-semibold text-background tabular-nums">
            {delta}
          </Badge>
        ) : null}
      </div>

      {empty ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {revenueCopy.earningsEmpty}
        </p>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="mt-7 aspect-auto h-[206px] w-full"
        >
          <BarChart data={data} margin={{ top: 26, left: 0, right: 0 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={14}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 13 }}
            />
            <Bar
              dataKey="cents"
              fill="var(--color-cents)"
              radius={6}
              maxBarSize={46}
            >
              <LabelList
                dataKey="cents"
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={13}
                fontWeight={500}
                formatter={(value) => formatMoneyCompact(Number(value ?? 0))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </Card>
  )
}

export { EarningsChartCard }
