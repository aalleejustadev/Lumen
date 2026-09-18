import "server-only"

import { db } from "@/lib/db"
import { notifyCoursePurchased } from "@/lib/notify"
import type { EnrollmentSource } from "@/lib/generated/prisma/enums"

/**
 * Granting somebody a course — the one place an `Enrollment` row is created.
 *
 * **Nothing in the application wrote one before this.** Checkout marked the
 * order PAID, emptied the cart and stopped, so a customer who had paid got no
 * access, no My Learning entry, no right to message their instructor and no
 * path to a certificate. Every surface downstream was built and waiting on a
 * row that only `prisma/seed.ts` ever produced.
 *
 * Three things it does, in this order, and the order matters:
 *
 *  1. **The enrolment**, idempotently. Webhook delivery is at-least-once and
 *     `checkout.session.completed` and `async_payment_succeeded` both fire for
 *     one session, so this is an upsert on the `(userId, courseId)` unique and
 *     it reports whether *this* call was the one that created the row.
 *  2. **The welcome message**, but only on a genuine first enrolment — see
 *     below. A replayed webhook must not message somebody twice.
 *  3. **The notifications**, same rule.
 *
 * Steps 2 and 3 are deliberately outside any transaction: a notification or a
 * message failing must not roll back the access somebody paid for.
 */

/**
 * The instructor's own welcome note, sent as a real message.
 *
 * `Course.welcomeMessage` has been editable on the course editor's Course
 * messages step since it was built and was **read back into that form and
 * nowhere else** — stored and never sent. Enrolment is the event it was always
 * described as belonging to.
 *
 * It arrives as an ordinary `Conversation` between the learner and the
 * instructor, keyed to the course, which is what makes it *repliable*: the
 * messaging surface already treats a thread as being about a course, and a
 * welcome that could not be answered would be a worse version of an email.
 * The thread is reused when one already exists, for `startConversation`'s own
 * reason — there must be one answer to "does this conversation exist".
 */
async function sendWelcomeMessage(input: {
  learnerUserId: string
  instructorUserId: string
  courseId: string
  body: string
}) {
  const existing = await db.conversation.findFirst({
    where: {
      courseId: input.courseId,
      AND: [
        { participants: { some: { userId: input.learnerUserId } } },
        { participants: { some: { userId: input.instructorUserId } } },
      ],
    },
    select: { id: true },
  })

  const conversationId =
    existing?.id ??
    (
      await db.conversation.create({
        data: {
          courseId: input.courseId,
          participants: {
            create: [
              { userId: input.learnerUserId },
              // The sender has read their own message by definition, which is
              // what stops a welcome note showing as unread to the instructor
              // who wrote it.
              { userId: input.instructorUserId, lastReadAt: new Date() },
            ],
          },
        },
        select: { id: true },
      })
    ).id

  await db.message.create({
    data: {
      conversationId,
      senderId: input.instructorUserId,
      body: input.body,
    },
  })
  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  })
}

/**
 * Enrol a learner on a course. Safe to call repeatedly.
 *
 * Returns `created: false` for a row that already existed, which is what the
 * caller uses to decide whether this was a real enrolment or a replayed
 * event.
 */
export async function enrolInCourse(input: {
  userId: string
  courseId: string
  source?: EnrollmentSource
  orderId?: string | null
}): Promise<{ created: boolean }> {
  const course = await db.course.findUnique({
    where: { id: input.courseId },
    select: {
      id: true,
      title: true,
      welcomeMessage: true,
      instructor: { select: { userId: true } },
    },
  })
  if (!course) return { created: false }

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId: course.id } },
    select: { id: true },
  })
  if (existing) return { created: false }

  try {
    await db.enrollment.create({
      data: {
        userId: input.userId,
        courseId: course.id,
        source: input.source ?? "PURCHASE",
        orderId: input.orderId ?? null,
        lastAccessedAt: new Date(),
      },
    })
  } catch {
    // Lost the race with a concurrent delivery of the same event. The other
    // call created the row and owns the side effects below.
    return { created: false }
  }

  // `Course.enrollmentCount` is the counter four surfaces draw — the catalog,
  // the sale page, the console's top-courses table and the instructor's own
  // rows — so it moves with the row that backs it rather than being
  // recomputed later.
  await db.course.update({
    where: { id: course.id },
    data: { enrollmentCount: { increment: 1 } },
  })

  const learner = await db.user.findUnique({
    where: { id: input.userId },
    select: { name: true, email: true },
  })
  const learnerName = learner?.name?.trim() || learner?.email || "A new student"

  const welcome = course.welcomeMessage?.trim()
  if (welcome && course.instructor.userId) {
    await sendWelcomeMessage({
      learnerUserId: input.userId,
      instructorUserId: course.instructor.userId,
      courseId: course.id,
      body: welcome,
    }).catch((error) => {
      console.error("[enrol] welcome message failed", error)
    })
  }

  await notifyCoursePurchased({
    learnerUserId: input.userId,
    learnerName,
    instructorUserId: course.instructor.userId,
    courseId: course.id,
    courseTitle: course.title,
  })

  return { created: true }
}
