import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

/** The four checkpoints under the bar. A milestone is "reached" once the
 *  student's progress is at or past it, which is what fills it dark. */
const MILESTONES = [25, 50, 75, 100]

/**
 * "Your Study Progress" from `course-page__part1.png`: the percentage as a
 * pill beside the heading, one bar, the milestone row, and the encouragement
 * note on a `bg-soft` panel underneath.
 */
function StudyProgressCard({
  progress,
  encouragement,
}: {
  progress: number
  encouragement: string
}) {
  return (
    <Card className="gap-0 p-6 ring-border">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Your Study Progress</h2>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-[13px] leading-5 font-semibold text-muted-foreground tabular-nums">
          {progress}%
        </span>
      </div>

      <Progress
        value={progress}
        aria-label="Course progress"
        className="mt-5 [&_[data-slot=progress-indicator]]:bg-bar-fill [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-track"
      />

      <div className="mt-4 flex items-center justify-between">
        {MILESTONES.map((milestone) => {
          const reached = progress >= milestone
          return (
            <span
              key={milestone}
              className={cn(
                "flex size-10 items-center justify-center rounded-full text-[13px] leading-4 font-bold tabular-nums",
                reached
                  ? "bg-primary text-primary-foreground"
                  : "bg-track text-muted-foreground"
              )}
            >
              {milestone}
            </span>
          )
        })}
      </div>

      <p className="mt-5 rounded-xl bg-soft p-5 text-[15px] leading-7 text-muted-foreground">
        {encouragement}
      </p>
    </Card>
  )
}

export { StudyProgressCard }
