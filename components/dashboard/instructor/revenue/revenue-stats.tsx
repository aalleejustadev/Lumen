import { StatCard } from "@/components/dashboard/stat-card"
import { formatDelta } from "@/components/dashboard/stat-format"
import {
  revenueFootnotes,
  revenueStatCards,
} from "@/lib/config/instructor-revenue"
import type { RevenueStats as Stats } from "@/lib/instructor-revenue"

/**
 * The four-up KPI row in the middle of `revenue-page.png`.
 *
 * A **Server Component**, so a row of markup and its four lucide icons never
 * reach the bundle — the arrangement every other instructor stat row uses.
 *
 * The tile is the shared `StatCard`, drawn here exactly as the Analytics page
 * draws it (a 20px inset, a 34px icon tile beside a 15px muted label, the
 * figure below, a muted footnote under that) with **one difference: no delta
 * chip.** This export carries the comparison in the footnote instead —
 * "+12.4% vs last month", "since Mar 2021", "clears within 30 days", "after
 * platform share" — so `delta` is null on all four and `footnote` does the
 * work. That is why the tile's delta was always optional.
 *
 * Two figures are **null rather than zero** before there is anything to say:
 * Avg. per sale until something has sold, which would otherwise read $0.00 and
 * sound like a catastrophe rather than an absence (the call
 * `coupons-stats.tsx` makes about its own average), and the month-on-month
 * change when last month earned nothing, which would be a misleading +100%.
 *
 * What each figure *means* is decided in `lib/instructor-revenue.ts`; this is
 * only what it is called and how it is drawn.
 */
function RevenueStats({ stats }: { stats: Stats }) {
  const values: Record<
    (typeof revenueStatCards)[number]["key"],
    { value: number | null; footnote: string }
  > = {
    lifetime: {
      value: stats.lifetimeCents,
      footnote: revenueFootnotes.lifetime(stats.since),
    },
    thisMonth: {
      value: stats.thisMonthCents,
      footnote: revenueFootnotes.thisMonth(formatDelta(stats.monthDelta)),
    },
    pending: {
      value: stats.pendingCents,
      footnote: revenueFootnotes.pending(stats.clearsInDays),
    },
    perSale: {
      value: stats.perSaleCents,
      footnote: revenueFootnotes.perSale,
    },
  }

  return (
    <div className="mt-5 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
      {revenueStatCards.map((card) => (
        <StatCard
          key={card.key}
          label={card.label}
          icon={card.icon}
          value={values[card.key].value}
          delta={null}
          format="money"
          footnote={values[card.key].footnote}
        />
      ))}
    </div>
  )
}

export { RevenueStats }
