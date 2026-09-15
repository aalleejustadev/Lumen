import { format } from "date-fns"

/**
 * Presentation for the Coupons table, kept beside the components that use it
 * the way `courses-format.ts` and `platform-format.ts` are.
 *
 * It holds **no `date-fns` relative formatting on purpose**: unlike the audit
 * log or the courses queue, every date this page draws is absolute ("Ends
 * 30 Sep 2026"), so there is no "now" to measure against and nothing to
 * hydrate differently on the two sides of the boundary.
 */

/** "$41,630" — the KPI card's whole-dollar figure, which is what the export
 *  draws on all four cards. */
export function formatMoneyWhole(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/** "$59.99" — the table's Price and Revenue cells keep their cents, because a
 *  coupon's whole point is the exact price a learner pays. */
export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

/** "1,149". */
export function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

/** "30 Sep 2026" — the export's own order, day first and no comma. */
export function formatCouponDate(date: Date) {
  return format(date, "dd MMM yyyy")
}

/**
 * The muted line under the redemption bar.
 *
 * Three states, because the export draws two of them and the third follows:
 * a scheduled coupon says when it *starts* (its FRIENDS25 row), a dated one
 * says when it ends, and one with no end date has nothing to promise — an
 * empty line beats inventing "Ends never".
 */
export function couponSchedule(
  startsAt: Date,
  endsAt: Date | null,
  now: Date
): string | null {
  if (startsAt > now) return `Starts ${formatCouponDate(startsAt)}`
  if (endsAt) return `Ends ${formatCouponDate(endsAt)}`
  return null
}

/** "212 / 500", or "212" where the coupon is unlimited — the bar has nothing
 *  to fill against in that case, so the counter carries the whole answer. */
export function formatRedemptions(used: number, limit: number | null) {
  return limit === null
    ? formatCount(used)
    : `${formatCount(used)} / ${formatCount(limit)}`
}

/** How full the bar is. An unlimited coupon draws an empty track rather than a
 *  full one: there is no denominator, so "how close to the limit" has no
 *  answer and a filled bar would be asserting one. */
export function redemptionFraction(used: number, limit: number | null) {
  if (!limit || limit <= 0) return 0
  return Math.min(1, used / limit)
}

/** The value a date input wants, from a Date — `yyyy-MM-dd`, which is also how
 *  it crosses back to the action. */
export function toDateInput(date: Date | null) {
  return date ? format(date, "yyyy-MM-dd") : ""
}
