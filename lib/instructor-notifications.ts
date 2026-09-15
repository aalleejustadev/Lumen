import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import type { InstructorNotifyAboutValue } from "@/lib/config/instructor-notifications"

/**
 * The read behind `/dashboard/instructor/settings/notifications`, the sibling
 * of `lib/notifications.ts` and `lib/admin/notifications.ts`. Pulls in
 * `lib/db`, so the same "never from a Client Component" rule applies.
 *
 * A separate read from the other two because it selects different columns —
 * the four `instructor*` ones plus the shared `securityEmails`. An account can
 * teach and still be a learner, so all three sets coexist on the row rather
 * than one replacing another, and each page reads only what it renders.
 */

export type InstructorNotificationSettings = {
  instructorNotifyAbout: InstructorNotifyAboutValue
  instructorCourseEmails: boolean
  instructorStudentEmails: boolean
  instructorCommunityEmails: boolean
  instructorEarningEmails: boolean
  /** The learner's own column, reused — see `instructorEmailNotifications`. */
  securityEmails: boolean
}

export async function getInstructorNotificationSettings(): Promise<InstructorNotificationSettings | null> {
  const session = await getSession()
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      instructorNotifyAbout: true,
      instructorCourseEmails: true,
      instructorStudentEmails: true,
      instructorCommunityEmails: true,
      instructorEarningEmails: true,
      securityEmails: true,
    },
  })
  if (!user) return null

  return user
}
