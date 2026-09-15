/**
 * Every word the Messages page says, plus the handful of limits both halves of
 * it agree on. Built to
 * `ui-design/light/dashboard/instructor/messages-page.png` and its learner twin
 * `ui-design/light/dashboard/student/messages-page.png` — **the same drawing at
 * two sets of copy**, measured landmark for landmark and identical on every
 * one, so the surface is one component with an `audience` the way the
 * notification feed is.
 *
 * This module holds no `lib/db` import on purpose: the conversation list and
 * the composer are Client Components and need the copy, and `lib/messages.ts`
 * drags the Postgres driver. Same split `lib/config/notification-feed.ts`
 * makes against `lib/notification-feed.ts`, and the same one
 * `lib/config/admin-users.ts` records the reason for.
 */

/**
 * Which side of a conversation you are standing on.
 *
 * Deliberately **not** a column on `Conversation`. A thread already carries
 * `courseId`, and the course already carries its instructor — so who is the
 * teacher and who is the student is a fact the rows answer, and an audience
 * column would be a second answer free to disagree with it. What the audience
 * selects is the *view*: `/dashboard/messages` shows the threads about courses
 * you are enrolled in, `/dashboard/instructor/messages` the threads about
 * courses you teach. One account is routinely both — an instructor enrolled in
 * somebody else's course — and this is what keeps those two inboxes apart.
 */
export type MessageAudience = "LEARNER" | "INSTRUCTOR"

/** Conversations fetched for the list. An inbox is naturally bounded and the
 *  export draws a plain scrolling column with no pager, so this is a ceiling
 *  rather than a page size. */
export const CONVERSATION_LIMIT = 50

/** Messages loaded into an open thread — the newest N, which is what a chat
 *  opens on. Older ones are not lost, only unfetched; add a "load earlier"
 *  control if a thread ever outgrows it. */
export const THREAD_MESSAGE_LIMIT = 100

/** Matches `Message.body`'s practical ceiling. Enforced server-side too — a
 *  Server Action is a public endpoint. */
export const MESSAGE_MAX = 4000

/** Caps a hand-edited `?q=`, the way `parseFeedQuery` caps the feed's. */
export const MESSAGE_SEARCH_MAX = 100

/**
 * How long after a session was last refreshed somebody still counts as
 * present.
 *
 * The green dot on the export's avatars is the only thing on the page with no
 * table behind it, and `Session` is the nearest honest answer the platform has
 * — Better Auth refreshes a live session's `updatedAt` daily, which is exactly
 * why `/dashboard/admin/users` reads it for "Active this week". So the dot
 * means **active today**, and says so in its tooltip rather than claiming a
 * real-time presence nothing here implements.
 */
export const PRESENCE_WINDOW_HOURS = 24

export const messagesCopy = {
  title: "Messages",
  searchPlaceholder: "Search conversations",
  composerPlaceholder: "Type a message...",
  send: "Send message",
  /** The paperclip. Drawn by the export, inert here — see `message-thread.tsx`. */
  attach: "Attachments aren't available yet",
  newMessage: "New message",
  presence: "Active today",
  noMatches: "No conversations match that search.",
} as const

export const messagesLead: Record<MessageAudience, string> = {
  LEARNER: "Ask your instructors about the courses you're enrolled in.",
  INSTRUCTOR: "Answer the students enrolled in the courses you teach.",
}

/**
 * The word under the name in the conversation header — and, when a thread is
 * open, the first half of the page's own lead, because that is what both
 * exports draw there.
 *
 * It names the person you are talking *to*, not yourself: the instructor's
 * export reads "Student · Mastering Illustration" and the learner's
 * "Instructor · Mastering Illustration" over the same layout.
 */
export const counterpartRole: Record<MessageAudience, string> = {
  LEARNER: "Instructor",
  INSTRUCTOR: "Student",
}

/** The empty inbox, and the empty result of a search. */
export const messagesEmpty: Record<
  MessageAudience,
  { title: string; description: string }
> = {
  LEARNER: {
    title: "No conversations yet",
    description:
      "Start one with the instructor of any course you're enrolled in.",
  },
  INSTRUCTOR: {
    title: "No conversations yet",
    description: "Start one with any student enrolled in a course you teach.",
  },
}

/**
 * The New-message dialog, whose list of people **is** the messaging rule made
 * visible — see `resolvePairing` in `lib/messages.ts`.
 */
export const newMessageCopy: Record<
  MessageAudience,
  { title: string; description: string; search: string; empty: string }
> = {
  LEARNER: {
    title: "Message an instructor",
    description:
      "You can write to the instructor of any course you're enrolled in.",
    search: "Search instructors and courses",
    empty: "Enrol in a course and its instructor will appear here.",
  },
  INSTRUCTOR: {
    title: "Message a student",
    description: "You can write to any student enrolled in a course you teach.",
    search: "Search students and courses",
    empty: "Students appear here once they enrol in one of your courses.",
  },
}

/** Where each mode's inbox lives. Read by the nav configs and the New-message
 *  dialog, so neither can invent a second spelling. */
export const messagesHref: Record<MessageAudience, string> = {
  LEARNER: "/dashboard/messages",
  INSTRUCTOR: "/dashboard/instructor/messages",
}

/**
 * What the write actions revalidate — the mode's **shell layout**, not the
 * inbox page.
 *
 * Two reasons, and the second is the one worth writing down. The unread badge
 * beside the sidebar's Messages row is chrome rendered by that layout, so a
 * sent or opened message has to move it without a navigation — the mechanism
 * the cart badge uses. And `revalidatePath`'s second argument is the *kind* of
 * path it was given: every other caller in this codebase pairs `"layout"` with
 * a real layout segment (`/dashboard`, `/dashboard/admin`, `/`), and handing
 * it a leaf page path instead would be describing the route tree wrongly.
 */
export const messagesLayoutPath: Record<MessageAudience, string> = {
  LEARNER: "/dashboard",
  INSTRUCTOR: "/dashboard/instructor",
}

/**
 * Why a thread can be open but not writable.
 *
 * Enrolment is what authorises a pair to talk, and enrolment can end — a
 * refund revokes it. History is never destroyed for that (the audit-log
 * principle: a row has to still resolve later), so the thread stays readable
 * and the composer goes inert with the reason on it.
 */
export const closedThreadReason: Record<MessageAudience, string> = {
  LEARNER:
    "You're no longer enrolled in this course, so this conversation is read-only.",
  INSTRUCTOR:
    "This student is no longer enrolled in the course, so this conversation is read-only.",
}
