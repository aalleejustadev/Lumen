import type { ReportReason } from "@/lib/generated/prisma/client"

/**
 * Everything `/dashboard/admin/reviews` *says*, and nothing it counts — the
 * same split every other console page makes.
 *
 * It also carries the page size and the pill vocabulary, for the mechanical
 * reason `admin-users.ts` and `admin-courses.ts` both record: the list is a
 * Client Component and needs them, and importing any *value* from
 * `lib/admin/reviews.ts` would drag `lib/db` and the Postgres driver into the
 * browser bundle. This module imports nothing but a type, so it crosses
 * freely.
 */

/**
 * The export draws three cards, which is the whole open queue today. Eight is
 * a page of a queue that grew — see the pager note in
 * `reported-reviews-list.tsx` for why there is one at all.
 */
export const REPORTED_REVIEWS_PAGE_SIZE = 8

export const adminReviewsCopy = {
  title: "Reported reviews",
  description:
    "Reviews are never removed for being critical — only for breaking the guidelines.",
  /** The four decisions on a card, left to right, then the trailing one. */
  remove: "Remove review",
  keep: "Keep & dismiss",
  hide: "Hide pending appeal",
  suspend: "Suspend reviewer",
  message: "Message author",
  /** Shown in place of Suspend once the account already is — see the card. */
  suspendUnavailable: "This account is already suspended.",
  /** "on Mastering Illustration" — the course the review sits under. */
  on: (course: string) => `on ${course}`,
  emptyTitle: "Nothing to moderate",
  emptyDescription:
    "No review has an open report against it. Reports filed by instructors and learners land here.",
  /** The line under the list, the shape the sibling console lists use. */
  showing: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total} reported ${
      total === 1 ? "review" : "reviews"
    }`,
} as const

export type ReasonBadge = { label: string; className: string }

/**
 * The pill beside the course name.
 *
 * The export draws three of the five reasons — "Spam / promotional link",
 * "Abusive language", "Contains spoilers" — and draws all three in the **same**
 * red, so the pill says *what* was reported rather than how bad it is. The
 * other two keep that treatment: a reported review is a reported review, and a
 * second tint one shade off would read as a rendering bug rather than as a
 * distinction (the point `courseStatusBadge` makes about Inactive and
 * Suspended sharing a red).
 *
 * The tint is `bg-destructive/10 text-destructive` rather than the export's
 * literal `#fbe8e7` / `#dd514c`, so dark mode follows — the choice
 * `billing-transactions.tsx` documents and every console pill since has kept.
 *
 * Geometry is `courseStatusBadge`'s exactly: both exports draw the pill at
 * 20px tall, measured, so it is one vocabulary rather than two.
 */
export function reportReasonBadge(reason: ReportReason): ReasonBadge {
  const className = "bg-destructive/10 text-destructive"
  switch (reason) {
    case "SPAM":
      return { label: "Spam / promotional link", className }
    case "ABUSIVE":
      return { label: "Abusive language", className }
    case "SPOILERS":
      return { label: "Contains spoilers", className }
    case "COPYRIGHT":
      // The wording `changeReasonOptions` already uses for the same idea, so
      // the two console surfaces name it the same way.
      return { label: "Copyright concern", className }
    default:
      return { label: "Other", className }
  }
}
