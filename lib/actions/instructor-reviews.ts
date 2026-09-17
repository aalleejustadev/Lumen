"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import {
  REPORT_NOTE_MAX,
  REVIEW_REPLY_MAX,
  REVIEWS_LAYOUT_PATH,
  reportReasonValues,
} from "@/lib/config/instructor-reviews"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import type { ReportReason } from "@/lib/generated/prisma/client"

/**
 * The two writes behind `/dashboard/instructor/reviews`. Reads live in
 * `lib/instructor-reviews.ts`.
 *
 * Both **re-resolve the instructor from the session and scope the review by
 * their own courses**, never by the id they were handed — a review id reaches
 * the browser, and an action that trusted one would let any instructor reply
 * under somebody else's course or file reports against reviews they have
 * never seen. It is the check `lib/actions/qa.ts` makes, done inline here
 * because the ownership is a plain relation.
 *
 * They return `{ ok, message }` for the caller to toast rather than throwing,
 * and revalidate the instructor shell's **layout**, so the manage page's
 * "N new" Reviews badge — a count of reviews with no reply — moves without a
 * navigation.
 *
 * Neither writes an `AuditLog` entry. That table records what an *admin* did
 * to somebody else's rows; replying to a review of your own course and asking
 * a moderator to look at one are ordinary use of the surface, which is the
 * same call `lib/actions/qa.ts` and the notification feed's actions make.
 */

export type ReviewActionResult = { ok: boolean; message: string }

/**
 * The review, scoped to the caller's own courses. Null means "not yours",
 * which both callers turn into the same refusal — it deliberately cannot be
 * told apart from "no such review".
 */
async function ownReview(userId: string, reviewId: string) {
  const profile = await getInstructorProfile(userId)
  if (!profile) return null

  return db.courseReview.findFirst({
    where: {
      id: reviewId,
      deletedAt: null,
      status: "VISIBLE",
      course: { instructorId: profile.id },
    },
    select: {
      id: true,
      course: { select: { title: true } },
      reply: { select: { id: true } },
    },
  })
}

/**
 * Post the instructor's reply.
 *
 * `CourseReviewReply.reviewId` is **unique** — the model's own note says one
 * reply per review, "rendered inline beneath it" — so this creates and never
 * updates. The existing-reply case is refused with a sentence rather than
 * left to the constraint, because a unique violation reaches the caller as an
 * unreadable Prisma error and the honest answer ("you have already replied")
 * is one the page can act on. There is no edit path, and the export draws no
 * affordance for one: "You replied" is a status, not a control.
 */
export async function replyToReview(
  reviewId: string,
  body: string
): Promise<ReviewActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to reply." }

  const text = body.trim()
  if (!text) return { ok: false, message: "Write a reply first." }
  if (text.length > REVIEW_REPLY_MAX) {
    return {
      ok: false,
      message: `Keep a reply under ${REVIEW_REPLY_MAX} characters.`,
    }
  }

  const meId = session.user.id
  const review = await ownReview(meId, reviewId)
  if (!review) return { ok: false, message: "That review isn't available." }
  if (review.reply) {
    return { ok: false, message: "You have already replied to this review." }
  }

  await db.courseReviewReply.create({
    data: { reviewId: review.id, authorId: meId, body: text },
  })

  revalidatePath(REVIEWS_LAYOUT_PATH, "layout")
  return { ok: true, message: "Reply posted." }
}

/**
 * File a report, which lands in the console's queue at
 * `/dashboard/admin/reviews`.
 *
 * `ContentReport`'s own docstring says these are "filed by instructors from
 * their Reviews page", so this is the writer it was shaped for. Three things
 * about it:
 *
 *  - **`targetLabel` is written here**, denormalised exactly as that column
 *    asks ("so the queue can render 'on Mastering Illustration' without five
 *    conditional joins, and still reads correctly after a soft delete") — and
 *    the course title is read from the row this action resolved, never from
 *    anything the browser sent.
 *  - **A second open report is refused.** The queue already holds the review,
 *    so another row adds work to a moderator's morning and nothing to the
 *    decision; the button is drawn inert for the same reason, and hiding it
 *    is not the guard.
 *  - **`CourseReview.reportCount` moves in the same transaction**, because it
 *    is a cache of these rows — the rule `CourseQuestion.voteCount` learned
 *    the hard way — so a half-written pair is never visible.
 */
export async function reportReview(
  reviewId: string,
  reason: string,
  note: string
): Promise<ReviewActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to report a review." }

  if (!reportReasonValues.has(reason)) {
    return { ok: false, message: "Pick a reason first." }
  }

  const trimmed = note.trim().slice(0, REPORT_NOTE_MAX)
  const meId = session.user.id
  const review = await ownReview(meId, reviewId)
  if (!review) return { ok: false, message: "That review isn't available." }

  const open = await db.contentReport.findFirst({
    where: { targetType: "REVIEW", targetId: review.id, status: "OPEN" },
    select: { id: true },
  })
  if (open) {
    return { ok: false, message: "This review is already awaiting moderation." }
  }

  await db.$transaction([
    db.contentReport.create({
      data: {
        reporterId: meId,
        targetType: "REVIEW",
        targetId: review.id,
        targetLabel: `Review on ${review.course.title}`,
        reason: reason as ReportReason,
        note: trimmed === "" ? null : trimmed,
      },
    }),
    db.courseReview.update({
      where: { id: review.id },
      data: { reportCount: { increment: 1 } },
    }),
  ])

  revalidatePath(REVIEWS_LAYOUT_PATH, "layout")
  return { ok: true, message: "Reported. A moderator will take a look." }
}
