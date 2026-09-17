import Link from "next/link"
import { CalendarIcon, CreditCardIcon, SettingsIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatMoney } from "@/components/dashboard/instructor/revenue/revenue-format"
import {
  methodTitle,
  ordinal,
} from "@/components/dashboard/instructor/settings/payouts-format"
import { revenueCopy } from "@/lib/config/instructor-revenue"
import type { PayoutMethodView } from "@/lib/instructor-payouts"

/**
 * The left half of the top row on
 * `ui-design/light/dashboard/instructor/revenue-page.png`: the cleared
 * balance, when it next goes out, the way to change that, and where it is
 * going.
 *
 * Measured off that export at DPR 2: a **26px**-inset card, a 15px muted
 * label over a **50px/800** figure, a 16px calendar glyph beside the
 * next-payout line, a **163 x 40** primary button, then a full-width **68px**
 * row filled with `--background` holding a **38px** `--hover` tile, the
 * method's own title over its schedule line, and a 62.5 x 22 outlined
 * **Primary** pill at the trailing edge.
 *
 * The row takes the *page* colour on a white card, which is the trick
 * `settings-controls.ts` records for its own fields: there is no border in the
 * export, the fill is what separates the row from the card.
 *
 * Four things about it are decisions rather than markup:
 *
 *  - **The title is `methodTitle`, imported rather than rewritten.** "Bank
 *    transfer · ••••4471" is exactly what the payout settings page draws for
 *    the same row, and two spellings of one destination on two screens is how
 *    somebody ends up unsure which account the money is going to.
 *  - **The second line is *not* `methodDescription`.** That one identifies the
 *    method ("Monzo · USD · added Mar 2021"), which is what a settings list
 *    needs; here the question is when it next runs, so the line is the
 *    schedule — and the day comes from `Instructor.payoutDayOfMonth`, the
 *    column the settings page's Schedule row and the Help Center's payout
 *    answers both read.
 *  - **The Primary pill is an outline, not a fill.** Sampled, the export draws
 *    `--accent-2` text inside a `--accent-2` border over the row's own ground,
 *    which is a different weight from the filled status pills further down the
 *    page — and right, because it labels rather than reports.
 *  - **No method is a real state**, not an empty card: `PayoutMethod` is
 *    written only by the settings page, so a fresh instructor has none. The
 *    row says so and the button beside it is already the way to fix it.
 */
function BalanceCard({
  availableCents,
  nextPayoutOn,
  method,
  payoutDayOfMonth,
}: {
  availableCents: number
  /** Already written, or null when there is nothing to send. */
  nextPayoutOn: string | null
  method: PayoutMethodView | null
  payoutDayOfMonth: number
}) {
  return (
    <Card className="gap-0 p-6.5 ring-border [--card-spacing:0px]">
      <p className="text-[15px] text-muted-foreground">
        {revenueCopy.availableLabel}
      </p>
      {/* `.stat-figure` is the app's own 800-weight tabular treatment; 50px is
          the export's, measured off the digit cap. */}
      <p className="stat-figure mt-2 text-[50px]">
        {formatMoney(availableCents)}
      </p>

      <p className="mt-4 flex flex-wrap items-center gap-2 text-[15px]">
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        {revenueCopy.nextPayout}
        <span className="text-muted-foreground">
          {nextPayoutOn ?? revenueCopy.nextPayoutIdle}
        </span>
      </p>

      <Button
        nativeButton={false}
        render={<Link href="/dashboard/instructor/settings/payouts" />}
        className="mt-5 h-10 w-fit gap-2 px-5"
      >
        <SettingsIcon className="size-4" />
        {revenueCopy.payoutSettings}
      </Button>

      <div className="mt-5.5 flex min-h-[68px] items-center gap-4 rounded-xl bg-background px-4 dark:bg-background">
        <div className="grid size-9.5 shrink-0 place-items-center rounded-lg bg-hover">
          <CreditCardIcon className="size-4.5 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">
            {method === null ? revenueCopy.noMethodTitle : methodTitle(method)}
          </p>
          <p className="truncate text-[14px] text-muted-foreground">
            {method === null
              ? revenueCopy.noMethodDescription
              : revenueCopy.methodSchedule(ordinal(payoutDayOfMonth))}
          </p>
        </div>

        {method === null ? null : (
          <span className="shrink-0 rounded-full border border-accent-2 px-2.5 py-0.5 text-[13px] leading-[16px] font-medium text-accent-2">
            {revenueCopy.primary}
          </span>
        )}
      </div>
    </Card>
  )
}

export { BalanceCard }
