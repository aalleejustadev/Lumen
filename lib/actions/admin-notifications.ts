"use server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  adminEmailNotifications,
  adminNotificationsCopy,
  adminNotifyAboutValues,
  type AdminNotifyAboutValue,
} from "@/lib/config/admin-notifications"
import type { AdminNotificationSettings } from "@/lib/admin/notifications"

/**
 * The write behind `/dashboard/admin/settings/notifications`. The read is in
 * `lib/admin/notifications.ts`.
 *
 * **It re-checks the admin role**, unlike the learner's `updateNotifications`,
 * which only needs a session. These columns decide who is told that a course
 * is waiting for approval or that a payout failed, so they are console state
 * even though they live on `User` — and a Server Action is a public endpoint
 * whatever page it was called from.
 *
 * It takes a **typed payload rather than `FormData`**, for the reason
 * `lib/actions/notifications.ts` records: every control on that form is a
 * radio or a switch the component already holds in React state, so reading
 * the values back off the DOM would only add a way for the two to disagree.
 * It is still untrusted input — nothing below is written as sent.
 *
 * None of these are Better Auth `additionalFields`, deliberately: that would
 * let a client PATCH them straight through `/api/auth/update-user` and skip
 * the role check above.
 */

export type AdminNotificationsResult = { ok: boolean; message: string }

export async function updateAdminNotifications(
  input: AdminNotificationSettings
): Promise<AdminNotificationsResult> {
  const session = await getSession()
  if (session?.user.role !== "admin") {
    return {
      ok: false,
      message: "You do not have access to these notification settings.",
    }
  }

  // Re-checked against the configured list rather than cast: the value
  // arrives as an opaque string and lands in an enum column, so a bad one
  // would be a Prisma error rather than a message the form can show.
  const notifyAbout = String(input?.adminNotifyAbout ?? "")
  if (!adminNotifyAboutValues.has(notifyAbout)) {
    return { ok: false, message: "Pick what you'd like to be notified about." }
  }

  // Derived from the config list rather than from the keys the payload
  // happens to carry, so an absent (or non-boolean) toggle is "off" instead
  // of `undefined` reaching Prisma.
  const toggles = Object.fromEntries(
    adminEmailNotifications.map((item) => [
      item.name,
      Boolean(input?.[item.name]),
    ])
  ) as Record<(typeof adminEmailNotifications)[number]["name"], boolean>

  await db.user.update({
    where: { id: session.user.id },
    data: {
      adminNotifyAbout: notifyAbout as AdminNotifyAboutValue,
      ...toggles,
    },
  })

  // No `revalidatePath`: nothing in the console chrome renders these.
  return { ok: true, message: adminNotificationsCopy.saved }
}
