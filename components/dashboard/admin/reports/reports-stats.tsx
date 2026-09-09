import { AdminStatCard } from "@/components/dashboard/admin/admin-stat-card"
import { reportStatCards } from "@/lib/config/admin-reports"
import type { ReportStats } from "@/lib/admin/reports"

/**
 * The four-up KPI row at the top of
 * `ui-design/light/dashboard/admin/reports-page__admin.png`. Same tile as
 * Platform Overview's (`admin-stat-card.tsx`), with the arrow this export
 * draws beside each delta.
 *
 * Note the **Refund rate** card is tinted red when the rate falls, because
 * `deltaToneClass` reads a negative delta as bad and that is exactly what the
 * export draws here — a red ↓ −0.3%. A falling refund rate is of course good
 * news; the export's own colouring is kept rather than special-cased, since
 * the brief is to match it and one rule across every card is easier to trust
 * than a per-card exception.
 */
function ReportsStatsRow({ stats }: { stats: ReportStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {reportStatCards.map((card) => (
        <AdminStatCard
          key={card.key}
          label={card.label}
          icon={card.icon}
          value={stats[card.key].value}
          delta={stats[card.key].delta}
          format={card.format}
          arrow
        />
      ))}
    </div>
  )
}

export { ReportsStatsRow }
