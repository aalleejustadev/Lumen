"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import { QA_LAYOUT_PATH, QA_REPLY_MAX } from "@/lib/config/qa"

/**
 * The two writes behind the instructor's Q&A pages. Reads live in `lib/qa.ts`.
 *
 * Both **re-resolve the instructor from the session and scope the question by
 * their own courses**, never by the id they were handed — a question id
 * reaches the browser, and an action that trusted one would let any instructor
 * answer in somebody else's cohort. It is the check
 * `lib/actions/instructor-coupons.ts` makes, done inline here because the
 * ownership is a plain relation.
 *
 * They return `{ ok, message }` for the caller to toast rather than throwing,
 * and revalidate the shell **layout** so the sidebar's Q&A badge — a count of
 * unanswered questions — moves without a navigation.
 */

export type QaActionResult = {
  ok: boolean
  message: string
  /** Where the vote ended up, so an optimistic button can settle on the real
   *  answer rather than assuming its guess was right. */
  voted?: boolean
}

/** The question, scoped to the caller's own courses. Null means "not yours",
 *  which every caller turns into the same refusal. */
async function ownQuestion(userId: string, questionId: string) {
  const profile = await getInstructorProfile(userId)
  if (!profile) return null

  return db.courseQuestion.findFirst({
    where: {
      id: questionId,
      deletedAt: null,
      course: { instructorId: profile.id },
    },
    select: { id: true, answeredByInstructor: true },
  })
}

/**
 * The vote arrow, both directions.
 *
 * `CourseQuestionVote` is uniquely keyed on (question, user), so a vote cannot
 * be double-counted; `CourseQuestion.voteCount` is its cache and moves in the
 * same transaction, so a half-written pair is never visible.
 */
export async function toggleQuestionVote(
  questionId: string
): Promise<QaActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to vote." }

  const meId = session.user.id
  const question = await ownQuestion(meId, questionId)
  if (!question) return { ok: false, message: "That question isn't available." }

  const existing = await db.courseQuestionVote.findUnique({
    where: { questionId_userId: { questionId, userId: meId } },
    select: { id: true },
  })

  if (existing) {
    await db.$transaction([
      db.courseQuestionVote.delete({ where: { id: existing.id } }),
      db.courseQuestion.update({
        where: { id: questionId },
        data: { voteCount: { decrement: 1 } },
      }),
    ])
    revalidatePath(QA_LAYOUT_PATH, "layout")
    return { ok: true, message: "Vote removed.", voted: false }
  }

  await db.$transaction([
    db.courseQuestionVote.create({ data: { questionId, userId: meId } }),
    db.courseQuestion.update({
      where: { id: questionId },
      data: { voteCount: { increment: 1 } },
    }),
  ])
  revalidatePath(QA_LAYOUT_PATH, "layout")
  return { ok: true, message: "Voted.", voted: true }
}

/**
 * Post an answer.
 *
 * **Answering flips `answeredByInstructor`**, in the same transaction as the
 * reply and the counter. That column is what the pill, both tabs and the
 * sidebar badge all read, so leaving it to a later pass would mean a question
 * that has been answered still advertising "Awaiting reply" in four places.
 * It is only ever set — never cleared — because an answer given is not
 * un-given when a learner replies after it.
 */
export async function createQuestionReply(
  questionId: string,
  body: string
): Promise<QaActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to reply." }

  const text = body.trim()
  if (!text) return { ok: false, message: "Write a reply first." }
  if (text.length > QA_REPLY_MAX) {
    return {
      ok: false,
      message: `Keep a reply under ${QA_REPLY_MAX} characters.`,
    }
  }

  const meId = session.user.id
  const question = await ownQuestion(meId, questionId)
  if (!question) return { ok: false, message: "That question isn't available." }

  await db.$transaction([
    db.courseQuestionReply.create({
      data: { questionId, authorId: meId, body: text },
    }),
    db.courseQuestion.update({
      where: { id: questionId },
      data: {
        replyCount: { increment: 1 },
        answeredByInstructor: true,
      },
    }),
  ])

  revalidatePath(QA_LAYOUT_PATH, "layout")
  return { ok: true, message: "Reply posted." }
}
