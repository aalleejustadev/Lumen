"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { adminFeedCategories } from "@/lib/config/admin-notification-feed"

/**
 * The writes behind `/dashboard/admin/notifications`. Reads live in
 * `lib/admin/notification-feed.ts`.
 *
 * **Every one is scoped to the caller's own rows**, and that is the whole
 * security model here: a notification id reaches the browser, so an action
 * that trusted the one it was handed would let any signed-in admin mark — or
 * answer — somebody else's notification. Each `where` therefore carries
 * `userId` alongside the id rather than looking the row up and checking
 * afterwards, so the scoping cannot be forgotten in a later edit.
 *
 * They do **not** re-check the admin role, unlike the rest of
 * `lib/actions/admin-*`. There is nothing administrative about marking your
 * own notification read; the row belongs to the caller either way, and the
 * audience filter means a learner has no ADMIN rows to touch. What the other
 * console actions are guarding is the ability to act on *other people's*
 * data, which none of these can do.
 *
 * Nothing is logged to the audit trail for the same reason: reading your own
 * notifications is not an act on the platform.
 */

export type FeedActionResult = { ok: boolean; message: string }

const ADMIN_CATEGORIES = adminFeedCategories.map((category) => category.value)

/** The feed lives under the console layout, and the header's bell badge reads
 *  the same count — so the layout is what has to re-render, not this route. */
function revalidateConsole() {
  revalidatePath("/dashboard/admin", "layout")
}

export async function markAllNotificationsRead(): Promise<FeedActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to continue." }

  const { count } = await db.notification.updateMany({
    where: {
      userId: session.user.id,
      audience: "ADMIN",
      category: { in: ADMIN_CATEGORIES },
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  revalidateConsole()
  return {
    ok: true,
    message:
      count === 0
        ? "Nothing left to mark."
        : `Marked ${count} notification${count === 1 ? "" : "s"} as read.`,
  }
}

/**
 * Set one row's read state, in either direction.
 *
 * Marking **read** is what opening a notification does. Marking **unread**
 * is the deliberate "come back to this" every notification client offers —
 * you skim a queue, decide two rows need real attention, and put them back.
 * Without it the only way out of a full inbox is forwards, and a feed whose
 * unread count can only ever fall is one nobody can use as a worklist.
 *
 * Idempotent in both directions: the `where` carries the state being left,
 * so a second click writes nothing rather than rewriting the moment the row
 * was first read.
 */
export async function setNotificationRead(
  notificationId: string,
  read: boolean
): Promise<FeedActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to continue." }

  const { count } = await db.notification.updateMany({
    where: {
      id: notificationId,
      userId: session.user.id,
      audience: "ADMIN",
      ...(read ? { readAt: null } : { NOT: { readAt: null } }),
    },
    data: { readAt: read ? new Date() : null },
  })

  // Reported from the row count rather than assumed. The guard above means a
  // row already in the target state matches nothing, and saying "Marked as
  // read" over a write that did not happen is the kind of quiet lie that
  // hides a real bug — it is how an inverted toggle went unnoticed once
  // already. Not an error, though: a double click or a second tab is
  // ordinary, which is the reading `setInstructorPromotionOptIn` settled.
  if (count === 0) {
    return {
      ok: true,
      message: read ? "Already read." : "Already unread.",
    }
  }

  revalidateConsole()
  return { ok: true, message: read ? "Marked as read." : "Marked as unread." }
}

/**
 * Answer the Accept / Decline pair the export draws on its actor row.
 *
 * `NotificationAction` is a real model with a `state`, so answering writes
 * the outcome rather than dismissing the row — the buttons are replaced by
 * what was decided, and the decision survives a reload. It **refuses anything
 * not still PENDING**, which is not paranoia: a notification can be open in
 * two tabs, and the second answer must not overwrite the first.
 *
 * Answering also marks the row read, in the same transaction. Deciding
 * something is a stronger signal than looking at it, and leaving it bold
 * afterwards would keep it in the unread count for work already done.
 */
export async function resolveNotificationAction(
  notificationId: string,
  accept: boolean
): Promise<FeedActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to continue." }

  const notification = await db.notification.findFirst({
    where: { id: notificationId, userId: session.user.id, audience: "ADMIN" },
    select: { id: true, action: { select: { id: true, state: true } } },
  })
  if (!notification?.action) {
    return {
      ok: false,
      message: "That notification no longer exists — reload the page.",
    }
  }
  if (notification.action.state !== "PENDING") {
    return {
      ok: false,
      message: "That request has already been answered — reload the page.",
    }
  }

  const now = new Date()
  await db.$transaction([
    db.notificationAction.update({
      where: { id: notification.action.id },
      data: { state: accept ? "ACCEPTED" : "DECLINED", resolvedAt: now },
    }),
    db.notification.updateMany({
      where: { id: notification.id, readAt: null },
      data: { readAt: now },
    }),
  ])

  revalidateConsole()
  return { ok: true, message: accept ? "Accepted." : "Declined." }
}
