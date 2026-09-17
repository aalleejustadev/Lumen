import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"

/**
 * The dashboard's **count** tile: a 44px tinted square, with the figure and
 * its label stacked beside it, and no delta.
 *
 * **Not `stat-card.tsx`.** That one is Platform Overview's and Reports'
 * — a small icon beside a label, with the figure and a month-over-month delta
 * on the line below. This is the other shape, and **three** exports across two
 * shells now draw it identically (80px tall, 20px inset, 44px tile, 16px gap
 * between four across the content width): `users-page__admin.png`,
 * `community-page__admin.png` and the instructor's `coupons-page__main.png`.
 *
 * It started life in `components/dashboard/admin/` when the second console
 * page needed it. The third caller is in the *instructor* shell, which is why
 * it sits here now rather than there: reaching across a shell boundary for a
 * header would tie this page to a redesign of the console, which is exactly
 * the coupling the note below refuses in the other direction.
 *
 * It is still deliberately *not* shared with the student
 * `learning-stat-card.tsx`, which arrived at the same anatomy from a different
 * export — that one is a tinted tile on a white card rather than this card's
 * own inverse, and the two exports are free to diverge.
 *
 * `p-5 py-4.5` is 20px sides against 18px top and bottom, which is what lands
 * the card on the **80px** both exports measure — `p-5` alone renders 84.
 * The shorthand stays in front of it on purpose: `Card` sets
 * `py-(--card-spacing)`, and `p-*` is the one thing tailwind-merge reliably
 * drops that against (they are the same family), where a bare `py-*` against
 * an arbitrary CSS-variable value is the case `settings-billing.tsx` found it
 * does not.
 *
 * The two lines are pulled in to `leading-7`/`leading-4` so the **tile**, not
 * the type, sets the height — the note `learning-stat-card.tsx` spells out:
 * at the default leadings the text block is taller than the tile and the row
 * grows past what is drawn.
 */
function CountCard({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon
  value: string
  label: string
}) {
  return (
    <Card className="flex-row items-center gap-4 p-5 py-4.5 ring-border">
      <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-hover">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl leading-7 font-extrabold tracking-[-0.02em] tabular-nums">
          {value}
        </p>
        <p className="text-sm leading-4 text-muted-foreground">{label}</p>
      </div>
    </Card>
  )
}

export { CountCard }
