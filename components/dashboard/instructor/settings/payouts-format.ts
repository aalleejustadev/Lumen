import type { PayoutMethodView } from "@/lib/instructor-payouts"

/**
 * Presentation for the payout settings card — the strings the export draws,
 * built from real rows. Kept beside the components that use them rather than
 * in `lib/`, the way `stat-format.ts` and `courses-format.ts` are: this is
 * how a value is *written*, not what it is.
 */

/** Cents to "$100" — whole dollars, since a payout minimum always is one. */
export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th", 22 → "22nd". */
export function ordinal(day: number): string {
  const rem100 = day % 100
  if (rem100 >= 11 && rem100 <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

/**
 * The row's first line: "Bank transfer · ••••4471", "PayPal · ada@lumen.co".
 *
 * The bullets are literal U+2022s rather than a masked input, because there is
 * nothing to mask — only the last four digits are ever stored. See the schema
 * note on `PayoutMethod.last4`.
 */
export function methodTitle(method: PayoutMethodView): string {
  if (method.type === "PAYPAL") return `PayPal · ${method.label}`
  return method.last4 ? `Bank transfer · ••••${method.last4}` : "Bank transfer"
}

/**
 * The row's second line. **The export draws a different shape per type**, and
 * that is reproduced rather than flattened into one: a bank account is
 * identified by its institution and the currency it settles in, where a PayPal
 * address is already its own identifier and what you need to know instead is
 * whether it is verified.
 *
 * "Verified" is `PayoutMethod.verifiedAt`, which nothing sets today — there is
 * no Connect integration to verify against — so a method added through this
 * page reads "Not verified" until one lands. Saying so is the point; a row
 * that claimed verification nothing performed would be the one lie worth
 * avoiding on a page about where money goes.
 */
export function methodDescription(method: PayoutMethodView): string {
  const role =
    method.role === "PRIMARY" ? "primary destination" : "used as fallback"

  if (method.type === "PAYPAL") {
    return [method.verified ? "Verified" : "Not verified", role].join(" · ")
  }

  return [
    method.label,
    method.currency.toUpperCase(),
    `added ${method.addedOn}`,
  ].join(" · ")
}
