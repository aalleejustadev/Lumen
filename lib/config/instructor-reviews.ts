import { reportReasonBadge } from "@/lib/config/admin-reviews"
import type { ReportReason } from "@/lib/generated/prisma/client"
import type { ReviewsQuery } from "@/lib/instructor-reviews"

/**
 * Every word `/dashboard/instructor/reviews` *says*, and nothing it counts —
 * the split every surface in this codebase makes: the figures come out of
 * `lib/instructor-reviews.ts`, the phrasing around them lives here.
 *
 * It also carries the page size, the tab vocabulary and the client-safe
 * helpers, for the mechanical reason `instructor-students.ts` records: the
 * board is a Client Component and needs all three, and importing any *value*
 * from `lib/instructor-reviews.ts` would drag `lib/db` and the Postgres driver
 * into the browser bundle. This module imports one value from a sibling config
 * and otherwise only types, so it crosses freely.
 *
 * It holds **data, never components** — a lucide icon in here is the trap
 * `lib/config/messages.ts` paid for.
 */

/** Four cards a page — the export's own footer says "Showing 1–4 of 9
 *  reviews" over a three-page pager. */
export const REVIEWS_PAGE_SIZE = 4

/** A reply is a paragraph or two under somebody's review, not an essay. */
export const REVIEW_REPLY_MAX = 2000

/** The optional note on a report, the length `admin-courses.ts` gives its
 *  own. */
export const REPORT_NOTE_MAX = 1000

/** How many courses the "Rating by course" card lists. The export draws five;
 *  the card is a summary beside a filter, not a second list of everything. */
export const RATING_BY_COURSE_LIMIT = 5

/**
 * The window the summary card's "+0.2 vs last quarter" is measured over.
 *
 * Ninety days rather than a calendar quarter, so the figure means the same
 * thing on 1 April as on 30 June — the console's own deltas are all trailing
 * windows for that reason.
 */
export const RATING_TREND_DAYS = 90

/** What the writes revalidate — the instructor shell's layout, so the manage
 *  page's "N new" Reviews badge moves without a navigation. The reason
 *  `QA_LAYOUT_PATH` records. */
export const REVIEWS_LAYOUT_PATH = "/dashboard/instructor"

export const reviewsCopy = {
  title: "Reviews",
  description:
    "What learners say about your teaching, across every course you own.",
  allCourses: "All courses",
  reset: "Reset",
  /** On the Reset button when nothing narrows the list. The export draws the
   *  button in exactly that state, so it is drawn and inert rather than
   *  hidden — the treatment `user-row-actions.tsx` gives a control with
   *  nowhere to go. */
  resetUnavailable: "Nothing is filtered yet.",
  byCourse: "Rating by course",
  /** The line above the breakdown bars. */
  summary: (reviews: number, courses: number) =>
    `Instructor rating · ${reviews.toLocaleString("en-US")} ${
      reviews === 1 ? "review" : "reviews"
    } across ${courses.toLocaleString("en-US")} ${
      courses === 1 ? "course" : "courses"
    }`,
  /** "+0.2 vs last quarter" — the sign is part of the string because a
   *  negative number already carries its own. */
  trend: (delta: number) =>
    `${delta > 0 ? "+" : ""}${delta.toFixed(1)} vs last quarter`,
  reviewsOn: (count: number) =>
    `${count.toLocaleString("en-US")} ${count === 1 ? "review" : "reviews"}`,
  /** The star row is drawn with `aria-hidden` glyphs, so this is how the
   *  rating actually reaches a screen reader. */
  rated: (rating: number) => `Rated ${rating} out of 5`,
  reply: "Reply",
  replied: "You replied",
  report: "Report",
  /** On Report once the review already has an open report against it — the
   *  same inert-with-a-reason treatment Reset gets. It is *any* open report
   *  rather than only this instructor's: the queue already holds the review,
   *  so a second one adds a row to somebody's morning and nothing to the
   *  decision. */
  reportPending: "This review is already awaiting moderation.",
  instructor: "Instructor",
  showing: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total} ${total === 1 ? "review" : "reviews"}`,
  noMatches: "No review matches this filter.",
  empty: {
    title: "No reviews yet",
    description:
      "Every rating a learner leaves on one of your courses appears here, with the reply you gave it.",
  },
  noCourses: "Nothing has been rated yet.",
} as const

export const replyDialogCopy = {
  title: "Reply to this review",
  description: (name: string) =>
    `Your reply appears under ${name}'s review, on the course page and here. Everyone who can read the review can read it.`,
  placeholder: "Thanks for the detailed feedback — …",
  submit: "Post reply",
} as const

export const reportDialogCopy = {
  title: "Report this review",
  /** The page's own principle, said where it actually bites. The admin queue's
   *  lead promises the same thing to the other side of the decision, and the
   *  two must not say different things about one rule. */
  description:
    "A moderator reads every report. Reviews are never removed for being critical — only for breaking the guidelines.",
  reasonHeading: "What is wrong with it?",
  noteHeading: "Anything else? (optional)",
  notePlaceholder: "Add anything a moderator would need to know.",
  submit: "Send report",
} as const

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export type ReviewsTab = "all" | "5" | "4" | "3-below"

/**
 * The four segments, exactly as drawn.
 *
 * `stars` is a **number, not a glyph**: the pill draws a star icon after its
 * digit and this module may not hold components, so the board renders the
 * icon and this list says only whether there is one. `after` carries the last
 * segment's trailing "& below".
 */
export const reviewsTabs: {
  value: ReviewsTab
  label: string
  star: boolean
  after?: string
}[] = [
  { value: "all", label: "All ratings", star: false },
  { value: "5", label: "5", star: true },
  { value: "4", label: "4", star: true },
  { value: "3-below", label: "3", star: true, after: "& below" },
]

export const reviewsTabValues = new Set<string>(
  reviewsTabs.map((tab) => tab.value)
)

/** Whether anything narrows the list — what decides between the illustrated
 *  "no reviews yet" card, a "nothing matched" line, and whether **Reset** has
 *  anything to do. */
export function isReviewsFiltered(query: ReviewsQuery): boolean {
  return query.tab !== "all" || query.courseId !== null
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

/**
 * The reasons the report dialog offers.
 *
 * The labels are **`reportReasonBadge`'s own**, read rather than written out
 * again, so the pill the admin queue draws on a report is word for word what
 * the instructor picked. Two vocabularies for one enum is how a queue ends up
 * describing a report differently from the person who filed it — the call
 * `auditRoleBadge` already made about the role pill.
 */
export const reportReasonOptions: { value: ReportReason; label: string }[] = (
  ["SPAM", "ABUSIVE", "SPOILERS", "COPYRIGHT", "OTHER"] as const
).map((value) => ({ value, label: reportReasonBadge(value).label }))

export const reportReasonValues = new Set<string>(
  reportReasonOptions.map((option) => option.value)
)
