import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import type { NotifyAboutValue } from "@/lib/config/notifications"

/**
 * Reads for `/dashboard/settings/notifications`, the sibling of
 * `lib/account.ts` and `lib/profile.ts`. Pulls in `lib/db`, so the same
 * "never from a Client Component" rule applies.
 */

export type NotificationSettings = {
  notifyAbout: NotifyAboutValue
  courseEmails: boolean
  marketingEmails: boolean
  communityEmails: boolean
  securityEmails: boolean
}

export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  const session = await getSession()
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      notifyAbout: true,
      courseEmails: true,
      marketingEmails: true,
      communityEmails: true,
      securityEmails: true,
    },
  })
  if (!user) return null

  return user
}
