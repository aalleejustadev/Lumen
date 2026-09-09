import type { LucideIcon } from "lucide-react"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import {
  deltaToneClass,
  formatDelta,
  formatStatValue,
} from "@/components/dashboard/admin/platform-format"
import type { PlatformStatFormat } from "@/lib/config/admin-overview"
import { cn } from "@/lib/utils"

/**
 * One KPI card. Both admin pages draw the identical tile — Platform Overview's
 * four-up row and Reports' — so the geometry is measured once here rather than
 * copied, and neither page can drift from the other.
 *
 * Measured off `platform-overview.png` at DPR 2: a 20px inset, a 34px icon tile
 * beside a 15px muted label, and the figure with its delta on a shared
 * baseline 10px below.
 *
 * The type is a size up from the literal measurement, which is the call
 * `my-learning.tsx` documents: these exports render text at roughly 0.8 of the
 * design system's scale (their `h1` measures a 26px cap where the settings
 * export's measures 32), so the figure is the design system's 32px rather than
 * the 26 it is drawn at, and the cards run a few pixels taller than the 116px
 * drawn.
 *
 * Padding comes from `--card-spacing` plus a matching `px-*` rather than a
 * plain `p-5`, and the inner column owns the gap: `Card` writes
 * `py-(--card-spacing)`/`gap-(--card-spacing)`, which tailwind-merge does not
 * recognise as the same utility group as a plain override — the trap
 * `settings-billing.tsx` documents. Setting the variable is the fix; a `p-5`
 * next to it would leave both declarations standing.
 *
 * `arrow` is the one difference between the two pages: the Reports export puts
 * a ↑/↓ before each delta and Platform Overview's does not, so it is opt-in
 * rather than something the shared tile decides for itself.
 */
function AdminStatCard({
  label,
  icon: Icon,
  value,
  delta,
  format,
  arrow = false,
}: {
  label: string
  icon: LucideIcon
  value: number | null
  delta: number | null
  format: PlatformStatFormat
  arrow?: boolean
}) {
  const formatted = formatDelta(delta)
  const Arrow = delta !== null && delta < 0 ? ArrowDownIcon : ArrowUpIcon

  return (
    <Card className="px-5 ring-border [--card-spacing:--spacing(5)]">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <div className="grid size-8.5 shrink-0 place-items-center rounded-xl bg-hover">
            <Icon className="size-4.5" />
          </div>
          <span className="text-[15px] text-muted-foreground">{label}</span>
        </div>

        {/* Baseline-aligned, not centred: the export sits the delta's digits on
            the figure's own baseline. */}
        <div className="flex items-baseline gap-2.5">
          <span className="text-[32px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
            {formatStatValue(value, format)}
          </span>
          {formatted ? (
            <span
              className={cn(
                "flex items-center gap-1 text-[15px] font-semibold tabular-nums",
                deltaToneClass(delta)
              )}
            >
              {/* The arrow repeats the sign the number already carries, so it
                  is decoration and hidden from assistive tech. */}
              {arrow ? (
                <Arrow aria-hidden className="size-3.5 stroke-[2.5]" />
              ) : null}
              {formatted}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

export { AdminStatCard }
