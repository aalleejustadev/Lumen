/**
 * Number formatting for `my-courses-page.png`, kept beside the components that
 * draw it — presentation, the way `settings-controls.ts` and
 * `stat-format.ts` are.
 *
 * All three are `en-US` explicitly rather than the runtime's locale: these
 * strings are rendered on the server and hydrated in the browser, and a server
 * in one locale and a browser in another would disagree about "12,480" and
 * trip hydration. It is the same reason `countries.ts` resolves its names on
 * the server and sends strings.
 */

const count = new Intl.NumberFormat("en-US")

/** "12,480" — the students column, and the Students tile. */
export function formatCount(value: number): string {
  return count.format(value)
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

/**
 * "$18,240" — whole dollars, which is what the export draws. A course's
 * lifetime earnings to the cent is a figure for Revenue & Payouts, not for a
 * chip in a meta line.
 */
export function formatMoneyWhole(cents: number): string {
  return money.format(Math.round(cents / 100))
}

/** "4.9" — one decimal always, so 5 does not render as a bare "5". */
export function formatRating(rating: number): string {
  return rating.toFixed(1)
}
