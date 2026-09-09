import { PayoutRunsCard } from "@/components/dashboard/admin/reports/payout-runs-card"
import { ReportsStatsRow } from "@/components/dashboard/admin/reports/reports-stats"
import { RevenueChartCard } from "@/components/dashboard/admin/reports/revenue-chart-card"
import {
  getPayoutRuns,
  getReportStats,
  getRevenueByMonth,
} from "@/lib/admin/reports"
import { adminReportsCopy } from "@/lib/config/admin-reports"

/**
 * `/dashboard/admin/reports`, from
 * `ui-design/light/dashboard/admin/reports-page__admin.png`: the title with
 * its lead, a four-up KPI row, the revenue bar chart, and the payout-runs
 * table. Three sections, three reads, issued together — none depends on
 * another.
 *
 * Measured off that export at DPR 2: full content width on the dashboard's
 * usual 32px inset, 16px between the stat cards, and 16px between the three
 * stacked blocks.
 *
 * The heading carries an explicit `font-bold` for the reason
 * `platform-overview.tsx` gives: `globals.css` sets every `h1` to 800 and the
 * dashboard exports draw 700.
 *
 * Unlike Platform Overview this page has a lead paragraph under the title and
 * no "Admin mode" badge — the badge belongs to the console's landing page,
 * where it explains which mode you are in; repeating it on every console page
 * would be noise.
 */
async function ReportsPage() {
  const [stats, revenue, runs] = await Promise.all([
    getReportStats(),
    getRevenueByMonth(),
    getPayoutRuns(),
  ])

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <h1 className="text-[32px] leading-none font-bold">
        {adminReportsCopy.title}
      </h1>
      <p className="mt-2.5 text-[15px] text-muted-foreground">
        {adminReportsCopy.description}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <ReportsStatsRow stats={stats} />
        <RevenueChartCard series={revenue} />
        <PayoutRunsCard runs={runs} />
      </div>
    </main>
  )
}

export { ReportsPage }
