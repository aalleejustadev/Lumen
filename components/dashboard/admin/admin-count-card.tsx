import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"

/**
 * The console's **count** tile: a 44px tinted square, with the figure and its
 * label stacked beside it, and no delta.
 *
 * **Not `admin-stat-card.tsx`.** That one is Platform Overview's and Reports'
 * — a small icon beside a label, with the figure and a month-over-month delta
 * on the line below. This is the other shape the console draws, and two pages
 * now draw it: `users-page__admin.png` and `community-page__admin.png`, whose
 * cards measure identically (80px tall, 20px inset, 44px tile, 16px gap
 * between four across the content width). It lives here for the reason
 * `admin-stat-card.tsx` does — one geometry, so a change lands on both at
 * once, and neither page stops matching its own export.
 *
 * It is deliberately *not* shared with the student `learning-stat-card.tsx`,
 * which arrived at the same anatomy from a different export: an admin page
 * reaching into `components/dashboard/learning/` would tie these headers to a
 * redesign of a learner surface they have nothing to do with.
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
function AdminCountCard({
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

export { AdminCountCard }
