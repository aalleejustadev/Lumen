"use server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { canTeach } from "@/lib/instructor"
import {
  instructorEmailNotifications,
  instructorNotificationsCopy,
  instructorNotifyAboutValues,
  type InstructorNotifyAboutValue,
} from "@/lib/config/instructor-notifications"
import type { InstructorNotificationSettings } from "@/lib/instructor-notifications"

/**
 * The write behind `/dashboard/instructor/settings/notifications`. The read is
 * in `lib/instructor-notifications.ts`.
 *
 * **It re-checks `canTeach`**, the same function
 * `app/(instructor)/layout.tsx` guards the whole shell with, so the action and
 * the layout can never disagree about who may be here — a Server Action is a
 * public endpoint whatever page it was called from. The learner's
 * `updateNotifications` needs only a session, because its columns describe
 * something everybody has; these describe a teaching business.
 *
 * It takes a **typed payload rather than `FormData`**, for the reason
 * `lib/actions/notifications.ts` records: every control on that form is a
 * radio or a switch the component already holds in React state, so reading the
 * values back off the DOM would only add a way for the two to disagree. It is
 * still untrusted input — nothing below is written as sent.
 *
 * None of these are Better Auth `additionalFields`, deliberately: that would
 * let a client PATCH them straight through `/api/auth/update-user` and skip
 * the check above.
 */

export type InstructorNotificationsResult = { ok: boolean; message: string }

export async function updateInstructorNotifications(
  input: InstructorNotificationSettings
): Promise<InstructorNotificationsResult> {
  const session = await getSession()
  if (!session || !(await canTeach(session.user))) {
    return {
      ok: false,
      message: "You do not have access to these notification settings.",
    }
  }

  // Re-checked against the configured list rather than cast: the value
  // arrives as an opaque string and lands in an enum column, so a bad one
  // would be a Prisma error rather than a message the form can show.
  const notifyAbout = String(input?.instructorNotifyAbout ?? "")
  if (!instructorNotifyAboutValues.has(notifyAbout)) {
    return { ok: false, message: "Pick what you'd like to be notified about." }
  }

  // Derived from the config list rather than from the keys the payload
  // happens to carry, so an absent (or non-boolean) toggle is "off" instead
  // of `undefined` reaching Prisma.
  const toggles = Object.fromEntries(
    instructorEmailNotifications.map((item) => [
      item.name,
      Boolean(input?.[item.name]),
    ])
  ) as Record<(typeof instructorEmailNotifications)[number]["name"], boolean>

  await db.user.update({
    where: { id: session.user.id },
    data: {
      instructorNotifyAbout: notifyAbout as InstructorNotifyAboutValue,
      ...toggles,
    },
  })

  // No `revalidatePath`: nothing in the instructor chrome renders these.
  return { ok: true, message: instructorNotificationsCopy.saved }
}
