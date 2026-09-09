"use client"

import { Bar, BarChart, LabelList, XAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { formatDelta } from "@/components/dashboard/admin/platform-format"
import { adminReportsCopy } from "@/lib/config/admin-reports"
import type { RevenueSeries } from "@/lib/admin/reports"

const chartConfig = {
  cents: { label: "Gross revenue", color: "var(--bar-fill)" },
} satisfies ChartConfig

const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
})

const compact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
})

/**
 * "$820k", "$1.06M" — the export's own spelling. `Intl` writes both suffixes
 * in caps, and the export lower-cases only the thousands one, so that single
 * letter is patched rather than the number being formatted by hand.
 *
 * Local rather than in `platform-format.ts`: the stat cards above never reach
 * the thousands suffix (they draw millions), so this spelling is this card's
 * business alone.
 */
function compactMoney(cents: number) {
  return compact.format(cents / 100).replace(/K$/, "k")
}

/**
 * "Gross revenue by month", from
 * `ui-design/light/dashboard/admin/reports-page__admin.png`.
 *
 * Measured off that export at DPR 2: a 24px-inset card, a 17px/700 title over
 * a 13px muted total, the period delta as a filled pill in the top-right
 * corner, and roughly 190px of bar over a 13px muted month label.
 *
 * Two readings of the export are deliberate:
 *
 *  - **The bars are drawn from zero.** The export's own six columns are not
 *    proportional to the figures written above them (its $820k bar is 47% of
 *    the $1.24M one, where the numbers say 66%) — they were placed by eye. A
 *    bar chart whose heights don't match its values is the one thing a chart
 *    must not be, so this plots honestly and the column silhouette differs
 *    from the drawing.
 *  - **No tooltip.** Every bar already carries its value above it, so a hover
 *    card would only repeat what is on screen.
 *
 * `ChartContainer` gets an explicit pixel height rather than an aspect ratio,
 * per the note in `CLAUDE.md` — it renders at 0×0 otherwise. The top margin is
 * what leaves room for the value labels, which sit outside the plot area.
 */
function RevenueChartCard({ series }: { series: RevenueSeries }) {
  const delta = formatDelta(series.delta)
  const empty = series.months.every((month) => month.cents === 0)

  const data = series.months.map((month) => ({
    label: monthLabel.format(month.month),
    cents: month.cents,
  }))

  return (
    <Card className="gap-0 px-6 ring-border [--card-spacing:--spacing(6)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] leading-none font-bold">
            {adminReportsCopy.revenueHeading}
          </h2>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Total {compactMoney(series.totalCents)} across the period
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
          {adminReportsCopy.revenueEmpty}
        </p>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="mt-8 aspect-auto h-[248px] w-full"
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
              maxBarSize={56}
            >
              <LabelList
                dataKey="cents"
                position="top"
                offset={14}
                className="fill-foreground"
                fontSize={13}
                fontWeight={500}
                formatter={(value) => compactMoney(Number(value ?? 0))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </Card>
  )
}

export { RevenueChartCard }
