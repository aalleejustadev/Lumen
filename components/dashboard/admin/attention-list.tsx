import Link from "next/link"
import { format, formatDistanceToNowStrict } from "date-fns"
import { ChevronRightIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import type { SubtitleFormatters } from "@/lib/config/admin-overview"

/**
 * The two shapes `attentionQueues`' `subtitle` formatters ask for. They live
 * here, next to their only caller, rather than in `platform-format.ts` — that
 * module is imported by a Client Component and this is the only thing in the
 * console that needs `date-fns`.
 */
const subtitleFormatters: SubtitleFormatters = {
  relative: (date) => formatDistanceToNowStrict(date, { addSuffix: true }),
  shortDate: (date) => format(date, "dd MMM"),
}
import {
  adminOverviewCopy,
  attentionQueues,
  attentionToneClasses,
} from "@/lib/config/admin-overview"
import type { AttentionFacts } from "@/lib/admin/overview"
import { cn } from "@/lib/utils"

/**
 * "Needs your attention" from
 * `ui-design/light/dashboard/admin/platform-overview.png` — four 78px cards on
 * the same 16px gap as the KPI row above, each an 18px inset, a 40px tinted
 * tile, two lines, and a trailing chevron.
 *
 * Every queue is a query (`lib/admin/overview.ts`) and every sentence is copy
 * (`lib/config/admin-overview.ts`); this file only lays them out. Two
 * behaviours the export cannot show, because it only draws a full queue:
 *
 *  - **An empty queue is dropped rather than drawn as a zero.** "0 reported
 *    reviews" under a heading that says something needs attention is noise,
 *    and a clear queue is exactly the thing an admin wants to see nothing
 *    about.
 *  - **The chevron only appears on a row that can be followed.** A queue whose
 *    page hasn't landed renders inert — the same treatment `settings-nav.tsx`
 *    gives a section whose route doesn't exist. See `AttentionQueue`'s `built`
 *    flag; two of the four lead somewhere today.
 *
 * `Card`'s padding is set through `--card-spacing` with a matching `px-*`, and
 * the row owns its own gap, for the tailwind-merge reason `platform-stats.tsx`
 * spells out.
 */
function AttentionList({ facts }: { facts: AttentionFacts }) {
  const rows = attentionQueues
    .map((queue) => ({ queue, ...queue.describe(facts, subtitleFormatters) }))
    .filter((row) => row.count > 0)

  if (rows.length === 0) {
    return (
      <Card className="px-5 ring-border [--card-spacing:--spacing(5)]">
        <p className="text-[15px] text-muted-foreground">
          {adminOverviewCopy.attentionEmpty}
        </p>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {rows.map(({ queue, title, subtitle }) => {
        const row = (
          <>
            <div
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl",
                attentionToneClasses[queue.tone]
              )}
            >
              <queue.icon className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">{title}</p>
              {subtitle ? (
                <p className="truncate text-[15px] text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {queue.built ? (
              <ChevronRightIcon className="size-4.5 shrink-0 text-muted-foreground" />
            ) : null}
          </>
        )

        return (
          <Card
            key={queue.key}
            className={cn(
              "px-4.5 ring-border [--card-spacing:--spacing(4.5)]",
              queue.built && "transition-shadow hover:shadow-card"
            )}
          >
            {queue.built ? (
              <Link
                href={queue.href}
                className="flex items-center gap-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {row}
              </Link>
            ) : (
              <div aria-disabled="true" className="flex items-center gap-4">
                {row}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

export { AttentionList }
