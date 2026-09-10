import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import type { AdminNotifyAboutValue } from "@/lib/config/admin-notifications"

/**
 * The read behind `/dashboard/admin/settings/notifications`, the sibling of
 * `lib/notifications.ts`. Pulls in `lib/db`, so the same "never from a Client
 * Component" rule applies.
 *
 * It is a separate read from the learner's `getNotificationSettings` because
 * it selects different columns — the four `admin*` ones plus the shared
 * `securityEmails`. An account can hold the admin role and still be a
 * learner, so the two sets coexist on the row rather than one replacing the
 * other, and each page reads only what it renders.
 */

export type AdminNotificationSettings = {
  adminNotifyAbout: AdminNotifyAboutValue
  adminApplicationEmails: boolean
  adminCourseReviewEmails: boolean
  adminReportEmails: boolean
  adminPayoutEmails: boolean
  /** The learner's own column, reused — see `adminEmailNotifications`. */
  securityEmails: boolean
}

export async function getAdminNotificationSettings(): Promise<AdminNotificationSettings | null> {
  const session = await getSession()
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      adminNotifyAbout: true,
      adminApplicationEmails: true,
      adminCourseReviewEmails: true,
      adminReportEmails: true,
      adminPayoutEmails: true,
      securityEmails: true,
    },
  })
  if (!user) return null

  return user
}
