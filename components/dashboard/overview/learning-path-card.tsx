import { GitBranchPlusIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { learningPaths } from "@/lib/config/dashboard-overview"

const toneClass = {
  success: "[&_[data-slot=progress-indicator]]:bg-success",
  warning: "[&_[data-slot=progress-indicator]]:bg-warning",
}

/**
 * The two enrolled tracks. Each is its own bordered, plain-white box (no
 * `bg-soft` tint — measured off the export, the interior is pure white, same
 * as the parent card, just outlined) rather than sitting flush on the card.
 */
function LearningPathCard() {
  return (
    <Card className="gap-0 p-6.5 ring-border">
      <div className="flex items-center justify-between">
        <h2 className="text-base">Learning Path</h2>
        {/* Decorative for now — no path-management surface exists yet. */}
        <span className="grid size-7 place-items-center rounded-md text-subtle-foreground">
          <GitBranchPlusIcon className="size-4" />
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {learningPaths.map((path) => (
          <div key={path.title} className="rounded-xl border p-5">
            <h3 className="text-[15px] font-bold">{path.title}</h3>
            <Progress
              value={(path.completed / path.total) * 100}
              className={`mt-4 w-full [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-track ${toneClass[path.tone]}`}
            />
            <p className="mt-3 text-[13px] text-muted-foreground">
              {path.completed} of {path.total} modules completed
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}

export { LearningPathCard }
