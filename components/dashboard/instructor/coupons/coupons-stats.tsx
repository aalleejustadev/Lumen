import {
  BanknoteIcon,
  PercentIcon,
  TicketPercentIcon,
  UsersIcon,
} from "lucide-react"

import { CountCard } from "@/components/dashboard/count-card"
import {
  formatCount,
  formatMoneyWhole,
} from "@/components/dashboard/instructor/coupons/coupons-format"
import { couponStats } from "@/lib/config/instructor-coupons"
import type { CouponsPage } from "@/lib/instructor-coupons"

/**
 * The four-up KPI row at the top of `coupons-page__main.png`.
 *
 * A **Server Component**, handed to `coupons-board.tsx` as `children` so a row
 * of markup and its four icons never reach the bundle — the arrangement
 * `community-page.tsx` records for its own stats row.
 *
 * The tile is `CountCard`, whose geometry this export draws identically to the
 * two console ones it was built for; see that file. The figures describe the
 * whole coupon programme and ignore the tabs and the course filter, for the
 * reason `lib/instructor-coupons.ts` gives.
 *
 * **"Avg. discount given" shows an em dash, not 0%, before anything has been
 * redeemed.** There is no average of nothing, and a zero there would read as a
 * discount somebody measured.
 */
function CouponsStats({ stats }: { stats: CouponsPage["stats"] }) {
  return (
    <>
      <CountCard
        icon={TicketPercentIcon}
        value={formatCount(stats.activeCount)}
        label={couponStats.active}
      />
      <CountCard
        icon={UsersIcon}
        value={formatCount(stats.redemptions)}
        label={couponStats.redemptions}
      />
      <CountCard
        icon={BanknoteIcon}
        value={formatMoneyWhole(stats.revenueCents)}
        label={couponStats.revenue}
      />
      <CountCard
        icon={PercentIcon}
        value={
          stats.averageDiscount === null ? "—" : `${stats.averageDiscount}%`
        }
        label={couponStats.averageDiscount}
      />
    </>
  )
}

export { CouponsStats }
