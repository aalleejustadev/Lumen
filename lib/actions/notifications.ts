"use server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  emailNotifications,
  notifyAboutValues,
  type NotifyAboutValue,
} from "@/lib/config/notifications"
import type { NotificationSettings } from "@/lib/notifications"

/**
 * Writes for `/dashboard/settings/notifications`. Reads are in
 * `lib/notifications.ts`.
 *
 * Same posture as `lib/actions/account.ts`: re-check the session, validate
 * server-side, return `{ ok, message }` for the caller to toast rather than
 * throwing. None of these are Better Auth fields, so they are plain
 * `db.user.update` columns — and deliberately not `additionalFields`, which
 * would let a client PATCH them straight through `/api/auth/update-user` and
 * skip the checks below.
 *
 * This one takes a typed payload rather than the `FormData` the profile and
 * account actions read. Those forms are a page of text inputs, so the DOM is
 * where their values live; every control here is a radio or a switch that
 * `notifications-form.tsx` already holds in React state, and re-deriving
 * booleans from `formData.has()` would only add a way for the two to
 * disagree. It is still an untrusted payload — a Server Action is a public
 * endpoint — so nothing below is written as sent.
 */

export type NotificationsActionResult = {
  ok: boolean
  message: string
}

export async function updateNotifications(
  input: NotificationSettings
): Promise<NotificationsActionResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, message: "Sign in to update your notifications." }
  }

  // Re-checked against the configured list rather than cast: the value
  // arrives as an opaque string and lands in an enum column, so a bad one
  // would be a Prisma error rather than a message the form can show.
  const notifyAbout = String(input?.notifyAbout ?? "")
  if (!notifyAboutValues.has(notifyAbout)) {
    return { ok: false, message: "Pick what you'd like to be notified about." }
  }

  // Derived from the config list rather than from the keys the payload
  // happens to carry, so an absent (or non-boolean) toggle is "off" instead
  // of `undefined` reaching Prisma.
  const toggles = Object.fromEntries(
    emailNotifications.map((item) => [item.name, Boolean(input?.[item.name])])
  ) as Record<(typeof emailNotifications)[number]["name"], boolean>

  await db.user.update({
    where: { id: session.user.id },
    data: {
      notifyAbout: notifyAbout as NotifyAboutValue,
      ...toggles,
    },
  })

  return { ok: true, message: "Notification preferences updated." }
}
