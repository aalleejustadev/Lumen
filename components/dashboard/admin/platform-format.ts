import { format, formatDistanceToNowStrict } from "date-fns"

import type {
  PlatformStatFormat,
  SubtitleFormatters,
} from "@/lib/config/admin-overview"

/**
 * How `/dashboard/admin`'s figures are written out. Kept beside the
 * components rather than in `lib/`, the same way
 * `components/dashboard/settings/settings-controls.ts` keeps that section's
 * shared class vocabulary: this is presentation, and both stat cards and the
 * top-courses table draw on it.
 */

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

/** An em dash, not "0" — no data and none of it are different answers. */
const NO_VALUE = "—"

export function formatStatValue(
  value: number | null,
  as: PlatformStatFormat
): string {
  if (value === null) return NO_VALUE
  switch (as) {
    case "currency":
      // Every money column in this app is minor units — see the `Order` note.
      return compactCurrency.format(value / 100)
    case "percent":
      return `${(value * 100).toFixed(2)}%`
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

export function deltaToneClass(delta: number | null): string {
  if (delta === null || delta === 0) return "text-muted-foreground"
  return delta > 0 ? "text-success" : "text-destructive"
}

/** The two shapes `attentionQueues`' `subtitle` formatters ask for. */
export const subtitleFormatters: SubtitleFormatters = {
  relative: (date) => formatDistanceToNowStrict(date, { addSuffix: true }),
  shortDate: (date) => format(date, "dd MMM"),
}
