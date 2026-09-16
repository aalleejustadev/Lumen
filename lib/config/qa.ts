/**
 * Every word the instructor's Q&A pages say. Built to
 * `ui-design/light/dashboard/instructor/Q&A-page.png` and
 * `Q&A-page__individual.png`.
 *
 * Holds **data, never components** — it is imported by the server read and by
 * the client board, and a lucide icon in here is the trap
 * `lib/config/messages.ts` paid for.
 */

/** The export's three segments. `all` is the default, so it never reaches the
 *  URL. */
export type QaTab = "all" | "unanswered" | "answered"

export const qaTabs: { value: QaTab; label: string }[] = [
  { value: "all", label: "All questions" },
  { value: "unanswered", label: "Unanswered" },
  { value: "answered", label: "Answered" },
]

export const qaTabValues = new Set<string>(qaTabs.map((tab) => tab.value))

/** Rows per page. The export's footer reads "Showing 1–3 of 5 questions". */
export const QUESTIONS_PAGE_SIZE = 3

export const QA_REPLY_MAX = 4000
/** Replies loaded into a thread. A course question is a handful of replies,
 *  not a forum thread; add paging if that ever stops being true. */
export const QA_THREAD_REPLY_LIMIT = 100

/**
 * The two status pills, tinted from the semantic tokens rather than the
 * export's literal fills so dark mode follows — the rule
 * `settings-billing.tsx` records.
 *
 * **`answeredByInstructor` is what decides it**, not the reply count. A
 * question with six learner replies and no instructor answer is still
 * awaiting one, which is exactly what the column exists to say and what the
 * Unanswered tab filters on.
 */
export const qaStatusBadge = {
  answered: {
    label: "Answered by instructor",
    className: "bg-success/10 text-success",
  },
  awaiting: {
    label: "Awaiting reply",
    className: "bg-warning/10 text-warning",
  },
} as const

export const qaCopy = {
  title: "Q&A",
  description: "Questions from students enrolled in your courses.",
  allCourses: "All courses",
  votes: "votes",
  showing: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total} ${total === 1 ? "question" : "questions"}`,
  replies: (count: number) => `${count} ${count === 1 ? "reply" : "replies"}`,
  noMatches: "No questions match this filter.",
  empty: {
    title: "No questions yet",
    description:
      "When a student asks a question inside one of your lessons it will appear here.",
  },
} as const

export const qaThreadCopy = {
  back: "Back to all questions",
  repliesHeading: "Replies",
  asked: (age: string) => `Asked ${age}`,
  placeholder: "Write a reply...",
  submit: "Post reply",
  /** A question whose course the reader no longer teaches. */
  readOnly: "You no longer teach this course, so this thread is read-only.",
} as const

/** Where the surface lives. Read by the nav config and the actions'
 *  revalidation, so neither can invent a second spelling. */
export const QA_HREF = "/dashboard/instructor/qa"

/** What the writes revalidate — the shell layout, so the sidebar's Q&A badge
 *  moves without a navigation. The reason `messagesLayoutPath` records. */
export const QA_LAYOUT_PATH = "/dashboard/instructor"
