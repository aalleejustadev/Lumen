import "server-only"

import { db } from "@/lib/db"
import type {
  NotificationAudience,
  NotificationCategory,
} from "@/lib/generated/prisma/enums"

/**
 * The one place the application writes a `Notification`.
 *
 * **Until this existed, nothing in the app emitted a notification at all** —
 * every row in both feeds came from `prisma/seed.ts`, so an instructor whose
 * course was approved and a learner who bought one were told nothing. The
 * feeds, their categories, their unread badges and their settings pages were
 * all built and waiting; the writer was the missing half.
 *
 * Three rules hold it together:
 *
 *  - **The audience is a column, not a guess.** COURSE, COMMUNITY and BILLING
 *    mean different things to a learner and to an instructor — "a course" is
 *    one you are taking or one you must review — so every call names which
 *    feed it is writing to. `Notification.audience`'s own note makes the same
 *    point from the schema's side.
 *  - **Emitting never fails the thing that caused it.** A notification is a
 *    side effect of something more important — a payment, an approval, a
 *    submission — and none of those should roll back because a row could not
 *    be written. Every helper swallows its error and logs it.
 *  - **Nothing here reads a session.** These run from webhooks and from
 *    actions on behalf of *other* people, so the recipient is always passed
 *    in explicitly.
 */

type NotifyInput = {
  userId: string
  audience: NotificationAudience
  category: NotificationCategory
  title: string
  body?: string | null
  targetType?: string | null
  targetId?: string | null
  /** Renders an avatar instead of a category glyph — see the model's note. */
  actorId?: string | null
}

/** Write one row, or log and carry on. */
async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        audience: input.audience,
        category: input.category,
        title: input.title,
        body: input.body ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        actorId: input.actorId ?? null,
      },
    })
  } catch (error) {
    // Deliberately swallowed: see the header. Logged rather than silent, so a
    // genuinely broken feed is still findable in the server output.
    console.error("[notify] could not write notification", error)
  }
}

/** Write the same row for several people — every admin, typically. */
async function notifyMany(
  userIds: string[],
  input: Omit<NotifyInput, "userId">
): Promise<void> {
  await Promise.all(userIds.map((userId) => notify({ ...input, userId })))
}

/**
 * Every admin account, for the console's own queues.
 *
 * A course submitted for review is work waiting on *whoever* is on duty, not
 * on one named person, which is why this fans out rather than picking an
 * owner — the same call `seedNotifications` already made about which accounts
 * it wrote for.
 */
async function adminUserIds(): Promise<string[]> {
  const admins = await db.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  })
  return admins.map((admin) => admin.id)
}

// ---------------------------------------------------------------------------
// Course review lifecycle
// ---------------------------------------------------------------------------

/** An instructor submitted a course. Goes to the console's queue. */
export async function notifyCourseSubmitted(input: {
  courseId: string
  courseTitle: string
  instructorName: string
  instructorUserId: string | null
}) {
  const admins = await adminUserIds()
  await notifyMany(admins, {
    audience: "ADMIN",
    category: "COURSE",
    title: `${input.courseTitle} is awaiting review`,
    body: `${input.instructorName} submitted it for approval.`,
    targetType: "course",
    targetId: input.courseId,
    actorId: input.instructorUserId,
  })
}

/**
 * The console decided. Goes to the instructor who submitted it.
 *
 * One function for all three outcomes, so the wording for "approved",
 * "changes requested" and "rejected" cannot drift apart — the arrangement
 * `admin-courses.ts`' own `decide()` uses for the writes themselves.
 */
export async function notifyCourseDecision(input: {
  instructorUserId: string | null
  courseId: string
  courseSlug: string
  courseTitle: string
  outcome: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED"
  note?: string | null
}) {
  if (!input.instructorUserId) return

  const copy = {
    APPROVED: {
      title: `${input.courseTitle} is live`,
      body: "It has been approved and is now on sale in the catalog.",
    },
    CHANGES_REQUESTED: {
      title: `${input.courseTitle} needs changes`,
      body: input.note?.trim()
        ? input.note.trim()
        : "A reviewer has asked for changes before it can go live.",
    },
    REJECTED: {
      title: `${input.courseTitle} was not approved`,
      body: input.note?.trim()
        ? input.note.trim()
        : "A reviewer turned this submission down.",
    },
  }[input.outcome]

  await notify({
    userId: input.instructorUserId,
    audience: "INSTRUCTOR",
    category: "COURSE",
    title: copy.title,
    body: copy.body,
    targetType: "course",
    targetId: input.courseId,
  })
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

/**
 * A course was bought. **Two rows, two feeds** — the learner is told they now
 * have it, the instructor is told somebody enrolled — because the same event
 * means a different thing on each side and the two feeds are kept apart by
 * `Notification.audience` for exactly this reason.
 */
export async function notifyCoursePurchased(input: {
  learnerUserId: string
  learnerName: string
  instructorUserId: string | null
  courseId: string
  courseTitle: string
}) {
  await notify({
    userId: input.learnerUserId,
    audience: "LEARNER",
    category: "COURSE",
    title: `You're enrolled in ${input.courseTitle}`,
    body: "Start whenever you like — it's in My Learning.",
    targetType: "course",
    targetId: input.courseId,
  })

  // An instructor buying their own course would otherwise be told they had a
  // new student, which is a lie the console would repeat in its figures.
  if (
    input.instructorUserId &&
    input.instructorUserId !== input.learnerUserId
  ) {
    await notify({
      userId: input.instructorUserId,
      audience: "INSTRUCTOR",
      category: "COURSE",
      title: `New enrolment in ${input.courseTitle}`,
      body: `${input.learnerName} just enrolled.`,
      targetType: "course",
      targetId: input.courseId,
      actorId: input.learnerUserId,
    })
  }
}

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

/** A learner finished a course and a certificate was issued. */
export async function notifyCourseCompleted(input: {
  learnerUserId: string
  courseId: string
  courseTitle: string
  certificateSlug: string | null
}) {
  await notify({
    userId: input.learnerUserId,
    audience: "LEARNER",
    category: "CERTIFICATE",
    title: `Certificate ready for ${input.courseTitle}`,
    body: "You finished the course — your certificate is ready to download.",
    targetType: "certificate",
    targetId: input.certificateSlug,
  })
}

/** An instructor's student finished their course. */
export async function notifyStudentCompleted(input: {
  instructorUserId: string | null
  learnerUserId: string
  learnerName: string
  courseId: string
  courseTitle: string
}) {
  if (!input.instructorUserId || input.instructorUserId === input.learnerUserId)
    return

  await notify({
    userId: input.instructorUserId,
    audience: "INSTRUCTOR",
    category: "COURSE",
    title: `${input.learnerName} completed ${input.courseTitle}`,
    body: "They have been issued a certificate.",
    targetType: "course",
    targetId: input.courseId,
    actorId: input.learnerUserId,
  })
}

export { notify, notifyMany }
