import { format, formatDistanceToNowStrict } from "date-fns"

const DAY = 24 * 60 * 60 * 1000

/**
 * The meta line's third item: "Submitted Yesterday", "Submitted 2 days ago",
 * "Submitted 1 month ago" — the shapes `courses-page__admin.png` draws.
 *
 * "Yesterday" is the special case, exactly as in `audit-format.ts`:
 * `formatDistanceToNowStrict` returns "1 day ago" and the export says
 * "Yesterday". The two modules keep their own copy of that rule rather than
 * sharing one, because they are formatting different sentences — this one
 * carries the word "Submitted" and its caller has no other use for a bare
 * relative time.
 *
 * **Called on the server**, and the result travels as a string, for the two
 * reasons `audit-format.ts` records: it keeps `date-fns` out of the client
 * bundle, and a relative timestamp computed on both sides of the boundary is a
 * hydration mismatch waiting for a row to sit on a minute boundary.
 *
 * Null for a course that was never submitted — an ARCHIVED row that predates
 * submissions — which renders as no third item at all rather than "Submitted
 * never".
 */
export function formatSubmittedAt(date: Date | null, now: Date): string | null {
  if (!date) return null
  const elapsed = now.getTime() - date.getTime()
  if (elapsed >= DAY && elapsed < 2 * DAY) return "Submitted Yesterday"
  return `Submitted ${formatDistanceToNowStrict(date, { addSuffix: true })}`
}

/** The exact instant, for a row's tooltip. */
export function formatSubmittedExact(date: Date) {
  return format(date, "d MMM yyyy 'at' HH:mm")
}
