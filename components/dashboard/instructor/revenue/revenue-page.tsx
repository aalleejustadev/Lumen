import { WalletIcon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { BalanceCard } from "@/components/dashboard/instructor/revenue/balance-card"
import { EarningsByCourseCard } from "@/components/dashboard/instructor/revenue/earnings-by-course-card"
import { EarningsChartCard } from "@/components/dashboard/instructor/revenue/earnings-chart-card"
import { PayoutHistoryCard } from "@/components/dashboard/instructor/revenue/payout-history-card"
import { RevenueStats } from "@/components/dashboard/instructor/revenue/revenue-stats"
import { revenueCopy } from "@/lib/config/instructor-revenue"
import type { RevenuePage as RevenuePageData } from "@/lib/instructor-revenue"

/**
 * `/dashboard/instructor/revenue`, from
 * `ui-design/light/dashboard/instructor/revenue-page.png`.
 *
 * A **Server Component** with one client leaf, the recharts card — the
 * balance, the four tiles, the per-course list and the whole payout table are
 * rendered here and never shipped. The page has **no controls and no writes**:
 * everything that changes money lives on the payout settings page, which the
 * one button links to.
 *
 * Measured off that export at DPR 2: the instructor shell's usual page inset
 * over a full-width column, a header block **pixel-identical** to the four
 * instructor pages before it (so it is that header, reused rather than
 * re-measured) with nothing beside it; then a **0.9 : 1** top row — a 702px
 * balance card against a 772px chart on a 20px gap — a four-up KPI row of
 * 361px cards on an **18px** gap, and two full-width cards. Rows sit on a 20px
 * gap throughout.
 *
 * **The top row is `items-start`, not stretched.** Measured, the export's two
 * cards are 298px and 325px: the balance card hugs its content rather than
 * growing to the chart's height, which Grid's default `align-items: stretch`
 * would otherwise do — the same property the Analytics page's sources card
 * opts out of.
 *
 * **An instructor with no course at all gets the empty state**, rather than a
 * page of four zeroes, an empty chart, an empty list and an empty table. One
 * with courses but no sales still gets the page: each block says so in its own
 * words, and "nothing yet" is a real answer on a ledger.
 */
function RevenuePage({ page }: { page: RevenuePageData }) {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="min-w-0">
        {/* `font-bold` explicitly: `globals.css` sets every `h1` to 800 and
            the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
        <h1 className="text-[32px] leading-none font-bold">
          {revenueCopy.title}
        </h1>
        <p className="mt-2.5 text-[15px] text-muted-foreground">
          {revenueCopy.description}
        </p>
      </div>

      {page.hasCourses ? (
        <>
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[0.9fr_1fr]">
            <BalanceCard
              availableCents={page.availableCents}
              nextPayoutOn={page.nextPayoutOn}
              method={page.primaryMethod}
              payoutDayOfMonth={page.payoutDayOfMonth}
            />
            <EarningsChartCard series={page.series} />
          </div>

          <RevenueStats stats={page.stats} />

          <div className="mt-5">
            <EarningsByCourseCard
              rows={page.byCourse}
              totalCents={page.stats.thisMonthCents}
            />
          </div>

          <div className="mt-5">
            <PayoutHistoryCard rows={page.payouts} />
          </div>
        </>
      ) : (
        <Empty className="mt-6 rounded-xl bg-card py-16 ring-1 ring-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WalletIcon />
            </EmptyMedia>
            <EmptyTitle>{revenueCopy.empty.title}</EmptyTitle>
            <EmptyDescription>{revenueCopy.empty.description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </main>
  )
}

export { RevenuePage }
