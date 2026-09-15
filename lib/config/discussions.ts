import { userRoleBadge } from "@/lib/config/admin-users"

/**
 * Every word the Discussions pages say, plus the rules both halves agree on.
 * Built to `ui-design/light/dashboard/instructor/discussions-page.png` and
 * `ui-design/light/dashboard/student/discussions-page.png`.
 *
 * Holds **data, never components** — it is imported by the server read and by
 * three Client Components, and a lucide icon in here is the trap
 * `lib/config/messages.ts` paid for.
 */

/**
 * Which side of the community you are standing on.
 *
 * The two exports draw the **same feed** — the same five threads by the same
 * five authors — so the audience does not change which rows are fetched beyond
 * topic visibility. What it changes is what you may *do*: the instructor gets
 * the stat row, the moderation banner, Announce / New Discussion, the
 * All / Mine / Unanswered switch and a per-row menu; the learner gets a note
 * saying replies are their half of it.
 */
export type DiscussionAudience = "LEARNER" | "INSTRUCTOR"

/** The instructor's right-hand switch. `all` is the default, so it never
 *  reaches the URL. Learners never see it — see `DiscussionAudience`. */
export type DiscussionScope = "all" | "mine" | "unanswered" | "reported"

/**
 * The export draws three. **Reported is a fourth, and it only appears when the
 * instructor actually has reports** — it is where the moderation banner's
 * Review goes, and a banner that promises a destination has to have one. It
 * follows the banner's own rule: drawn when there is something in it, absent
 * otherwise, so the control matches the export whenever nothing is reported.
 */
export const discussionScopes: { value: DiscussionScope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "unanswered", label: "Unanswered" },
]

export const reportedScope: { value: DiscussionScope; label: string } = {
  value: "reported",
  label: "Reported",
}

export const discussionScopeValues = new Set<string>(
  [...discussionScopes, reportedScope].map((entry) => entry.value)
)

/** Rows per page. The export's footer reads "Showing 1–5 of 10 discussions". */
export const DISCUSSIONS_PAGE_SIZE = 5

export const DISCUSSION_TITLE_MAX = 140
export const DISCUSSION_BODY_MAX = 4000

/**
 * The pill beside an author's name — **`userRoleBadge`, not a fourth
 * vocabulary**.
 *
 * Both discussion exports draw it differently from the rest of the app: Admin
 * is a solid dark pill rather than the console's orange tint, and **Student is
 * the same violet as Instructor**, which means the pill distinguishes nothing
 * in a thread where students are most of the replies. Delegating is the call
 * `auditRoleBadge` already made for its own table, and for the reason
 * `CLAUDE.md` records there: two surfaces must not tint the same word two
 * ways. It is also the reading the Users page settled — a neutral Student,
 * because colouring the majority says nothing.
 *
 * Everyone gets a pill now, including learners; the list export only ever drew
 * staff authors, so it said nothing either way.
 */
export function authorRoleBadge(role: string | null | undefined) {
  return userRoleBadge(role)
}

/**
 * The four KPI tiles, tinted per card.
 *
 * Sampled off the export: `--info`, `--role-instructor`, `--warning` and
 * `--success`, each at 10% behind a full-strength glyph — the
 * `bg-<token>/10 text-<token>` treatment `settings-billing.tsx` records, so
 * dark mode follows rather than carrying the four literal fills.
 *
 * This is why the row is **not** `count-card.tsx`: that tile is deliberately
 * monochrome across the console, and it measures 80px against this export's
 * 72. Same anatomy, different component, the call `learning-stat-card.tsx`
 * already makes.
 */
export const discussionStatAccents = [
  "bg-info/10 text-info",
  "bg-role-instructor/10 text-role-instructor",
  "bg-warning/10 text-warning",
  "bg-success/10 text-success",
] as const

export const discussionsCopy = {
  title: "Discussions",
  allTopics: "All Topics",
  showing: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total} ${total === 1 ? "discussion" : "discussions"}`,
  pinned: "Pinned",
  noMatches: "No discussions match this filter.",
} as const

export const discussionsLead: Record<DiscussionAudience, string> = {
  INSTRUCTOR:
    "Topics you run for your cohorts. Pin, moderate, and keep conversations on track.",
  LEARNER:
    "Announcements and topics from your instructors. Jump into the conversation.",
}

/** The learner's header note, where the instructor has two buttons. */
export const learnerNote = "Instructors post topics · you can reply"

export const instructorActions = {
  announce: "Announce",
  newDiscussion: "New Discussion",
} as const

export const discussionStatLabels = {
  activeThreads: "Active threads",
  repliesThisMonth: "Replies this month",
  awaitingReply: "Awaiting your reply",
  participants: "Participants",
} as const

/**
 * The moderation banner.
 *
 * It is drawn **only when there is something in it** — a banner announcing
 * "0 replies need moderation" is the noise Platform Overview's attention
 * queues already refuse.
 *
 * **Review stays inside the instructor's own mode.** It used to point at
 * `/dashboard/admin/reviews`, which is the console — a surface an instructor
 * cannot open at all (`app/(admin)/layout.tsx` answers `notFound()` without
 * the role), and one that lists *every* report on the platform rather than
 * theirs. It now filters this page to the reported threads, which is the
 * moderation an instructor can actually do: they can pin, and from a thread
 * they moderate they can act on what is in it. The count is scoped to match —
 * see `instructorStats`.
 */
export const moderationBanner = {
  title: (count: number) =>
    `${count} ${count === 1 ? "thread needs" : "threads need"} moderation`,
  description: "Reported by learners in the topics you moderate.",
  action: "Review",
} as const

export const emptyDiscussions: Record<
  DiscussionAudience,
  { title: string; description: string }
> = {
  INSTRUCTOR: {
    title: "No discussions yet",
    description:
      "Start a thread and it will appear here for everyone in your cohorts.",
  },
  LEARNER: {
    title: "No discussions yet",
    description:
      "When your instructors post a topic it will show up here, and you can reply.",
  },
}

export const newDiscussionCopy = {
  title: "New discussion",
  announceTitle: "New announcement",
  description:
    "Posts appear in the topic you choose. Everyone who can see the topic can reply.",
  announceDescription:
    "Announcements go to the Announcements topic, where every learner can see them.",
  topic: "Topic",
  topicPlaceholder: "Choose a topic",
  discussionTitle: "Title",
  titlePlaceholder: "What is this about?",
  body: "Message",
  bodyPlaceholder: "Share the details…",
  tags: "Tags",
  tagsPlaceholder: "Comma separated, e.g. Illustration, Week 3",
  submit: "Post discussion",
  announceSubmit: "Post announcement",
} as const

/** Where each mode's feed lives. Read by the nav configs and the actions'
 *  revalidation, so neither can invent a second spelling. */
export const discussionsHref: Record<DiscussionAudience, string> = {
  LEARNER: "/dashboard/discussions",
  INSTRUCTOR: "/dashboard/instructor/discussions",
}

/** What the writes revalidate — the mode's shell layout, for the reason
 *  `messagesLayoutPath` records: `revalidatePath`'s second argument is the
 *  *kind* of path, and every other caller pairs "layout" with a real layout
 *  segment. */
export const discussionsLayoutPath: Record<DiscussionAudience, string> = {
  LEARNER: "/dashboard",
  INSTRUCTOR: "/dashboard/instructor",
}

/** The thread page, from `discussion-page__individual.png`. */
export const threadCopy = {
  back: "Back to discussions",
  repliesHeading: "Replies",
  placeholder: "Write a reply...",
  locked: "This thread is locked.",
  reply: "Reply",
  replies: (count: number) => `${count} ${count === 1 ? "reply" : "replies"}`,
  notFound: "That discussion isn't available.",
} as const
