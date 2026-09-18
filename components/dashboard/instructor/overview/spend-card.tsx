"use client"

import { Cell, Pie, PieChart } from "recharts"

import { Card } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import {
  instructorOverviewCards as copy,
  type SpendSlice,
} from "@/lib/config/instructor-overview"

/**
 * "Where Students Spend Time" — the donut from `instructor-dashboard.png`.
 *
 * **A real count, not a mood.** The export's three slices are Video, Reading
 * and Quizzes, which is exactly `CourseLesson.type`, so this is the share of
 * *completed* lessons of each kind across the instructor's courses. An
 * unopened lesson is not time spent, which is why the read filters on
 * `LessonProgress.completedAt`.
 *
 * It is the learner-side `activity-donut-card.tsx` read from the other end and
 * borrows its `--chart-1/2/3` scale, sampled off this export exactly — so a
 * student's own split and their instructor's cohort view cannot colour the
 * same word two ways.
 *
 * An instructor whose students have finished nothing gets the empty state
 * rather than a donut of zeroes, which would draw as a single grey ring.
 */
function SpendCard({ spend }: { spend: SpendSlice[] }) {
  const chartConfig: ChartConfig = Object.fromEntries(
    spend.map((slice) => [
      slice.label,
      { label: slice.label, color: slice.color },
    ])
  ) satisfies ChartConfig

  return (
    <Card className="gap-0 p-7 ring-border">
      <h2 className="text-base">{copy.spend.title}</h2>

      {spend.length === 0 ? (
        <div className="mt-6 grid flex-1 place-items-center rounded-xl border border-dashed px-5 py-10 text-center">
          <p className="max-w-[300px] text-[13px] leading-5 text-muted-foreground">
            {copy.spend.emptyBody}
          </p>
        </div>
      ) : (
        <>
          {/* An explicit pixel size, not `aspect-*` + `max-h-*`: a Pie in a
              flex parent renders at 0x0 without one — the trap the student
              Overview's own donut records. */}
          <ChartContainer
            config={chartConfig}
            className="mx-auto mt-4 h-[230px] w-[230px]"
          >
            <PieChart>
              <Pie
                data={spend}
                dataKey="value"
                nameKey="label"
                innerRadius={68}
                outerRadius={112}
                paddingAngle={0}
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
              >
                {spend.map((slice) => (
                  <Cell key={slice.label} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {spend.map((slice) => (
              <div key={slice.label} className="text-center">
                <p className="flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full"
                    style={{ background: slice.color }}
                  />
                  {slice.label}
                </p>
                <p className="mt-1 text-[17px] font-bold tabular-nums">
                  {slice.value}%
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

export { SpendCard }
