"use client"

import { Cell, Pie, PieChart } from "recharts"

import { Card } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { activityBreakdown } from "@/lib/config/dashboard-overview"

const chartConfig: ChartConfig = Object.fromEntries(
  activityBreakdown.map((slice) => [
    slice.label,
    { label: slice.label, color: slice.color },
  ])
) satisfies ChartConfig

/** How the week's time split across watching, reading and quizzes. */
function ActivityDonutCard() {
  return (
    <Card className="gap-0 p-6.5 ring-border">
      <h2 className="text-base">Most Activity</h2>

      <ChartContainer
        config={chartConfig}
        className="mx-auto mt-2 h-[220px] w-[220px]"
      >
        <PieChart>
          <Pie
            data={activityBreakdown}
            dataKey="value"
            nameKey="label"
            innerRadius="66%"
            outerRadius="100%"
            strokeWidth={0}
          >
            {activityBreakdown.map((slice) => (
              <Cell key={slice.label} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {activityBreakdown.map((slice) => (
          <div key={slice.label} className="flex flex-col items-center gap-1.5">
            <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.label}
            </span>
            <span className="text-base font-bold tabular-nums">
              {slice.value}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export { ActivityDonutCard }
