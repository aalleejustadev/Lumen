import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CircleCheckIcon, PlayIcon } from "lucide-react"

import type { OverviewData } from "@/lib/config/dashboard-overview-shape"

const toneClasses = {
  warning: {
    indicator: "[&_[data-slot=progress-indicator]]:bg-warning",
    badge: "bg-warning text-white",
    icon: "bg-foreground text-background",
  },
  success: {
    indicator: "[&_[data-slot=progress-indicator]]:bg-success",
    badge: "bg-success text-white",
    icon: "bg-foreground text-background",
  },
}

/**
 * Weekly goal headline, the two-up bar breakdown, and the in-progress /
 * completed counts that back it.
 *
 * **Every figure here used to be a constant** — 72.5%, two invented bars and
 * two counts — so it read the same on an account that had never enrolled in
 * anything. They come off the learner's own enrolments now.
 *
 * "Weekly Goal" is the share of enrolled courses finished. There is no goal
 * model and no target column, so the honest reading of the export's dial is
 * progress towards finishing what you started, not progress against a number
 * nobody set.
 */
function ProgressStatisticsCard({ p }: { p: OverviewData["overall"] }) {
  const inProgress = p.coursesEnrolled - p.coursesCompleted
  const goal = p.coursesEnrolled
    ? Math.round((p.coursesCompleted / p.coursesEnrolled) * 1000) / 10
    : 0

  const breakdown = [
    {
      value: p.coursesEnrolled
        ? Math.round((inProgress / p.coursesEnrolled) * 100)
        : 0,
      tone: "warning" as const,
    },
    {
      value: p.coursesEnrolled
        ? Math.round((p.coursesCompleted / p.coursesEnrolled) * 100)
        : 0,
      tone: "success" as const,
    },
  ]

  const stats = [
    {
      label: "In Progress",
      count: inProgress,
      tone: "warning" as const,
      icon: PlayIcon,
    },
    {
      label: "Completed",
      count: p.coursesCompleted,
      tone: "success" as const,
      icon: CircleCheckIcon,
    },
  ]

  return (
    <Card className="gap-0 p-6.5 ring-border">
      <h2 className="text-base">Progress Statistics</h2>

      <div className="mt-4 flex flex-col items-center">
        <span className="text-[13px] text-muted-foreground">Weekly Goal</span>
        <span className="stat-figure mt-1 text-5xl">{goal}%</span>
      </div>

      <div className="mt-5 flex items-center gap-4">
        {breakdown.map((bar, index) => (
          <div key={index} className="flex flex-1 items-center gap-2.5">
            <Progress
              value={bar.value}
              className={`w-full [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-track ${toneClasses[bar.tone].indicator}`}
            />
            <span className="shrink-0 text-[13px] font-semibold text-muted-foreground tabular-nums">
              {bar.value}%
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border bg-soft p-3"
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClasses[stat.tone].icon}`}
            >
              <stat.icon className="size-4" />
            </span>
            <span className="flex-1 text-xl font-extrabold tracking-[-0.02em] tabular-nums">
              {stat.count}
            </span>
            <Badge className={`h-6 px-3 ${toneClasses[stat.tone].badge}`}>
              {stat.label}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  )
}

export { ProgressStatisticsCard }
