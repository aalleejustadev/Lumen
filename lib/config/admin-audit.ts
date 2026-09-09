import type { AuditCategory, AuditTab } from "@/lib/admin/audit-log"

/**
 * Everything `/dashboard/admin/audit-log` *says*, and nothing it counts — the
 * same split `lib/config/admin-overview.ts` and `admin-reports.ts` make.
 */

export const adminAuditCopy = {
  title: "Audit Log",
  description:
    "Every privileged action taken by a member, with who did it and when.",
  exportLabel: "Export log",
  searchPlaceholder: "Search actions or members...",
  /**
   * The line under the table. It is not decoration: `AuditLog` has no update
   * or delete path in application code precisely because this sentence
   * promises there isn't one, so the copy and the model have to keep saying
   * the same thing.
   */
  retentionNote:
    "Entries are retained for 24 months and cannot be edited or deleted.",
  emptyTitle: "No matching activity",
  emptyDescription:
    "No entries match this filter. Try a different category or search.",
  clearFilters: "Clear filters",
} as const

/** The five segments in the filter row, in the order the export draws them. */
export const auditTabs: { value: AuditTab; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "members", label: "Members" },
  { value: "courses", label: "Courses" },
  { value: "billing", label: "Billing" },
  { value: "security", label: "Security" },
]

/**
 * The Category pill. Tints are a tenth-opacity semantic token behind that same
 * token as the text colour, rather than the export's literal hexes, so dark
 * mode follows — the choice `billing-transactions.tsx` documents.
 */
export const auditCategoryStyles: Record<AuditCategory, string> = {
  MEMBERS: "bg-accent-1/10 text-accent-1",
  COURSES: "bg-accent-2/10 text-accent-2",
  BILLING: "bg-success/10 text-success",
  SECURITY: "bg-destructive/10 text-destructive",
}

export const auditCategoryLabels: Record<AuditCategory, string> = {
  MEMBERS: "Members",
  COURSES: "Courses",
  BILLING: "Billing",
  SECURITY: "Security",
}

/**
 * The small pill under the actor's name. `--role-admin` / `--role-instructor`
 * / `--role-student` already exist for exactly this, and the System actor —
 * an entry with no `actorId` — gets the neutral tint, since "System" is not a
 * role anybody holds.
 */
export function auditRoleBadge(actorRole: string | null): {
  label: string
  className: string
} {
  switch (actorRole) {
    case "admin":
      return { label: "Admin", className: "bg-role-admin/10 text-role-admin" }
    case "instructor":
      return {
        label: "Instructor",
        className: "bg-role-instructor/10 text-role-instructor",
      }
    case "user":
    case "student":
      return {
        label: "Student",
        className: "bg-role-student/10 text-role-student",
      }
    default:
      return { label: "System", className: "bg-hover text-muted-foreground" }
  }
}

/** How the expanded row names each `targetType`. */
export const auditTargetTypeLabels: Record<string, string> = {
  course: "Course",
  user: "Member",
  instructor: "Instructor",
  payout: "Payout",
  promotion: "Promotion",
}
