import type {
  PromotionDiscountType,
  PromotionScope,
} from "@/lib/generated/prisma/client"

/**
 * The number, money and date strings `/dashboard/admin/promotions` draws.
 *
 * Presentation, kept beside the components that render it the way
 * `platform-format.ts`, `courses-format.ts` and `reviews-format.ts` are — and
 * like `platform-format.ts` since Reports, it carries **no date library**: the
 * board is a Client Component and importing this module must not pull
 * `date-fns` into its bundle. `Intl` is already in every runtime.
 */

const counts = new Intl.NumberFormat("en-US")

export function formatCount(value: number) {
  return counts.format(value)
}

/**
 * The export's money: `$184k`, `$91k`, `$302k`.
 *
 * Compact on purpose — these are totals in a tile and a table cell, where the
 * dollar is noise. Below $1,000 it stays exact, because "$0k" would be a
 * rendering bug; a millions figure keeps one decimal so `$1.2M` and `$1.9M`
 * stay distinguishable.
 */
export function compactMoney(cents: number) {
  const dollars = Math.round(cents / 100)
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  }
  if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}k`
  return `$${counts.format(dollars)}`
}

/** `70% off` / `$9.99 flat` — the export's two spellings of `Promotion.value`. */
export function discountLabel(
  discountType: PromotionDiscountType,
  value: number
) {
  if (discountType === "PERCENT") return `${value}% off`
  return `$${(value / 100).toFixed(2)} flat`
}

/**
 * `All categories` for an ALL_COURSES promotion, the category names otherwise.
 *
 * The enum member is `ALL_COURSES` and the export writes **"All categories"**;
 * the export's wording wins, because it reads beside `Development` and
 * `Design` in the same column and the column's header is *Scope*.
 */
export function scopeLabel(scope: PromotionScope, categoryNames: string[]) {
  if (scope === "ALL_COURSES" || categoryNames.length === 0) {
    return "All categories"
  }
  if (categoryNames.length <= 2) return categoryNames.join(" · ")
  return `${categoryNames.slice(0, 2).join(" · ")} +${
    categoryNames.length - 2
  } more`
}

/**
 * `31 Aug 2026`, the export's own date format.
 *
 * **Call this on the server only.** It is pure, but a timestamp formatted in
 * the browser's zone and again in the server's can land on different days, and
 * the string then differs between the two renders — the hydration mismatch
 * `audit-format.ts` records. Every caller here formats in a Server Component
 * and passes the result down as a string.
 */
export function formatPromotionDay(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

/** `yyyy-MM-dd`, the shape the dialog's two date fields cross the boundary in. */
export function toDayValue(date: Date) {
  return date.toISOString().slice(0, 10)
}
