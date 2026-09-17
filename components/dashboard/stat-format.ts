/**
 * How a dashboard KPI figure is written out. Kept beside the components rather
 * than in `lib/`, the same way
 * `components/dashboard/settings/settings-controls.ts` keeps that section's
 * shared class vocabulary: this is presentation, and Platform Overview's cards
 * and table, the Reports page's cards and its revenue chart, and the
 * instructor's Analytics page all draw on it.
 *
 * It was `components/dashboard/admin/platform-format.ts` until the fourth
 * caller turned out to be in the *instructor* shell. It moved out for the
 * reason `count-card.tsx` and `course-art.tsx` both record in their own
 * notes — and which `manage-stats.tsx` had already complained about from the
 * other side: an instructor surface reaching into the console's directory
 * would tie it to a redesign of the console.
 *
 * It deliberately holds **no date formatting**: `date-fns` lives in
 * `attention-list.tsx`, the one place that needs it, so this module stays
 * importable from a Client Component (`revenue-chart-card.tsx` is one) without
 * pulling a date library into that bundle.
 */

/**
 * How the card's big number should be read, which decides its formatting.
 *
 * Structurally the same union as `PlatformStatFormat` in
 * `lib/config/admin-overview.ts`, which is what the console's own card lists
 * are typed with — TypeScript matches them by shape, so neither module has to
 * import the other and a `lib/config/*` file does not end up importing from
 * `components/`.
 */
export type StatFormat = "count" | "currency" | "money" | "percent" | "percent1"

const counts = new Intl.NumberFormat("en-US")

/**
 * Compact, which is what the export draws ("$1.24M"). Two fraction digits
 * rather than one because that is the precision it shows, and the same rule
 * has to hold at every magnitude or the card's number changes shape as the
 * platform grows.
 */
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
})

/**
 * A percentage to **at most one** decimal, which is what the Analytics export
 * draws: "88%" for completion and "72.5%" for watch time, on the same row.
 *
 * `percent` above keeps two decimals because Platform Overview's uptime card
 * needs them — "99.98%" and "100.00%" are different claims about a month — and
 * a rate an instructor reads at a glance does not. `maximumFractionDigits`
 * rather than `toFixed` is what drops the trailing zero, so 0.88 writes as
 * "88%" rather than "88.0%".
 */
const percent1 = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
})

const moneyWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})
const moneyCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

/**
 * "$142,680", "$4,820.40" — the full figure with cents **only when there are
 * some**, which is what the instructor's Revenue & Payouts export draws on
 * every card and in its per-course list.
 *
 * `currency` above stays compact ("$1.24M") because the console's Reports and
 * Platform Overview cards carry platform-wide totals, where the digits past
 * the second stop meaning anything. An instructor's own balance is a number
 * they reconcile against a bank statement, so it is written out.
 */
export function formatMoney(cents: number): string {
  return cents % 100 === 0
    ? moneyWhole.format(cents / 100)
    : moneyCents.format(cents / 100)
}

/** An em dash, not "0" — no data and none of it are different answers. */
const NO_VALUE = "—"

export function formatStatValue(value: number | null, as: StatFormat): string {
  if (value === null) return NO_VALUE
  switch (as) {
    case "currency":
      // Every money column in this app is minor units — see the `Order` note.
      return compactCurrency.format(value / 100)
    case "percent":
      return `${(value * 100).toFixed(2)}%`
    case "money":
      return formatMoney(value)
    case "percent1":
      return percent1.format(value)
    default:
      return counts.format(value)
  }
}

/**
 * The green figure beside the number. `null` when there is nothing to compare
 * against, which renders as no chip at all rather than a misleading +100%.
 *
 * A relative change and a difference in percentage points are both written as
 * a signed percentage here, because that is what the export draws for both;
 * which one a card carries is `platformStatCards`' `deltaFormat`, and the
 * reasoning is in `lib/admin/overview.ts`.
 */
export function formatDelta(delta: number | null): string | null {
  if (delta === null) return null
  const sign = delta < 0 ? "−" : "+"
  return `${sign}${Math.abs(delta * 100).toFixed(1)}%`
}

/**
 * The same chip written as a **count** rather than a percentage — "+2", "−1".
 *
 * The instructor Analytics export draws one of its four cards that way, and it
 * is right to: Open questions is a queue, and "+22%" on a backlog of nine says
 * less than "+2" does. `formatDelta` above stays the default because every
 * other card on every other page compares rates.
 */
export function formatCountDelta(delta: number | null): string | null {
  if (delta === null) return null
  const sign = delta < 0 ? "−" : "+"
  return `${sign}${Math.abs(delta)}`
}

export function deltaToneClass(delta: number | null): string {
  if (delta === null || delta === 0) return "text-muted-foreground"
  return delta > 0 ? "text-success" : "text-destructive"
}
