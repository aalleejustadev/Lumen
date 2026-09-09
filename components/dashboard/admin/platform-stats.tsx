import { AdminStatCard } from "@/components/dashboard/admin/admin-stat-card"
import { platformStatCards } from "@/lib/config/admin-overview"
import type { PlatformStats } from "@/lib/admin/overview"

/**
 * The four-up KPI row at the top of
 * `ui-design/light/dashboard/admin/platform-overview.png`: four cards on a
 * 16px gap across the full content width.
 *
 * The tile itself is `admin-stat-card.tsx`, shared with the Reports page —
 * both exports draw the identical card, so it is measured in one place. This
 * export draws no arrow beside the delta; Reports' does.
 */
function PlatformStatsRow({ stats }: { stats: PlatformStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {platformStatCards.map((card) => (
        <AdminStatCard
          key={card.key}
          label={card.label}
          icon={card.icon}
          value={stats[card.key].value}
          delta={stats[card.key].delta}
          format={card.format}
        />
      ))}
    </div>
  )
}

export { PlatformStatsRow }
