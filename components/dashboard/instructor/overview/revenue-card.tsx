"use client"

import { CalendarIcon } from "lucide-react"
import { Area, AreaChart, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { instructorOverviewCards as copy } from "@/lib/config/instructor-overview"

const chartConfig = {
  cents: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig

/**
 * "Revenue by Month" — the instructor's own net share, month by month.
 *
 * **Net, and REVERSED earnings excluded**: a refunded sale's share went back
 * with the money, so it was never earned. That is the identical figure the
 * Revenue & Payouts page and My Courses' revenue column draw, read the
 * identical way — two screens under one label must not show two numbers.
 *
 * **Six months, built from computed boundaries and filled from the rows**, so
 * a month with no sales draws a zero rather than vanishing and leaving a short
 * axis — the trap `getRevenueByMonth` documents for the console's chart. It
 * includes the current, partial month, which the console's deliberately does
 * not: this is one instructor looking at their own shop and "what have I made
 * so far this month" is the question they are asking, where the console's card
 * is a platform trend a partial month would distort.
 *
 * The area is plotted from zero. The export's curve is a smooth spline with a
 * fade beneath it, which is what `type="monotone"` plus the gradient give.
 */
function RevenueCard({
  revenue,
  deltaPercent,
}: {
  revenue: { month: string; cents: number }[]
  deltaPercent: number
}) {
  const hasAny = revenue.some((point) => point.cents > 0)
  // The first day of the earliest bucket to today — what the six columns
  // actually cover.
  const now = new Date()
  const from = new Date(
    now.getFullYear(),
    now.getMonth() - (revenue.length - 1),
    1
  )
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  const range = `${fmt(from)} – ${fmt(now)}`

  const money = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(cents / 100)

  return (
    <Card className="gap-0 p-7 ring-border">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base">{copy.revenue.title}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-2.5 text-[15px] text-muted-foreground">
            {copy.revenue.compared(deltaPercent)}
            <Badge className="h-7 bg-foreground px-3 text-[13px] font-semibold text-background">
              {deltaPercent >= 0 ? "+" : ""}
              {deltaPercent}%
            </Badge>
          </p>
        </div>
        {/* The export draws a real window, not two month names. */}
        <span className="flex shrink-0 items-center gap-2.5 rounded-lg border bg-card px-4 py-2.5 text-[14px] font-medium tabular-nums">
          <CalendarIcon className="size-4 text-muted-foreground" />
          {range}
        </span>
      </div>

      {hasAny ? (
        <ChartContainer config={chartConfig} className="mt-6 h-[300px] w-full">
          <AreaChart data={revenue} margin={{ left: 4, right: 4, top: 8 }}>
            <defs>
              <linearGradient
                id="instructor-revenue"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.18}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              className="text-[12px]"
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <Area
              type="monotone"
              dataKey="cents"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#instructor-revenue)"
            />
          </AreaChart>
        </ChartContainer>
      ) : (
        <div className="mt-6 grid h-[300px] place-items-center rounded-xl border border-dashed text-center">
          <p className="max-w-[320px] text-[13px] leading-5 text-muted-foreground">
            {copy.revenue.emptyBody}
          </p>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between text-[13px] text-muted-foreground">
        <span>{revenue[0]?.month}</span>
        <span className="font-semibold text-foreground tabular-nums">
          {money(revenue.reduce((sum, point) => sum + point.cents, 0))} total
        </span>
        <span>{revenue.at(-1)?.month}</span>
      </div>
    </Card>
  )
}

export { RevenueCard }
