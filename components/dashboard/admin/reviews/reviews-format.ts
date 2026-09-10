import { format, formatDistanceStrict } from "date-fns"

/**
 * The timestamp at the trailing edge of a card: "4 hours ago", "1 day ago",
 * "2 days ago" — the three shapes `reported-reviews__admin.png` draws.
 *
 * **There is no "Yesterday" case here**, which is the one thing worth knowing:
 * `audit-format.ts` and `courses-format.ts` both special-case it because their
 * exports say "Yesterday" where date-fns says "1 day ago". This export says
 * **"1 day ago"**, so the plain function is already right and adding the rule
 * those two modules share would break the match.
 *
 * It is `formatDistanceStrict` against an explicit `now` rather than the
 * `…ToNowStrict` variant its two siblings use: those read the clock
 * themselves, and this one has to measure every card against the page's single
 * `generatedAt`.
 *
 * **Called on the server**, and the result travels to the card as a string,
 * for the two reasons `audit-format.ts` records: it keeps `date-fns` out of
 * the client bundle, and a relative timestamp computed on both sides of the
 * boundary is a hydration mismatch waiting for a card to sit on a minute
 * boundary. Every card is measured against the single
 * `ReportedReviewsPage.generatedAt` clock the read returns.
 */
export function formatReportedAt(date: Date, now: Date) {
  return formatDistanceStrict(date, now, { addSuffix: true })
}

/** The exact instant, for the timestamp's tooltip. */
export function formatReportedExact(date: Date) {
  return format(date, "d MMM yyyy 'at' HH:mm")
}
