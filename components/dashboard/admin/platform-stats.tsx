import { Card } from "@/components/ui/card"
import {
  deltaToneClass,
  formatDelta,
  formatStatValue,
} from "@/components/dashboard/admin/platform-format"
import { platformStatCards } from "@/lib/config/admin-overview"
import type { PlatformStats } from "@/lib/admin/overview"
import { cn } from "@/lib/utils"

/**
 * The four-up KPI row at the top of
 * `ui-design/light/dashboard/admin/platform-overview.png`.
 *
 * Measured off that export at DPR 2: four cards on a 16px gap across the full
 * content width, 20px inset, a 34px icon tile beside a 15px muted label, and
 * the figure with its delta on a shared baseline 10px below.
 *
 * The type is a size up from the literal measurement, which is the call
 * `my-learning.tsx` documents: these exports render text at roughly 0.8 of the
 * design system's scale (this one's `h1` measures a 26px cap where the
 * settings export's measures 32), so the figure is the design system's 32px
 * rather than the 26 it is drawn at, and the cards run a few pixels taller
 * than the 116px drawn.
 *
 * Padding comes from `--card-spacing` plus a matching `px-*` rather than a
 * plain `p-5`, and the inner column owns the gap: `Card` writes
 * `py-(--card-spacing)`/`gap-(--card-spacing)`, which tailwind-merge does not
 * recognise as the same utility group as a plain override — the trap
 * `settings-billing.tsx` documents. Setting the variable is the fix; a `p-5`
 * next to it would leave both declarations standing.
 */
function PlatformStatsRow({ stats }: { stats: PlatformStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {platformStatCards.map((card) => {
        const stat = stats[card.key]
        const delta = formatDelta(stat.delta)

        return (
          <Card
            key={card.key}
            className="px-5 ring-border [--card-spacing:--spacing(5)]"
          >
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <div className="grid size-8.5 shrink-0 place-items-center rounded-xl bg-hover">
                  <card.icon className="size-4.5" />
                </div>
                <span className="text-[15px] text-muted-foreground">
                  {card.label}
                </span>
              </div>

              {/* Baseline-aligned, not centred: the export sits the delta's
                  digits on the figure's own baseline. */}
              <div className="flex items-baseline gap-2.5">
                <span className="text-[32px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
                  {formatStatValue(stat.value, card.format)}
                </span>
                {delta ? (
                  <span
                    className={cn(
                      "text-[15px] font-semibold tabular-nums",
                      deltaToneClass(stat.delta)
                    )}
                  >
                    {delta}
                  </span>
                ) : null}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export { PlatformStatsRow }
