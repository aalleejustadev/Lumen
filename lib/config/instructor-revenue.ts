import type { LucideIcon } from "lucide-react"
import {
  ClockIcon,
  CircleDollarSignIcon,
  TicketIcon,
  WalletIcon,
} from "lucide-react"

import type { PayoutStatus } from "@/lib/generated/prisma/client"

/**
 * Everything `/dashboard/instructor/revenue` *says*, and nothing it counts —
 * the split every surface in this codebase makes: the figures come out of
 * `lib/instructor-revenue.ts`, the phrasing around them lives here.
 *
 * It carries the icons for the same reason `instructor-analytics.ts` does, and
 * with the same caveat: `lib/config/messages.ts`' rule is about a *layout*
 * pulling `lucide-react` into its server graph transitively, and nothing in a
 * layout reaches this module — only the Revenue route and its own components.
 */

/** How many payouts the history table lists. The export draws five and has no
 *  pager; five is its sample size, not a designed cap — the reading
 *  `TRANSACTIONS_LIMIT` settled for the billing table, which is the same table
 *  seen from the platform's side. */
export const PAYOUT_HISTORY_LIMIT = 24

/** How many courses "Earnings by course" lists. The export draws five, and a
 *  bar chart of a whole catalogue would stop being a glance. */
export const EARNINGS_BY_COURSE_LIMIT = 8

/** Months in the "Earnings by month" chart — the export's own six columns, and
 *  the figure the console's revenue chart and the Analytics page both use. */
export const EARNING_MONTHS = 6

export const revenueCopy = {
  title: "Revenue & Payouts",
  description: "What you have earned, and when it reaches your account.",
  availableLabel: "Available for payout",
  nextPayout: "Next automatic payout",
  /** Shown in place of a date when there is nothing to send. A schedule with
   *  no balance behind it is a promise the platform would not keep. */
  nextPayoutIdle: "when your balance clears",
  payoutSettings: "Payout settings",
  primary: "Primary",
  /** The method row's second line. `payoutDayOfMonth` is the instructor's own
   *  column — the same one the settings page's Schedule row and the Help
   *  Center's payout answers read, so all three cannot disagree. */
  methodSchedule: (day: string) => `Default method · monthly on the ${day}`,
  noMethodTitle: "No payout destination yet",
  noMethodDescription: "Add one and your balance is sent automatically.",
  earningsHeading: "Earnings by month",
  earningsLead: (total: string, best: string | null) =>
    best === null ? `Total ${total}` : `Total ${total} · best month ${best}`,
  earningsEmpty: "No earnings in the last six months.",
  byCourseHeading: "Earnings by course",
  byCourseLead: (total: string) => `This month · ${total} total`,
  byCourseEmpty: "Nothing earned this month yet.",
  historyHeading: "Payout history",
  historyEmpty:
    "No payout has been sent yet. Your first arrives once your balance clears the minimum.",
  columns: {
    reference: "Reference",
    date: "Date",
    method: "Method",
    amount: "Amount",
    status: "Status",
  },
  empty: {
    title: "Nothing earned yet",
    description:
      "Publish a course and your sales, your cleared balance and every payout appear here.",
  },
} as const

/**
 * The four tiles under the top row, in the export's order.
 *
 * **None of them carries a delta chip.** The export draws the comparison as
 * the muted third line instead ("+12.4% vs last month", "since Mar 2021"), so
 * the shared `StatCard` is given a `footnote` and no `delta` — which is the
 * whole reason that prop is optional rather than something the tile decides.
 */
export const revenueStatCards: {
  key: "lifetime" | "thisMonth" | "pending" | "perSale"
  label: string
  icon: LucideIcon
}[] = [
  { key: "lifetime", label: "Lifetime earnings", icon: WalletIcon },
  { key: "thisMonth", label: "This month", icon: CircleDollarSignIcon },
  { key: "pending", label: "Pending clearance", icon: ClockIcon },
  { key: "perSale", label: "Avg. per sale", icon: TicketIcon },
]

export const revenueFootnotes = {
  /** "since Mar 2021" — when the first earning landed, not when the account
   *  was made: a ledger starts at its first row. */
  lifetime: (since: string | null) =>
    since === null ? "no earnings yet" : `since ${since}`,
  /** "+12.4% vs last month". Null when last month earned nothing, which would
   *  otherwise read as a misleading +100%. */
  thisMonth: (delta: string | null) =>
    delta === null ? "vs last month" : `${delta} vs last month`,
  /** "clears within 30 days" — **derived from the rows**, not written down.
   *  `InstructorEarning.clearsAt` is what decides it, and a number typed into
   *  copy would be a second source of truth free to drift from the ledger, the
   *  point `instructor-help.ts` records about quoting rules rather than
   *  restating them. */
  pending: (days: number | null) =>
    days === null
      ? "nothing pending"
      : `clears within ${days} ${days === 1 ? "day" : "days"}`,
  perSale: "after platform share",
} as const

/**
 * The status pill in the payout table.
 *
 * Sampled off the export: the Paid pill is `--success` at a tenth over white
 * and Failed is `--destructive`, which is the tint-over-token vocabulary
 * every other pill in this app uses — the tokens rather than the drawn hexes
 * so dark mode follows, the choice `billing-transactions.tsx` documents.
 *
 * `PENDING` is the third member of `PayoutStatus` and the export never draws
 * it, because it only exists between a run being scheduled and the transfer
 * settling. It takes `--warning`, the token the Users table's own Pending
 * already uses.
 */
export const payoutStatusBadge: Record<
  PayoutStatus,
  { label: string; className: string }
> = {
  PAID: { label: "Paid", className: "bg-success/10 text-success" },
  FAILED: { label: "Failed", className: "bg-destructive/10 text-destructive" },
  PENDING: { label: "In transit", className: "bg-warning/10 text-warning" },
}
