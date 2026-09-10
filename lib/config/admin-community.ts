import {
  InfoIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react"

import type { TopicVisibility } from "@/lib/generated/prisma/client"

/**
 * Everything `/dashboard/admin/community` and its two dialogs *say*, and
 * nothing they count — the same split every other console page makes.
 *
 * It also carries the page size and the client-safe helpers, for the
 * mechanical reason `admin-users.ts` records: the board is a Client Component
 * and needs them, and importing any *value* from `lib/admin/community.ts`
 * would drag `lib/db` and the Postgres driver into the browser bundle. This
 * module imports nothing but a type, so it crosses freely.
 */

/** The moderators table pages; the export's four rows are its sample. */
export const MODERATORS_PAGE_SIZE = 8

export const TOPIC_NAME_MAX_LENGTH = 60
export const TOPIC_DESCRIPTION_MAX_LENGTH = 200

export const adminCommunityCopy = {
  title: "Community",
  description:
    "Create topics, set who can post, and appoint moderators to keep them healthy.",
  newTopic: "New topic",
  topicsHeading: "Topics",
  moderatorsHeading: "Moderators",
  moderatorsLead: "People with elevated permissions in one or more topics.",
  manageModerators: "Moderators",
  edit: "Edit",
  topicsEmptyTitle: "No topics yet",
  topicsEmptyDescription:
    "Create the first topic and learners will see it as a filter on Discussions.",
  moderatorsEmptyTitle: "No moderators yet",
  moderatorsEmptyDescription:
    "Appoint one from a topic's Moderators dialog and they will appear here.",
  /** The `⋯` menu on a topic row. */
  rowMenu: {
    label: (topic: string) => `Actions for ${topic}`,
    edit: "Edit topic",
    moderators: "Manage moderators",
    delete: "Delete topic",
    /** Why Delete is refused — see `deleteTopic`, which re-checks the same. */
    deleteBlocked: (threads: number) =>
      `${threads.toLocaleString("en-US")} ${
        threads === 1 ? "thread is" : "threads are"
      } filed under this topic.`,
  },
  showing: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total} ${
      total === 1 ? "moderator" : "moderators"
    }`,
} as const

/** The four KPI tiles, in the order the export lays them out. */
export const communityStatCards: {
  key: "topics" | "threads" | "moderators" | "reportedItems"
  label: string
  icon: LucideIcon
}[] = [
  { key: "topics", label: "Topics", icon: MessagesSquareIcon },
  { key: "threads", label: "Threads", icon: MessageSquareIcon },
  { key: "moderators", label: "Moderators", icon: UsersRoundIcon },
  { key: "reportedItems", label: "Reported items", icon: InfoIcon },
]

// ---------------------------------------------------------------------------
// Pills
// ---------------------------------------------------------------------------

export type Pill = { label: string; className: string }

/**
 * The pill beside a topic's name. It is **not** a stored field — it reads
 * `learnersCanStartThreads`, which is what the Create-topic dialog's "Learners
 * can start threads" switch writes and what the model's own note says renders
 * it.
 *
 * Tints are a tenth-opacity semantic token behind that same token, rather than
 * the export's literal hexes, so dark mode follows — the choice
 * `billing-transactions.tsx` documents and every console pill since has kept.
 * Sampled off the export: Open posting is `--success` green, Staff post only
 * the `--warning` orange.
 */
export function postingPill(learnersCanStartThreads: boolean): Pill {
  return learnersCanStartThreads
    ? { label: "Open posting", className: "bg-success/10 text-success" }
    : { label: "Staff post only", className: "bg-warning/10 text-warning" }
}

/**
 * The visibility pill at the right-hand end of a topic row.
 *
 * **Neutral on purpose**, which is what the export draws for all three: this
 * says who a topic is *for*, not whether anything is wrong with it, and
 * colouring every row would say nothing — the reading the Users page settled
 * for its own neutral Student pill.
 */
export const topicVisibilityLabels: Record<TopicVisibility, string> = {
  EVERYONE: "Everyone",
  ENROLLED_ONLY: "Enrolled only",
  STAFF_ONLY: "Staff only",
}

/** The three radio cards in the Create-topic dialog, in the drawn order. */
export const topicVisibilityOptions: {
  value: TopicVisibility
  label: string
  description: string
}[] = [
  {
    value: "EVERYONE",
    label: "Everyone",
    description: "Any signed-in learner can read and post.",
  },
  {
    value: "ENROLLED_ONLY",
    label: "Enrolled only",
    description: "Restricted to learners in a linked course.",
  },
  {
    value: "STAFF_ONLY",
    label: "Staff only",
    description: "Instructors and admins. Learners cannot see it.",
  },
]

export function isTopicVisibility(value: unknown): value is TopicVisibility {
  return (
    value === "EVERYONE" || value === "ENROLLED_ONLY" || value === "STAFF_ONLY"
  )
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/** The four `TopicModerator` booleans, and the switches that write them. */
export const MODERATOR_PERMISSIONS = [
  "canPin",
  "canLock",
  "canDelete",
  "canSuspend",
] as const

export type ModeratorPermission = (typeof MODERATOR_PERMISSIONS)[number]

export type ModeratorPermissions = Record<ModeratorPermission, boolean>

/** The four rows in the Moderators dialog, in the order it draws them. */
export const moderatorPermissionRows: {
  key: ModeratorPermission
  title: string
  description: string
  /** The word this permission contributes to a row's summary. */
  short: string
}[] = [
  {
    key: "canPin",
    title: "Pin and feature threads",
    description: "Keep important posts at the top.",
    short: "pin",
  },
  {
    key: "canLock",
    title: "Lock and close threads",
    description: "Stop new replies on a conversation.",
    short: "lock",
  },
  {
    key: "canDelete",
    title: "Delete posts and replies",
    description: "Remove content that breaks the rules.",
    short: "delete",
  },
  {
    key: "canSuspend",
    title: "Suspend participants",
    description: "Temporarily block someone from posting.",
    short: "suspend",
  },
]

/**
 * The **Permissions** column, and the second line of each row in the
 * Moderators dialog: "Pin, lock, delete", "Pin, lock", "Full control".
 *
 * All four collapse to **Full control**, which is exactly what the export
 * draws against its admin row — listing four words where one says it better
 * is the sort of thing a table column should not do. None of them is "No
 * permissions" rather than an empty cell, so a moderator who can do nothing
 * reads as a mistake somebody can see and fix.
 */
export function permissionSummary(permissions: ModeratorPermissions): string {
  const granted = moderatorPermissionRows.filter((row) => permissions[row.key])
  if (granted.length === moderatorPermissionRows.length) return "Full control"
  if (granted.length === 0) return "No permissions"
  const words = granted.map((row) => row.short)
  return (
    words[0]!.charAt(0).toUpperCase() +
    words[0]!.slice(1) +
    (words.length > 1 ? `, ${words.slice(1).join(", ")}` : "")
  )
}

// ---------------------------------------------------------------------------
// Dialog copy
// ---------------------------------------------------------------------------

export const topicDialogCopy = {
  createTitle: "Create community topic",
  editTitle: "Edit community topic",
  description:
    "Topics group related threads. Learners see them as filters on the Discussions page.",
  nameLabel: "Topic name",
  namePlaceholder: "e.g. Career Advice",
  descriptionLabel: "Description",
  descriptionPlaceholder: "What belongs in this topic?",
  accentLabel: "Accent colour",
  visibilityLabel: "Who can see it",
  threadsTitle: "Learners can start threads",
  threadsDescription: "Turn off for announcement-style topics.",
  approvalTitle: "Require moderator approval",
  approvalDescription: "New threads are held until a moderator approves them.",
  createSubmit: "Create topic",
  editSubmit: "Save topic",
  /**
   * **The export's "Cancel" is deliberately not reproduced.** `DialogContent`
   * already draws a close X, so a second control whose only job is to dismiss
   * is the redundancy the payout-run dialog had removed — the standing rule
   * `CLAUDE.md` records, which the categories dialog and the Request-changes
   * dialog both already follow.
   */
} as const

export const moderatorsDialogCopy = {
  title: "Moderators",
  /** The export's own sentence, with the topic name bolded inside it. */
  description: (topic: string) =>
    `Managing ${topic}. Moderators act only inside this topic.`,
  currentHeading: "Current moderators",
  currentEmpty: "Nobody moderates this topic yet.",
  permissionsHeading: "Permissions",
  /**
   * **Not the export's "Applies to every moderator in this topic."**
   *
   * That sentence is contradicted by the export's own data twice over: the
   * four rows directly above it carry four *different* permission summaries
   * ("Pin, lock, delete", "Pin, lock", "Full control", "Pin, delete"), and so
   * does the Permissions column of the table on the page behind it. Uniform
   * per-topic permissions cannot produce either. `TopicModerator` stores the
   * four booleans per (topic, user) for that reason, so the switches edit the
   * moderator you have selected and the sentence names them.
   */
  permissionsLead: (name: string) => `Applies to ${name} in this topic.`,
  permissionsNoSelection: "Select a moderator above to set what they can do.",
  addHeading: "Add a moderator",
  searchPlaceholder: "Search members...",
  searchEmpty: "No member matches that search.",
  add: "Add",
  remove: "Remove",
  submit: "Save changes",
  /** The second line under a candidate's name in the Add list. */
  candidateMeta: (role: string | null, courses: number) =>
    role === "instructor"
      ? `Instructor · ${courses} ${courses === 1 ? "course" : "courses"}`
      : role === "admin"
        ? "Admin"
        : "Student",
} as const

export const deleteTopicCopy = {
  title: "Delete topic",
  description: (name: string) =>
    `${name} will be removed from the Discussions filters. This cannot be undone.`,
  confirm: "Delete topic",
} as const
