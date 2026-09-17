"use client"

import { Bar, BarChart, LabelList, XAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { formatDelta } from "@/components/dashboard/stat-format"
import { analyticsCopy } from "@/lib/config/instructor-analytics"
import type { EnrolmentSeries } from "@/lib/instructor-analytics"

const chartConfig = {
  count: { label: "New enrolments", color: "var(--bar-fill)" },
} satisfies ChartConfig

const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
})

const counts = new Intl.NumberFormat("en-US")

/**
 * "New enrolments by month", from
 * `ui-design/light/dashboard/instructor/analytics-page.png`.
 *
 * Measured off that export at DPR 2: a **24px**-inset card, an 18px/700 title
 * over a 14px muted lead, the trend as a filled pill in the top-right corner,
 * then six **46px** bars on a 141px pitch with their values 12px above and a
 * 13px muted month label below.
 *
 * It is `revenue-chart-card.tsx`'s twin rather than a shared component: the two
 * exports draw the same *kind* of card at different sizes (24px inset against
 * 24px, an 18px title against 17px, 46px bars against 56px) with different
 * copy, different formatting and different data shapes. What they genuinely
 * share — `formatDelta` and the two readings below — is shared; a single
 * component taking eight props to reconcile them would be the worse trade.
 *
 * Three things about it are decisions rather than markup:
 *
 *  - **The bars are drawn from zero.** The export's own six are not: fitted,
 *    its columns run from a baseline of roughly 195 rather than 0, and even
 *    that does not hold across all six — 1,164 is drawn shorter than the fit
 *    predicts while 948 is drawn taller, so they were placed by eye. A bar
 *    chart whose heights do not match its values is the one thing a chart must
 *    not be, so this plots honestly and the silhouette differs from the
 *    drawing. `revenue-chart-card.tsx` reached the same conclusion about its
 *    own export.
 *  - **Six *complete* months, and the range select does not reach it.**
 *    "New enrolments by month" over "Last 7 days" is one partial column, and a
 *    partial month beside complete ones reads as a collapse — the trap
 *    `getRevenueByMonth` documents. The console's Reports page already pairs a
 *    30-day KPI row with a fixed six-month chart for exactly this reason.
 *  - **No tooltip.** Every bar carries its value above it, so a hover card
 *    would only repeat what is on screen.
 *
 * `ChartContainer` gets an explicit pixel height rather than an aspect ratio,
 * per the note in `CLAUDE.md` — it renders at 0×0 otherwise. The top margin is
 * what leaves room for the value labels, which sit outside the plot area.
 */
function EnrolmentsChartCard({ series }: { series: EnrolmentSeries }) {
  const delta = formatDelta(series.delta)
  const empty = series.months.every((month) => month.count === 0)

  const data = series.months.map((month) => ({
    label: monthLabel.format(month.month),
    count: month.count,
  }))

  return (
    <Card className="gap-0 px-6 ring-border [--card-spacing:--spacing(6)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* `font-bold` explicitly: `globals.css` sets every `h2` to 800 and
              the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
          <h2 className="text-lg leading-none font-bold">
            {analyticsCopy.enrolmentsHeading}
          </h2>
          <p className="mt-2.5 text-[14px] text-muted-foreground">
            {analyticsCopy.enrolmentsLead(series.total, series.bestMonth)}
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
          {analyticsCopy.enrolmentsEmpty}
        </p>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="mt-7 aspect-auto h-[248px] w-full"
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
              dataKey="count"
              fill="var(--color-count)"
              radius={6}
              maxBarSize={46}
            >
              <LabelList
                dataKey="count"
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={13}
                fontWeight={500}
                formatter={(value) => counts.format(Number(value ?? 0))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </Card>
  )
}

export { EnrolmentsChartCard }
