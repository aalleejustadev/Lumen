import Link from "next/link"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  CircleCheckIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  instructorOverviewCards as copy,
  type InstructorOverview,
} from "@/lib/config/instructor-overview"

/**
 * "Student Completion Rate" — how many of this instructor's students finish.
 *
 * **The same definition the manage page and the Students page use**:
 * `Enrollment.completedAt` over enrolments. Three instructor screens under one
 * label must not show three numbers.
 *
 * **The delta is percentage *points*, not a percentage of a percentage** — the
 * distinction uptime's card already records — and it compares the rate as it
 * stands against the rate over the enrolments that existed 30 days ago, which
 * is the running-total reading Platform Overview settled. It is **dropped
 * rather than drawn as +0** when there is no history to compare against, the
 * call the instructor Reviews page makes about its own "vs last quarter" line.
 */
function CompletionCard({
  completion,
}: {
  completion: InstructorOverview["completion"]
}) {
  const { percent, deltaPercent, previousPercent, enrolled, completed } =
    completion
  const up = deltaPercent >= 0
  const Arrow = up ? ArrowUpIcon : ArrowDownIcon

  return (
    <Card className="gap-0 p-7 ring-border">
      <h2 className="text-base">{copy.completion.title}</h2>

      <div className="mt-4 flex items-end gap-3">
        <span className="stat-figure text-[42px] leading-none">{percent}%</span>
        {previousPercent > 0 && deltaPercent !== 0 ? (
          <span
            className={`mb-1.5 flex items-center gap-1 text-[15px] font-semibold ${
              up ? "text-success" : "text-destructive"
            }`}
          >
            <Arrow className="size-4" />
            {Math.abs(deltaPercent)}%
          </span>
        ) : null}
      </div>

      <Progress
        value={percent}
        className="mt-4 [&_[data-slot=progress-indicator]]:bg-bar-fill [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-track"
      />
      <div className="mt-2.5 flex items-center justify-between text-[13px] text-muted-foreground">
        <span>{copy.completion.previous(previousPercent)}</span>
        <span>{copy.completion.target}</span>
      </div>

      <div className="mt-5 flex flex-col gap-3.5">
        <Row
          icon={<UsersIcon className="size-4.5 text-accent-2" />}
          label={copy.completion.enrolled}
          value={enrolled}
        />
        <Row
          icon={<CircleCheckIcon className="size-4.5 text-success" />}
          label={copy.completion.completed}
          value={completed}
        />
      </div>

      <Progress
        value={percent}
        className="mt-4 [&_[data-slot=progress-indicator]]:bg-bar-fill [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-track"
      />
      <p className="mt-2.5 text-[13px] text-muted-foreground">
        {copy.completion.share(percent)}
      </p>

      {/* Straight to the Students table, which is the report this names. */}
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href="/dashboard/instructor/students" />}
        className="mt-5 h-11 w-full bg-card font-semibold"
      >
        {copy.completion.cta}
      </Button>
    </Card>
  )
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className="flex-1 text-[15px]">{label}</span>
      <span className="text-[17px] font-bold tabular-nums">
        {value.toLocaleString("en-US")}
      </span>
    </div>
  )
}

export { CompletionCard }
