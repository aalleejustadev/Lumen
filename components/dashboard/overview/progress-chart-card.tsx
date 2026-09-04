"use client"

import { Area, AreaChart } from "recharts"
import { CalendarIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { monthlyProgress } from "@/lib/config/dashboard-overview"

const chartConfig = {
  value: { label: "Progress", color: "var(--bar-fill)" },
} satisfies ChartConfig

/**
 * The wavy area chart. The date-range control is a static label — there's no
 * date-scoped query behind it yet, so it isn't wired as a real picker.
 */
function ProgressChartCard() {
  return (
    <Card className="gap-0 p-6.5 ring-border">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base">Your Progress by Month</h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            Compared to previous month +50.6%
            <Badge className="h-5 bg-foreground px-2 text-background">
              +2.5%
            </Badge>
          </p>
        </div>
        <span className="flex h-9 shrink-0 items-center gap-2 rounded-lg border bg-card px-3 text-[13px] text-muted-foreground">
          <CalendarIcon className="size-3.5" />
          25 Jul 2026 – 21 Aug 2026
        </span>
      </div>

      <ChartContainer
        config={chartConfig}
        className="mt-6 aspect-auto h-[220px] w-full"
      >
        <AreaChart
          data={monthlyProgress}
          margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
        >
          <defs>
            <linearGradient id="progress-fill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--bar-fill)"
                stopOpacity={0.18}
              />
              <stop offset="100%" stopColor="var(--bar-fill)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="value"
            type="monotone"
            stroke="var(--bar-fill)"
            strokeWidth={2}
            fill="url(#progress-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </Card>
  )
}

export { ProgressChartCard }
