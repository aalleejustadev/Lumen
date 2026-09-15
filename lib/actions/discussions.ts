"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import {
  DISCUSSION_BODY_MAX,
  DISCUSSION_TITLE_MAX,
  discussionsLayoutPath,
  type DiscussionAudience,
} from "@/lib/config/discussions"

/**
 * The three writes behind both Discussions pages. Reads live in
 * `lib/discussions.ts`.
 *
 * Each re-checks the session and, where it matters, the teaching profile —
 * a Server Action is a public endpoint and the shells' layout guards cover the
 * *page*, not this. They return `{ ok, message }` for the caller to toast
 * rather than throwing, the shape `lib/actions/cart.ts` set, and revalidate
 * the mode's shell **layout** for the reason `discussionsLayoutPath` records.
 *
 * **Visibility is re-resolved on every write**, never trusted from the client:
 * a discussion id or a topic id reaching the browser says nothing about
 * whether the caller may act on it, so each action re-asks whether the topic
 * is one they can see.
 */

export type DiscussionActionResult = {
  ok: boolean
  message: string
  /** Where the heart ended up, so an optimistic button can settle on the
   *  real answer rather than assuming its guess was right. */
  liked?: boolean
  discussionId?: string
}

/** Whether this account may see staff-only topics — the same test
 *  `lib/discussions.ts` filters the feed with, so the two cannot disagree. */
async function isStaff(userId: string) {
  return (await getInstructorProfile(userId)) !== null
}

/**
 * The heart, both directions.
 *
 * `DiscussionLike` is the truth and `Discussion.likeCount` is its cache — the
 * model says so out loud ("the counters ... are caches of this table, not the
 * truth") — so the row and the counter move in **one transaction**, and the
 * counter is only nudged when the row actually changed. A double click
 * therefore cannot inflate it.
 */
export async function toggleDiscussionLike(
  audience: DiscussionAudience,
  discussionId: string
): Promise<DiscussionActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to like a discussion." }

  const meId = session.user.id
  const staff = await isStaff(meId)
  const discussion = await db.discussion.findFirst({
    where: {
      id: discussionId,
      status: "PUBLISHED",
      deletedAt: null,
      ...(staff ? {} : { topic: { visibility: { not: "STAFF_ONLY" } } }),
    },
    select: { id: true },
  })
  if (!discussion) {
    return { ok: false, message: "That discussion isn't available." }
  }

  const existing = await db.discussionLike.findUnique({
    where: {
      userId_targetType_targetId: {
        userId: meId,
        targetType: "DISCUSSION",
        targetId: discussionId,
      },
    },
    select: { id: true },
  })

  if (existing) {
    await db.$transaction([
      db.discussionLike.delete({ where: { id: existing.id } }),
      db.discussion.update({
        where: { id: discussionId },
        data: { likeCount: { decrement: 1 } },
      }),
    ])
    return { ok: true, message: "Like removed.", liked: false }
  }

  await db.$transaction([
    db.discussionLike.create({
      data: { userId: meId, targetType: "DISCUSSION", targetId: discussionId },
    }),
    db.discussion.update({
      where: { id: discussionId },
      data: { likeCount: { increment: 1 } },
    }),
  ])
  return { ok: true, message: "Liked.", liked: true }
}

/**
 * Pin or unpin a thread — the row menu's one real item.
 *
 * Gated on `TopicModerator.canPin` for **that topic**, which is what the
 * column is for: the admin Community dialog's own caption says "Moderators act
 * only inside this topic". An account with a teaching profile that does not
 * moderate the topic is refused, so the menu cannot be used to reach across
 * somebody else's cohort.
 */
export async function setDiscussionPinned(
  audience: DiscussionAudience,
  discussionId: string,
  pinned: boolean
): Promise<DiscussionActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to moderate." }

  const meId = session.user.id
  const discussion = await db.discussion.findFirst({
    where: { id: discussionId, deletedAt: null },
    select: { id: true, topicId: true, isPinned: true },
  })
  if (!discussion) {
    return { ok: false, message: "That discussion isn't available." }
  }

  const seat = await db.topicModerator.findUnique({
    where: {
      topicId_userId: { topicId: discussion.topicId, userId: meId },
    },
    select: { canPin: true },
  })
  const admin = session.user.role === "admin"
  if (!admin && !seat?.canPin) {
    return {
      ok: false,
      message: "You can only pin threads in a topic you moderate.",
    }
  }

  await db.discussion.update({
    where: { id: discussionId },
    data: { isPinned: pinned },
  })

  revalidatePath(discussionsLayoutPath[audience], "layout")
  return {
    ok: true,
    message: pinned ? "Pinned to the top." : "Unpinned.",
    discussionId,
  }
}

export type NewDiscussionInput = {
  topicId: string
  title: string
  body: string
  /** Free text from the dialog; split and trimmed here. */
  tags: string
}

/**
 * "New Discussion" and "Announce" — one write, because they are one act: the
 * second is the first with the Announcements topic chosen for you.
 *
 * **Only staff can post from these pages.** The learner's export draws no
 * compose button at all, and says so in the header note ("Instructors post
 * topics · you can reply"); `CommunityTopic.learnersCanStartThreads` is the
 * column that would open it per topic, and it is re-checked here rather than
 * assumed, so the rule lives in the data and not in whichever page called.
 */
export async function createDiscussion(
  audience: DiscussionAudience,
  input: NewDiscussionInput
): Promise<DiscussionActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to post." }

  const meId = session.user.id
  const staff = (await isStaff(meId)) || session.user.role === "admin"

  const title = input.title.trim()
  const body = input.body.trim()
  if (title.length < 3 || title.length > DISCUSSION_TITLE_MAX) {
    return {
      ok: false,
      message: `Give it a title between 3 and ${DISCUSSION_TITLE_MAX} characters.`,
    }
  }
  if (body.length < 1 || body.length > DISCUSSION_BODY_MAX) {
    return {
      ok: false,
      message: `Write a message under ${DISCUSSION_BODY_MAX} characters.`,
    }
  }

  const topic = await db.communityTopic.findFirst({
    where: {
      id: input.topicId,
      ...(staff ? {} : { visibility: { not: "STAFF_ONLY" } }),
    },
    select: {
      id: true,
      learnersCanStartThreads: true,
      requiresModeratorApproval: true,
    },
  })
  if (!topic) return { ok: false, message: "Choose a topic you can post in." }
  if (!staff && !topic.learnersCanStartThreads) {
    return { ok: false, message: "Only staff can start threads in this topic." }
  }

  const tags = [
    ...new Set(
      input.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 4)
    ),
  ]

  const discussion = await db.discussion.create({
    data: {
      topicId: topic.id,
      authorId: meId,
      title,
      body,
      tags,
      // The column's own reason for existing: a topic that holds new threads
      // for a moderator produces `PENDING_APPROVAL`, not a published row.
      status: topic.requiresModeratorApproval
        ? "PENDING_APPROVAL"
        : "PUBLISHED",
    },
    select: { id: true, status: true },
  })

  revalidatePath(discussionsLayoutPath[audience], "layout")
  return {
    ok: true,
    message:
      discussion.status === "PENDING_APPROVAL"
        ? "Posted — a moderator will approve it before it appears."
        : "Discussion posted.",
    discussionId: discussion.id,
  }
}

/**
 * A reply's heart. Separate from `toggleDiscussionLike` only in the
 * `targetType` it writes, but not folded into it: the two take different ids
 * and resolving "which table is this id from" from a string is exactly the
 * ambiguity `LikeTargetType` exists to remove.
 *
 * Visibility is re-resolved through the reply's own thread, so a heart cannot
 * be placed inside a `STAFF_ONLY` topic by anybody who cannot read it.
 */
export async function toggleReplyLike(
  audience: DiscussionAudience,
  replyId: string
): Promise<DiscussionActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to like a reply." }

  const meId = session.user.id
  const staff = await isStaff(meId)
  const reply = await db.discussionReply.findFirst({
    where: {
      id: replyId,
      deletedAt: null,
      discussion: {
        status: "PUBLISHED",
        deletedAt: null,
        ...(staff ? {} : { topic: { visibility: { not: "STAFF_ONLY" } } }),
      },
    },
    select: { id: true },
  })
  if (!reply) return { ok: false, message: "That reply isn't available." }

  const existing = await db.discussionLike.findUnique({
    where: {
      userId_targetType_targetId: {
        userId: meId,
        targetType: "DISCUSSION_REPLY",
        targetId: replyId,
      },
    },
    select: { id: true },
  })

  if (existing) {
    await db.$transaction([
      db.discussionLike.delete({ where: { id: existing.id } }),
      db.discussionReply.update({
        where: { id: replyId },
        data: { likeCount: { decrement: 1 } },
      }),
    ])
    return { ok: true, message: "Like removed.", liked: false }
  }

  await db.$transaction([
    db.discussionLike.create({
      data: {
        userId: meId,
        targetType: "DISCUSSION_REPLY",
        targetId: replyId,
      },
    }),
    db.discussionReply.update({
      where: { id: replyId },
      data: { likeCount: { increment: 1 } },
    }),
  ])
  return { ok: true, message: "Liked.", liked: true }
}

/**
 * Post a reply — the thread page's composer.
 *
 * **Everyone who can read the thread can reply**, which is the learner page's
 * own promise ("Instructors post topics · you can reply") and the line that
 * separates replying from starting a thread. A **locked** thread is the one
 * refusal, because that is what `Discussion.isLocked` is for.
 *
 * The row and `Discussion.replyCount` move in **one transaction**: the counter
 * is a cache of this table, and the list, the sidebar and the thread page all
 * read it, so a half-written pair would be visible in three places at once.
 */
export async function createDiscussionReply(
  audience: DiscussionAudience,
  discussionId: string,
  body: string
): Promise<DiscussionActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to reply." }

  const text = body.trim()
  if (!text) return { ok: false, message: "Write a reply first." }
  if (text.length > DISCUSSION_BODY_MAX) {
    return {
      ok: false,
      message: `Keep a reply under ${DISCUSSION_BODY_MAX} characters.`,
    }
  }

  const meId = session.user.id
  const staff = await isStaff(meId)
  const discussion = await db.discussion.findFirst({
    where: {
      id: discussionId,
      status: "PUBLISHED",
      deletedAt: null,
      ...(staff ? {} : { topic: { visibility: { not: "STAFF_ONLY" } } }),
    },
    select: { id: true, isLocked: true },
  })
  if (!discussion) {
    return { ok: false, message: "That discussion isn't available." }
  }
  if (discussion.isLocked) {
    return { ok: false, message: "This thread is locked." }
  }

  await db.$transaction([
    db.discussionReply.create({
      data: { discussionId, authorId: meId, body: text },
    }),
    db.discussion.update({
      where: { id: discussionId },
      data: { replyCount: { increment: 1 } },
    }),
  ])

  revalidatePath(discussionsLayoutPath[audience], "layout")
  return { ok: true, message: "Reply posted.", discussionId }
}
