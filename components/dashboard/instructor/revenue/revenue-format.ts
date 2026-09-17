/**
 * How the money on `/dashboard/instructor/revenue` is written out. Kept beside
 * the components rather than in `lib/`, the way `stat-format.ts`,
 * `courses-format.ts` and `payouts-format.ts` are: this is how a value is
 * *written*, not what it is.
 *
 * **The export draws money two ways, and both are here.** The cards and the
 * per-course list drop the cents when there are none — "$142,680", "$6,180",
 * but "$4,820.40" and "$14.20" — while the payout table writes them always
 * ("$16,120.00"). That is the right split rather than a slip: a headline is
 * read at a glance and a disbursement is reconciled against a bank statement.
 *
 * The adaptive one lives in `stat-format.ts` rather than here, because the
 * shared `StatCard` needs it for this page's four tiles — it is re-exported so
 * this page's own components have one place to reach for.
 */

export { formatMoney } from "@/components/dashboard/stat-format"

const exact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const compact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

/** "$16,120.00" — always two places, for the payout table. */
export function formatMoneyExact(cents: number): string {
  return exact.format(cents / 100)
}

/**
 * "$9.2k", "$22.1k" — the chart's value labels, in the export's own spelling.
 * `Intl` writes both suffixes in caps and the export lower-cases the thousands
 * one, so that single letter is patched rather than the number being built by
 * hand — the trick `revenue-chart-card.tsx` records for the console's chart.
 */
export function formatMoneyCompact(cents: number): string {
  return compact.format(cents / 100).replace(/K$/, "k")
}
