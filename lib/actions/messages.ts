"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  getMessageCandidates,
  resolvePairing,
  type MessageCandidate,
} from "@/lib/messages"
import {
  MESSAGE_MAX,
  messagesLayoutPath,
  type MessageAudience,
} from "@/lib/config/messages"

/**
 * The three writes behind the Messages page. Reads live in `lib/messages.ts`.
 *
 * **Every one of them re-resolves the pairing server-side** through
 * `resolvePairing` rather than trusting the conversation id, the counterpart
 * id or the course it was handed. A Server Action is a public endpoint, and
 * ids for other people's threads are exactly the sort of thing that reaches a
 * browser — an action that trusted one would let any signed-in account write
 * into any conversation on the platform. It is the check
 * `ownsPaymentMethod` makes on the billing page, and the one
 * `lib/actions/instructor-payouts.ts` makes inline by scoping every `where` to
 * the instructor it resolved.
 *
 * They return `{ ok, message }` for the caller to toast rather than throwing,
 * the shape `lib/actions/cart.ts` set.
 *
 * Each revalidates the **layout** at the mode's inbox path, not the page it
 * was pressed on: the unread badge beside the sidebar's Messages row is chrome
 * rendered by the shell's layout, so a sent or opened message has to move it
 * without a navigation. Same mechanism the cart badge uses.
 */

export type MessageActionResult = {
  ok: boolean
  message: string
  /** The thread the caller should now be looking at — new for
   *  `startConversation`, unchanged for a reply. */
  conversationId?: string
}

/**
 * Resolves the caller's membership of a thread *and* the rule that authorises
 * it, in one place, so no action below can check one and forget the other.
 *
 * Returns the counterpart's id alongside, because a reply has to know who it
 * is replying to in order to ask `resolvePairing` anything at all.
 */
async function openThread(meId: string, conversationId: string) {
  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      // Membership first: this is what stops an id from another inbox
      // resolving to anything.
      participants: { some: { userId: meId } },
    },
    select: {
      id: true,
      courseId: true,
      participants: { select: { userId: true } },
    },
  })
  if (!conversation) return null

  const counterpartId = conversation.participants.find(
    (participant) => participant.userId !== meId
  )?.userId
  if (!counterpartId || !conversation.courseId) return null

  return { conversation, counterpartId, courseId: conversation.courseId }
}

export async function sendMessage(
  audience: MessageAudience,
  conversationId: string,
  body: string
): Promise<MessageActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to send a message." }

  const text = body.trim()
  if (!text) return { ok: false, message: "Write a message first." }
  if (text.length > MESSAGE_MAX) {
    return {
      ok: false,
      message: `Messages are limited to ${MESSAGE_MAX} characters.`,
    }
  }

  const meId = session.user.id
  const open = await openThread(meId, conversationId)
  if (!open) return { ok: false, message: "That conversation isn't available." }

  // The enrolment that authorised this pair can end — a refund revokes it — so
  // it is re-checked on every send rather than once when the thread was made.
  const pairing = await resolvePairing(meId, open.counterpartId, open.courseId)
  if (!pairing) {
    return {
      ok: false,
      message:
        "This conversation is read-only: the enrolment behind it has ended.",
    }
  }

  await db.$transaction([
    db.message.create({
      data: { conversationId, senderId: meId, body: text },
    }),
    // `lastMessageAt` is what orders the list, so it moves with the message
    // rather than being recomputed from it.
    db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
    // Sending is reading: leaving your own message unread against yourself
    // would put a pill on a thread you are looking at.
    db.conversationParticipant.updateMany({
      where: { conversationId, userId: meId },
      data: { lastReadAt: new Date() },
    }),
  ])

  revalidatePath(messagesLayoutPath[audience], "layout")
  return { ok: true, message: "Message sent.", conversationId }
}

/**
 * Opens a thread with somebody the rule allows, or hands back the one that
 * already exists.
 *
 * Re-finding an existing thread rather than creating a second is what keeps
 * one (person, course) pair to one conversation — the New-message dialog can
 * be used twice, and two threads with the same person about the same course
 * would split the history for no reason.
 */
export async function startConversation(
  audience: MessageAudience,
  counterpartId: string,
  courseId: string
): Promise<MessageActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to send a message." }

  const meId = session.user.id
  const pairing = await resolvePairing(meId, counterpartId, courseId)
  if (!pairing) {
    return {
      ok: false,
      message:
        audience === "INSTRUCTOR"
          ? "You can only message students enrolled in a course you teach."
          : "You can only message the instructor of a course you're enrolled in.",
    }
  }

  const existing = await db.conversation.findFirst({
    where: {
      courseId,
      AND: [
        { participants: { some: { userId: meId } } },
        { participants: { some: { userId: counterpartId } } },
      ],
    },
    select: { id: true },
  })
  if (existing) {
    revalidatePath(messagesLayoutPath[audience], "layout")
    return {
      ok: true,
      message: "Opened your existing conversation.",
      conversationId: existing.id,
    }
  }

  const conversation = await db.conversation.create({
    data: {
      courseId,
      participants: {
        create: [
          // The opener has read a thread they just made; the other side has not.
          { userId: meId, lastReadAt: new Date() },
          { userId: counterpartId },
        ],
      },
    },
    select: { id: true },
  })

  revalidatePath(messagesLayoutPath[audience], "layout")
  return {
    ok: true,
    message: "Conversation started.",
    conversationId: conversation.id,
  }
}

/**
 * Marks a thread read up to now.
 *
 * Idempotent, and scoped by `userId` in the `where` so it can only ever move
 * the caller's own marker — there is nothing here that needs a role check,
 * for the reason `lib/actions/notification-feed.ts` records about its own.
 */
export async function markConversationRead(
  audience: MessageAudience,
  conversationId: string
): Promise<MessageActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to read your messages." }

  const updated = await db.conversationParticipant.updateMany({
    where: { conversationId, userId: session.user.id },
    data: { lastReadAt: new Date() },
  })
  if (updated.count === 0) {
    return { ok: false, message: "That conversation isn't available." }
  }

  revalidatePath(messagesLayoutPath[audience], "layout")
  return { ok: true, message: "Marked as read.", conversationId }
}

/**
 * The New-message dialog's list of people, loaded **when the dialog opens**
 * rather than with the page — the arrangement `payout-run-dialog.tsx` records,
 * and worth more here: an instructor's student list is thousands of rows, and
 * most visits to an inbox never open the dialog.
 *
 * It is a Server Action rather than a prop because it is searched, and the
 * search has to run in SQL for the reason `getMessageCandidates` caps it:
 * the answer is not a page-sized list you could ship to the client and filter.
 * Reading it needs no role check — `getMessageCandidates` resolves the caller
 * from the session and every row it returns is one the messaging rule already
 * allows.
 */
export async function listMessageCandidates(
  audience: MessageAudience,
  search: string
): Promise<MessageCandidate[]> {
  return getMessageCandidates(audience, search)
}

/**
 * **Message** on an instructor's public profile. Resolves the instructor's
 * account from the slug — the browser never supplies a user id — and hands
 * over to `startConversation`, which runs `resolvePairing` itself: the viewer
 * must be enrolled in `courseId`, and `courseId` must be this instructor's.
 * An existing thread about that course is reopened rather than duplicated.
 */
export async function openInstructorConversation(
  instructorSlug: string,
  courseId: string
): Promise<MessageActionResult> {
  const instructor = await db.instructor.findUnique({
    where: { slug: instructorSlug },
    select: { userId: true },
  })
  if (!instructor?.userId) {
    return { ok: false, message: "This instructor can't receive messages yet." }
  }
  return startConversation("LEARNER", instructor.userId, courseId)
}
