import { Card } from "@/components/ui/card"
import { userStatCards } from "@/lib/config/admin-users"
import type { UserStats } from "@/lib/admin/users"

const counts = new Intl.NumberFormat("en-US")

/**
 * The four-up KPI row at the top of
 * `ui-design/light/dashboard/admin/users-page__admin.png`.
 *
 * **Not `admin-stat-card.tsx`.** That tile is Platform Overview's and Reports'
 * — a small icon beside a label, with the figure and its month-over-month
 * delta on the line below — and this export draws something else: a 44px tile
 * on the left, the figure and its label stacked beside it, no delta anywhere.
 * Sharing a component between the two would mean one of the pages stops
 * matching its own export, so the geometry is measured here instead.
 *
 * That anatomy is the *student* My Learning row's (`learning-stat-card.tsx`),
 * arrived at from a different export. They are not shared either: an admin
 * page reaching into `components/dashboard/learning/` would tie this table's
 * header to a redesign of a learner surface it has nothing to do with.
 *
 * Measured off the export at DPR 2: four cards across the full content width
 * on a 16px gap, 20px inset, a 44px `bg-hover` tile, and the two lines pulled
 * in so the tile — not the type — sets the 82px height. That last part is the
 * note `learning-stat-card.tsx` spells out: at the default leadings the text
 * block is taller than the tile and the row grows past what is drawn.
 */
function UsersStats({ stats }: { stats: UserStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {userStatCards.map(({ key, label, icon: Icon }) => (
        <Card key={key} className="flex-row items-center gap-4 p-5 ring-border">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-hover">
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-2xl leading-7 font-extrabold tracking-[-0.02em] tabular-nums">
              {counts.format(stats[key])}
            </p>
            <p className="text-sm leading-4 text-muted-foreground">{label}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}

export { UsersStats }
