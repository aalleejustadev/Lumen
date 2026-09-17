import type { LucideIcon } from "lucide-react"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import {
  deltaToneClass,
  formatCountDelta,
  formatDelta,
  formatStatValue,
  type StatFormat,
} from "@/components/dashboard/stat-format"
import { cn } from "@/lib/utils"

/**
 * One KPI card — a 34px icon tile beside a label, with the figure and its
 * delta below.
 *
 * **Three** pages draw the identical tile: Platform Overview's four-up row,
 * Reports', and the instructor's Analytics page. It was
 * `components/dashboard/admin/admin-stat-card.tsx` until the third one landed
 * and moved out of the console's directory for the reason `count-card.tsx`
 * and `course-art.tsx` both record — and which `manage-stats.tsx` had already
 * named from the other side. It stays distinct from `count-card.tsx` (a 44px
 * tinted tile beside the figure, no delta) and from `manage-stats.tsx`' own
 * bare-glyph tile: three exports, three anatomies.
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
 * Three props are opt-in rather than something the shared tile decides for
 * itself, because each is one export disagreeing with another:
 *
 *  - **`arrow`** — Reports and Analytics put a ↑/↓ before the delta, Platform
 *    Overview does not.
 *  - **`deltaFormat`** — Analytics' Open questions card draws "+2" where every
 *    other card on every page draws a percentage. A queue of nine is better
 *    described by the two that arrived than by "+22%".
 *  - **`footnote`** — the Analytics export hangs a muted line under the figure
 *    ("42 per day average", "awaiting your reply") that says what the number
 *    is *of*. Nothing else draws one, so it is absent by default and the card
 *    keeps the console's own height when it is.
 */
function StatCard({
  label,
  icon: Icon,
  value,
  delta,
  format,
  arrow = false,
  deltaFormat = "percent",
  footnote,
}: {
  label: string
  icon: LucideIcon
  value: number | null
  delta: number | null
  format: StatFormat
  arrow?: boolean
  /** How the chip beside the figure reads — see the note above. */
  deltaFormat?: "percent" | "count"
  /** The muted line under the figure, drawn only when there is one. */
  footnote?: string
}) {
  const formatted =
    deltaFormat === "count" ? formatCountDelta(delta) : formatDelta(delta)
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

        {/* Tight to the figure rather than a sibling of the two rows above:
            measured, the export leaves ~4px between the figure's box and this
            line, where the column's own gap would leave twelve. */}
        {footnote ? (
          <p className="-mt-1.5 text-[14px] text-muted-foreground">
            {footnote}
          </p>
        ) : null}
      </div>
    </Card>
  )
}

export { StatCard }
