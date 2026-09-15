import {
  ClockIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  UsersIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import {
  discussionStatAccents,
  discussionStatLabels,
} from "@/lib/config/discussions"
import type { DiscussionStats } from "@/lib/discussions"
import { cn } from "@/lib/utils"

/**
 * The instructor export's four-up KPI row.
 *
 * A **Server Component**, handed to the board as `children` so a row of markup
 * and its four icons never reach the bundle — `community-page.tsx`'
 * arrangement.
 *
 * **Not `count-card.tsx`.** That tile is 80px with a 44px monochrome `--hover`
 * square, which is what the console draws everywhere; this export measures
 * **72px with a 38px tile tinted per card** — sampled as `--info`,
 * `--role-instructor`, `--warning` and `--success` at 10%. Same anatomy,
 * different component, which is the call `learning-stat-card.tsx` already
 * makes against the console's.
 *
 * The figures describe what this instructor is **responsible for** — topics
 * they moderate plus threads they wrote — not the whole community; see
 * `lib/discussions.ts` for why the list underneath is deliberately wider.
 */
function DiscussionStatsRow({ stats }: { stats: DiscussionStats }) {
  const tiles = [
    {
      icon: MessagesSquareIcon,
      value: stats.activeThreads,
      label: discussionStatLabels.activeThreads,
    },
    {
      icon: MessageCircleIcon,
      value: stats.repliesThisMonth,
      label: discussionStatLabels.repliesThisMonth,
    },
    {
      icon: ClockIcon,
      value: stats.awaitingReply,
      label: discussionStatLabels.awaitingReply,
    },
    {
      icon: UsersIcon,
      value: stats.participants,
      label: discussionStatLabels.participants,
    },
  ]

  return (
    <>
      {tiles.map((tile, index) => (
        <Card
          key={tile.label}
          // 18px sides against 16px top and bottom, which is what lands the
          // card on the drawn 72px — the note `count-card.tsx` records about
          // its own 80.
          className="flex-row items-center gap-3.5 p-[18px] py-4 ring-border"
        >
          <div
            className={cn(
              "grid size-[38px] shrink-0 place-items-center rounded-lg",
              discussionStatAccents[index]
            )}
          >
            <tile.icon className="size-[18px]" />
          </div>
          <div>
            <p className="text-[22px] leading-7 font-extrabold tracking-[-0.02em] tabular-nums">
              {new Intl.NumberFormat("en-US").format(tile.value)}
            </p>
            <p className="text-[13px] leading-4 text-muted-foreground">
              {tile.label}
            </p>
          </div>
        </Card>
      ))}
    </>
  )
}

export { DiscussionStatsRow }
