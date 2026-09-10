import { AdminCountCard } from "@/components/dashboard/admin/admin-count-card"
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
 *
 * That geometry now lives in `admin-count-card.tsx`, because the Community
 * page's export draws the identical card (both measure 80px tall on a 20px
 * inset) and a second copy of it would be one to keep in step. This file is
 * the four-up grid and the numbers that go in it.
 */
function UsersStats({ stats }: { stats: UserStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {userStatCards.map(({ key, label, icon }) => (
        <AdminCountCard
          key={key}
          icon={icon}
          value={counts.format(stats[key])}
          label={label}
        />
      ))}
    </div>
  )
}

export { UsersStats }
