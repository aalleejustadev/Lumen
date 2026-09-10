import {
  BellIcon,
  BookOpenTextIcon,
  CreditCardIcon,
  MessagesSquareIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react"

import type { NotificationCategory } from "@/lib/generated/prisma/client"

/**
 * Everything `/dashboard/admin/notifications` *says*, and nothing it counts.
 *
 * The page is built to
 * `ui-design/light/dashboard/instructor/notifications-page.png` — the
 * instructor export, followed to the pixel at the user's instruction, with
 * only the *content* made relevant to an admin. So the shape here mirrors
 * that export exactly (a category card of six rows, a search field, a status
 * select, a view toggle, a mark-all action) and the categories inside it are
 * the console's, not a learner's.
 *
 * As with every console page since Users, the page size and the vocabulary
 * live here rather than in `lib/admin/notification-feed.ts`, for the
 * mechanical reason `admin-users.ts` records: the feed is a Client Component
 * and importing any *value* from that module would drag `lib/db` and the
 * Postgres driver into the browser bundle. This file imports only icons and
 * a type, so it crosses freely.
 */

/**
 * The five categories the admin feed offers, in the export's own order, plus
 * the "All types" row the card leads with.
 *
 * **They are the admin notification-settings toggles, one for one.** That is
 * the point rather than a coincidence: `lib/config/admin-notifications.ts`
 * decides what an admin is *emailed* about, and this decides what lands in
 * their feed. If the two lists diverged, an admin could switch off an email
 * and still be unable to explain why a category kept appearing here — or
 * worse, be emailed about something the feed has no home for.
 *
 * The learner's MESSAGE and CERTIFICATE are absent, and MEMBERS and SECURITY
 * take their place: an admin is not issued certificates by the platform they
 * run, and direct messages are a learner surface.
 */
export const adminFeedCategories: {
  value: NotificationCategory
  label: string
  icon: LucideIcon
  /** The row's tinted glyph tile, and the pill's fill + dot. */
  tile: string
  dot: string
  pill: string
}[] = [
  {
    value: "MEMBERS",
    label: "Members",
    icon: UsersRoundIcon,
    tile: "bg-role-instructor/10 text-role-instructor",
    dot: "bg-role-instructor",
    pill: "bg-role-instructor/10 text-role-instructor",
  },
  {
    value: "COURSE",
    label: "Courses",
    icon: BookOpenTextIcon,
    tile: "bg-accent-2/10 text-accent-2",
    dot: "bg-accent-2",
    pill: "bg-accent-2/10 text-accent-2",
  },
  {
    value: "COMMUNITY",
    label: "Community",
    icon: MessagesSquareIcon,
    tile: "bg-accent-1/10 text-accent-1",
    dot: "bg-accent-1",
    pill: "bg-accent-1/10 text-accent-1",
  },
  {
    value: "BILLING",
    label: "Billing",
    icon: CreditCardIcon,
    tile: "bg-success/10 text-success",
    dot: "bg-success",
    pill: "bg-success/10 text-success",
  },
  {
    value: "SECURITY",
    label: "Security",
    icon: ShieldCheckIcon,
    tile: "bg-star/10 text-star",
    dot: "bg-star",
    pill: "bg-star/10 text-star",
  },
]

/** The "All types" row at the head of the card. Its glyph is the export's bell. */
export const ALL_TYPES_ICON: LucideIcon = BellIcon

export const adminFeedCategoryValues = new Set<string>(
  adminFeedCategories.map((category) => category.value)
)

/**
 * Lookup for a row's tile, pill and dot. A category the feed does not list
 * (a learner row that somehow carried the admin audience) still has to render
 * *something* rather than throwing, so this falls back rather than asserting.
 */
export function adminFeedCategory(value: NotificationCategory) {
  return (
    adminFeedCategories.find((category) => category.value === value) ?? {
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
 * is the one an admin working a feed actually wants.
 */
export const adminFeedStatuses = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
] as const

export type AdminFeedStatus = (typeof adminFeedStatuses)[number]["value"]

export const adminFeedStatusValues = new Set<string>(
  adminFeedStatuses.map((status) => status.value)
)

/**
 * The export lists ten notifications and draws no pager — "Showing 10 of 10
 * notification(s)" is its own footer. A real console accumulates them
 * indefinitely, so the page is capped well above that sample and pages beyond
 * it, the reading `billing-transactions.tsx` settled for its six-row table.
 */
export const ADMIN_FEED_PAGE_SIZE = 20

/** The search field's cap, so a hand-edited query string cannot reach Prisma
 *  with a megabyte in it — the guard `parseAuditQuery` documents. */
export const ADMIN_FEED_SEARCH_MAX = 100

export const adminFeedCopy = {
  title: "Notifications",
  description: "Stay up to date with what's happening across the platform.",
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
  emptyDescription:
    "Platform activity — applications, submissions, reports and payouts — will appear here as it happens.",
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
