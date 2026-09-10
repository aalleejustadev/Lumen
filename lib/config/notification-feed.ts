import {
  AwardIcon,
  BellIcon,
  BookOpenTextIcon,
  CreditCardIcon,
  GraduationCapIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import type {
  NotificationAudience,
  NotificationCategory,
} from "@/lib/generated/prisma/client"

/**
 * Everything the notification feed *says*, for all three modes.
 *
 * **One UI, three category sets.** The page itself
 * (`components/dashboard/notifications/`) is built to
 * `ui-design/light/dashboard/instructor/notifications-page.png` and is
 * identical in every mode; what changes is the list of categories down the
 * left and the words on the rows, because a learner, an instructor and an
 * admin are told about entirely different things. This module is the whole
 * of that difference — a registry keyed by `NotificationAudience` — so
 * mounting the feed for a mode is one entry here rather than a second copy
 * of the page.
 *
 * As with every console page since Users, this lives apart from
 * `lib/notification-feed.ts` for the mechanical reason `admin-users.ts`
 * records: the feed is a Client Component, and importing any *value* from
 * that module would drag `lib/db` and the Postgres driver into the browser
 * bundle. This file imports only icons and types, so it crosses freely.
 */

/**
 * The colour a category is drawn in, fixed **per category rather than per
 * mode**.
 *
 * A category can be labelled differently in two modes — MEMBERS is
 * "Members" to an admin and "Students" to an instructor — but it must not be
 * *coloured* differently, or the same pill would mean two things depending
 * where you were standing. Labels vary; the palette does not.
 *
 * Each maps onto an existing theme token rather than a literal, so dark mode
 * follows — the choice `categoryAccentClasses` documents.
 */
const categoryStyles: Record<
  NotificationCategory,
  { tile: string; dot: string; pill: string }
> = {
  COURSE: {
    tile: "bg-accent-2/10 text-accent-2",
    dot: "bg-accent-2",
    pill: "bg-accent-2/10 text-accent-2",
  },
  MESSAGE: {
    tile: "bg-success/10 text-success",
    dot: "bg-success",
    pill: "bg-success/10 text-success",
  },
  COMMUNITY: {
    tile: "bg-accent-1/10 text-accent-1",
    dot: "bg-accent-1",
    pill: "bg-accent-1/10 text-accent-1",
  },
  CERTIFICATE: {
    tile: "bg-star/10 text-star",
    dot: "bg-star",
    pill: "bg-star/10 text-star",
  },
  BILLING: {
    tile: "bg-accent-3/10 text-accent-3",
    dot: "bg-accent-3",
    pill: "bg-accent-3/10 text-accent-3",
  },
  MEMBERS: {
    tile: "bg-role-instructor/10 text-role-instructor",
    dot: "bg-role-instructor",
    pill: "bg-role-instructor/10 text-role-instructor",
  },
  SECURITY: {
    tile: "bg-warning/10 text-warning",
    dot: "bg-warning",
    pill: "bg-warning/10 text-warning",
  },
}

export type FeedCategory = {
  value: NotificationCategory
  label: string
  icon: LucideIcon
  tile: string
  dot: string
  pill: string
}

function category(
  value: NotificationCategory,
  label: string,
  icon: LucideIcon
): FeedCategory {
  return { value, label, icon, ...categoryStyles[value] }
}

/**
 * The categories each mode offers, in the order its card draws them.
 *
 * Five apiece, which is what the export's card is drawn for — six rows
 * counting "All types".
 *
 *  - **Learner** is the export's own set, verbatim: what you are taking,
 *    who wrote to you, your cohort, what you earned, what you paid.
 *  - **Instructor** swaps Certificate for Students and reads Billing as
 *    earnings: the same feed pointed at the teaching side.
 *  - **Admin** drops Message and Certificate for Members and Security — an
 *    admin is not issued certificates by the platform they run, and direct
 *    messages are a learner surface. Its five are one-for-one the admin
 *    notification-settings toggles, so what you are emailed about and what
 *    lands in your feed cannot drift.
 */
export const feedCategories: Record<NotificationAudience, FeedCategory[]> = {
  LEARNER: [
    category("COURSE", "Course", BookOpenTextIcon),
    category("MESSAGE", "Message", MessageCircleIcon),
    category("COMMUNITY", "Community", MessagesSquareIcon),
    category("CERTIFICATE", "Certificate", AwardIcon),
    category("BILLING", "Billing", CreditCardIcon),
  ],
  INSTRUCTOR: [
    category("COURSE", "Courses", BookOpenTextIcon),
    category("MEMBERS", "Students", GraduationCapIcon),
    category("MESSAGE", "Messages", MessageCircleIcon),
    category("COMMUNITY", "Community", MessagesSquareIcon),
    category("BILLING", "Earnings", WalletIcon),
  ],
  ADMIN: [
    category("MEMBERS", "Members", UsersRoundIcon),
    category("COURSE", "Courses", BookOpenTextIcon),
    category("COMMUNITY", "Community", MessagesSquareIcon),
    category("BILLING", "Billing", CreditCardIcon),
    category("SECURITY", "Security", ShieldCheckIcon),
  ],
}

/** The "All types" row at the head of the card. The export's own bell. */
export const ALL_TYPES_ICON: LucideIcon = BellIcon

export function feedCategoryValues(audience: NotificationAudience) {
  return new Set<string>(feedCategories[audience].map((entry) => entry.value))
}

/**
 * Lookup for a row's tile, pill and dot. A row whose category is not in this
 * mode's list still has to render *something* rather than throwing, so this
 * falls back rather than asserting.
 */
export function feedCategory(
  audience: NotificationAudience,
  value: NotificationCategory
): FeedCategory {
  return (
    feedCategories[audience].find((entry) => entry.value === value) ?? {
      value,
      label: "Activity",
      icon: BellIcon,
      tile: "bg-hover text-muted-foreground",
      dot: "bg-muted-foreground",
      pill: "bg-hover text-muted-foreground",
    }
  )
}

/**
 * The three options in the export's "All" select.
 *
 * The export draws the control and never opens it, so what it filters is a
 * reading rather than a copy. Read/unread is the only axis the page does not
 * already have — the category card owns type and the field owns text — and it
 * is the one anyone working a feed actually wants. Identical in all modes.
 */
export const feedStatuses = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
] as const

export type FeedStatus = (typeof feedStatuses)[number]["value"]

export const feedStatusValues = new Set<string>(
  feedStatuses.map((status) => status.value)
)

/**
 * The export lists ten notifications and draws no pager — "Showing 10 of 10
 * notification(s)" is its own footer. A real account accumulates them
 * indefinitely, so the page is capped well above that sample and pages
 * beyond it, the reading `billing-transactions.tsx` settled.
 */
export const FEED_PAGE_SIZE = 20

/** The search field's cap, so a hand-edited query string cannot reach Prisma
 *  with a megabyte in it — the guard `parseAuditQuery` documents. */
export const FEED_SEARCH_MAX = 100

/** Where each mode's gear button goes — its own notification *preferences*. */
export const feedSettingsHref: Record<NotificationAudience, string> = {
  LEARNER: "/dashboard/settings/notifications",
  // Instructor settings do not exist yet; the learner's are the closest
  // real destination and are the same person's account either way.
  INSTRUCTOR: "/dashboard/settings/notifications",
  ADMIN: "/dashboard/admin/settings/notifications",
}

/** The one line that differs per mode. Everything else the page says is shared. */
export const feedLead: Record<NotificationAudience, string> = {
  LEARNER: "Stay up to date with what's happening across your courses.",
  INSTRUCTOR: "Stay up to date with what's happening across your courses.",
  ADMIN: "Stay up to date with what's happening across the platform.",
}

export const feedEmpty: Record<NotificationAudience, string> = {
  LEARNER:
    "New lessons, replies, certificates and receipts will appear here as they happen.",
  INSTRUCTOR:
    "Enrolments, reviews, questions and payouts will appear here as they happen.",
  ADMIN:
    "Platform activity — applications, submissions, reports and payouts — will appear here as it happens.",
}

export const feedCopy = {
  title: "Notifications",
  unread: (count: number) => `${count} unread`,
  markAllRead: "Mark All as Read",
  settings: "Notification settings",
  searchPlaceholder: "Search notifications...",
  categoriesHeading: "Categories",
  allTypes: "All types",
  listView: "List view",
  gridView: "Grid view",
  showing: (shown: number, total: number) =>
    `Showing ${shown} of ${total} notification${total === 1 ? "" : "(s)"}`,
  emptyTitle: "You're all caught up",
  filteredEmptyTitle: "No notifications match",
  filteredEmptyDescription:
    "Try a different category, or clear the search to see everything.",
  markRead: "Mark as read",
  markUnread: "Mark as unread",
  accept: "Accept",
  decline: "Decline",
  accepted: "Accepted",
  declined: "Declined",
} as const
