import { format, formatDistanceToNowStrict } from "date-fns"

const DAY = 24 * 60 * 60 * 1000

/**
 * The **When** column: "12 minutes ago", "1 hour ago", "Yesterday",
 * "2 days ago" — the four shapes the export draws.
 *
 * `formatDistanceToNowStrict` writes the first, second and fourth; the third
 * is the special case, because "1 day ago" is what the function returns and
 * "Yesterday" is what the export says.
 *
 * **Called on the server**, and the result travels to the table as a string.
 * That is deliberate twice over: it keeps `date-fns` out of the client bundle,
 * and it removes the hydration hazard a relative timestamp otherwise carries —
 * the server and the browser render at different instants, and a row sitting
 * on a minute boundary would produce two different strings for the same node.
 */
export function formatAuditWhen(date: Date, now = Date.now()) {
  const elapsed = now - date.getTime()
  if (elapsed >= DAY && elapsed < 2 * DAY) return "Yesterday"
  return formatDistanceToNowStrict(date, { addSuffix: true })
}

/** The exact instant, for the row's tooltip and its expanded detail. */
export function formatAuditExact(date: Date) {
  return format(date, "d MMM yyyy 'at' HH:mm:ss")
}
