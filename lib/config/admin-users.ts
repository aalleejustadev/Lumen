import {
  CircleCheckIcon,
  FlameIcon,
  GraduationCapIcon,
  PresentationIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react"

import type {
  UserPlan,
  UsersQuery,
  UsersTab,
  UserStats,
} from "@/lib/admin/users"
import type { UserStatus } from "@/lib/generated/prisma/client"

/**
 * Everything `/dashboard/admin/users` *says*, and nothing it counts — the same
 * split `admin-overview.ts`, `admin-reports.ts` and `admin-audit.ts` make.
 * `lib/admin/users.ts` returns rows and counts; this file turns them into the
 * words from `ui-design/light/dashboard/admin/users-page__admin.png`.
 *
 * It also carries the page size and the "is anything filtering this?" test,
 * which read like query concerns and belong here for a mechanical reason: the
 * table is a Client Component and needs both, and importing any *value* from
 * `lib/admin/users.ts` would pull `lib/db` and the Postgres driver into the
 * browser bundle. This module imports nothing but types, so it crosses freely.
 */

/** Eight rows, which is what the export draws before its pager. */
export const USERS_PAGE_SIZE = 8

/** Whether anything is narrowing the list, which is what the empty state asks. */
export function isUsersFiltered(query: UsersQuery): boolean {
  return (
    query.tab !== "all" ||
    query.query !== "" ||
    query.statuses.length > 0 ||
    query.plan !== null
  )
}

export const adminUsersCopy = {
  title: "Users",
  description:
    "Every account on the platform — learners, instructors, and admins.",
  addLabel: "Add New User",
  searchPlaceholder: "Search users...",
  filtersLabel: "Filters",
  columnsLabel: "Columns",
  /** The Filters popover, which the export draws closed. */
  filtersHeading: "Narrow the list",
  statusHeading: "Status",
  planHeading: "Plan",
  resetFilters: "Reset",
  /** The Columns dropdown, likewise. */
  columnsHeading: "Toggle columns",
  emptyTitle: "No matching accounts",
  emptyDescription:
    "No account matches this filter. Try a different tab, status, or search.",
  clearFilters: "Clear filters",
  /** The bulk bar the checkbox column needs in order to mean anything. */
  bulkSuspend: "Suspend",
  bulkReactivate: "Reactivate",
  bulkClear: "Clear selection",
  selectAllLabel: "Select every account on this page",
  selectRowLabel: (name: string) => `Select ${name}`,
} as const

/** "Showing 1–8 of 18 users", the line under the table on the left. */
export function showingLine(page: {
  page: number
  total: number
  rows: number
  pageSize: number
}): string {
  if (page.total === 0) return "No users"
  const from = (page.page - 1) * page.pageSize + 1
  const to = from + page.rows - 1
  return `Showing ${from}–${to} of ${page.total.toLocaleString("en-US")} ${
    page.total === 1 ? "user" : "users"
  }`
}

// ---------------------------------------------------------------------------
// The four stat tiles
// ---------------------------------------------------------------------------

/**
 * The KPI row. A **different tile** from Platform Overview's and Reports' —
 * `admin-stat-card.tsx` puts a small icon beside a label with the figure and
 * its delta beneath, where this export draws a 44px tile beside the figure and
 * no delta at all — so it is not that shared component, and `users-stats.tsx`
 * says so.
 *
 * No deltas here on purpose: the export draws none, and three of the four
 * ("Active this week", "New this month") are already period figures, so a
 * month-over-month change beside them would be a comparison of comparisons.
 */
export const userStatCards: {
  key: keyof UserStats
  label: string
  icon: LucideIcon
}[] = [
  { key: "total", label: "Total users", icon: UsersRoundIcon },
  { key: "activeThisWeek", label: "Active this week", icon: FlameIcon },
  { key: "instructors", label: "Instructors", icon: PresentationIcon },
  { key: "newThisMonth", label: "New this month", icon: CircleCheckIcon },
]

// ---------------------------------------------------------------------------
// The toolbar
// ---------------------------------------------------------------------------

export const userTabs: { value: UsersTab; label: string }[] = [
  { value: "all", label: "All users" },
  { value: "students", label: "Students" },
  { value: "instructors", label: "Instructors" },
  { value: "admins", label: "Admins" },
  { value: "pending-instructors", label: "Pending instructors" },
]

/**
 * The columns the **Columns** button can hide. Name and Status are absent
 * because they are not optional — a row with no name is not a row, and Status
 * is what the page is most often opened to check. The order matches the table.
 */
export type ToggleableColumn = "role" | "plan" | "email" | "country"

export const toggleableColumns: { key: ToggleableColumn; label: string }[] = [
  { key: "role", label: "Role" },
  { key: "plan", label: "Plan" },
  { key: "email", label: "Email" },
  { key: "country", label: "Country" },
]

/** The Status group in the Filters popover, in the enum's own order. */
export const statusFilterOptions: { value: UserStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
]

export const planFilterOptions: { value: UserPlan | "any"; label: string }[] = [
  { value: "any", label: "Any plan" },
  { value: "free", label: "Free" },
  { value: "business", label: "Business" },
]

// ---------------------------------------------------------------------------
// Pills
// ---------------------------------------------------------------------------

export type Badge = { label: string; className: string }

/**
 * The **Role** pill.
 *
 * Read off this export rather than assumed: Student is drawn *neutral*
 * (`--hover` behind `--muted-foreground`), not in the blue `--role-student`
 * token, while Admin is the orange `--role-admin` and Instructor the violet
 * `--role-instructor`. That is a sensible thing for a table where most rows
 * are students — colouring the majority says nothing — and it is what the
 * only export that draws a Student pill actually shows.
 *
 * `auditRoleBadge` delegates here so the two console tables can't tint the
 * same word two ways; it keeps only its own System case, which is not a role
 * anybody holds.
 */
export function userRoleBadge(role: string | null | undefined): Badge {
  switch (role) {
    case "admin":
      return { label: "Admin", className: "bg-role-admin/10 text-role-admin" }
    case "instructor":
      return {
        label: "Instructor",
        className: "bg-role-instructor/10 text-role-instructor",
      }
    default:
      return { label: "Student", className: "bg-hover text-muted-foreground" }
  }
}

/**
 * The **Status** pill. Tints are a tenth-opacity semantic token behind that
 * same token as the text, rather than the export's literal hexes, so dark mode
 * follows — the choice `billing-transactions.tsx` documents.
 *
 * The export draws only Active, Pending and Inactive, and draws Inactive in
 * red. Suspended is the state it never got to: it takes the same red because
 * that is the one the palette has for "this account is not working", and the
 * pair is told apart by the **word**, not the tint — a second red one shade
 * off would read as a rendering bug rather than a distinction. Inactive is
 * dormancy and Suspended is a decision somebody made, which is what the label
 * says.
 */
export function userStatusBadge(status: UserStatus): Badge {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", className: "bg-success/10 text-success" }
    case "PENDING":
      return { label: "Pending", className: "bg-warning/10 text-warning" }
    case "INACTIVE":
      return {
        label: "Inactive",
        className: "bg-destructive/10 text-destructive",
      }
    case "SUSPENDED":
      return {
        label: "Suspended",
        className: "bg-destructive/10 text-destructive",
      }
  }
}

export const userPlanLabels: Record<UserPlan, string> = {
  free: "Free",
  business: "Business",
}

// ---------------------------------------------------------------------------
// The row menu
// ---------------------------------------------------------------------------

export const userRowMenu = {
  viewProfile: "View profile",
  /**
   * No profile page exists for a learner — an `Instructor` row is the only
   * public page an account has — so the item is drawn and disabled rather than
   * dropped, the same treatment `settingsNav` gives a section whose route
   * hasn't landed. Give it a page and this goes away.
   */
  viewProfileUnavailable: "No public profile yet",
  message: "Message",
  suspend: "Suspend",
  reactivate: "Reactivate",
} as const

// ---------------------------------------------------------------------------
// Add new user
// ---------------------------------------------------------------------------

/** From `ui-design/light/dashboard/admin/add-new-user__admin.png`. */
export const newUserCopy = {
  back: "Back to users",
  title: "Add new user",
  description:
    "They will receive an email invitation to set their own password.",
  accountHeading: "Account details",
  nameLabel: "Full name",
  namePlaceholder: "Ada Lovelace",
  emailLabel: "Email",
  emailPlaceholder: "ada@example.com",
  countryLabel: "Country",
  planLabel: "Plan",
  roleHeading: "Role",
  roleDescription: "Determines what they can see and do across the platform.",
  inviteTitle: "Send invitation email",
  inviteDescription: "Turn off to create the account silently.",
  submit: "Create user",
  cancel: "Cancel",
} as const

/** The three cards under **Role**, with the export's own one-liners. */
export const newUserRoles: {
  value: "user" | "instructor" | "admin"
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    value: "user",
    label: "Student",
    description: "Can enrol in and complete courses.",
    icon: GraduationCapIcon,
  },
  {
    value: "instructor",
    label: "Instructor",
    description: "Can build, publish, and sell courses.",
    icon: PresentationIcon,
  },
  {
    value: "admin",
    label: "Admin",
    description: "Full access to the admin console.",
    icon: CircleCheckIcon,
  },
]

/**
 * The Plan select. "Free" is the absence of a subscription rather than a
 * value, which is why `UserInvitation.plan` is nullable — see its note.
 */
export const newUserPlans: { value: UserPlan; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "business", label: "Business" },
]

/** How long an invitation stays redeemable. */
export const INVITATION_TTL_DAYS = 14
