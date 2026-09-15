import { InfoIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { moderationBanner } from "@/lib/config/discussions"

/**
 * The instructor export's orange strip.
 *
 * Measured at DPR 2: **68.5px** on a `--warning` hairline over a `--warning`
 * tint, a 38px solid `--warning` tile 16px from a 15px/700 title over a 13px
 * muted line, and a 78 x 36 dark Review at the trailing edge. The tokens are
 * used rather than the export's literal fills, so dark mode follows — the rule
 * `settings-billing.tsx` records.
 *
 * **It is only drawn when there is something in it.** A strip announcing
 * "0 replies need moderation" is the noise Platform Overview's attention
 * queues already refuse; the caller decides, so this component never has to
 * render an empty state.
 *
 * **Review stays inside this mode.** It pointed at `/dashboard/admin/reviews`
 * — the console, which an instructor cannot open at all and which lists every
 * report on the platform rather than theirs. It now filters the list behind it
 * to the reported threads, which is moderation an instructor can actually do.
 * The count is scoped to match: open reports on threads in topics *they*
 * moderate — see `reportedDiscussionIds`.
 */
function ModerationBanner({
  count,
  onReview,
}: {
  count: number
  onReview: () => void
}) {
  return (
    <div className="mt-4 flex items-center gap-4 rounded-xl border border-warning bg-warning/10 px-4 py-3.5">
      <div className="grid size-[38px] shrink-0 place-items-center rounded-lg bg-warning text-white">
        <InfoIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-foreground">
          {moderationBanner.title(count)}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {moderationBanner.description}
        </p>
      </div>
      <Button type="button" onClick={onReview} className="h-9 shrink-0 px-4">
        {moderationBanner.action}
      </Button>
    </div>
  )
}

export { ModerationBanner }
