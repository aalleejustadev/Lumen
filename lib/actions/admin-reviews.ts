"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { setUserStatus } from "@/lib/actions/admin-users"
import type { ReportStatus, ReviewStatus } from "@/lib/generated/prisma/client"

/**
 * The four decisions `reported-reviews__admin.png` puts on every card. The
 * read lives in `lib/admin/reviews.ts`.
 *
 * **Every one re-checks the admin role.** A Server Action is a public
 * endpoint: the console's layout guard covers the page, not the function, and
 * these take other people's writing down and suspend accounts. They return
 * `{ ok, message }` for the caller to toast rather than throwing, the shape
 * `lib/actions/cart.ts` established.
 *
 * Remove, Keep and Hide are **one implementation with three outcomes**, for
 * the reason `admin-courses.ts` gives about its own three: each writes a
 * status onto the *review*, the matching status onto the *report*, and an
 * audit entry, in one transaction. `CourseReview.status` is what every
 * learner-facing surface renders from and `ContentReport.status` is what this
 * queue reads, so letting the two disagree would leave a review hidden from
 * the catalog with nothing on any screen saying why.
 *
 * **All three resolve the report out of the queue**, including Hide. That is
 * `ReportStatus`'s own design — it carries `HIDDEN_PENDING_APPEAL` as a value
 * distinct from `OPEN` — and it is what makes the sidebar badge fall as the
 * work is done. The consequence worth knowing: **there is no appeals surface
 * yet**, no route and no export for one, so a parked report is not listed
 * anywhere once it leaves this queue. Build that screen off
 * `ContentReport.status = HIDDEN_PENDING_APPEAL`; it is the one follow-up this
 * page leaves open.
 */

export type AdminReviewsResult = { ok: boolean; message: string }

const DENIED: AdminReviewsResult = {
  ok: false,
  message: "You do not have access to review moderation.",
}

const GONE: AdminReviewsResult = {
  ok: false,
  message: "That report has already been dealt with — reload the queue.",
}

/** What each decision does to the review, to the report, and to the log. */
const OUTCOMES = {
  remove: {
    review: "REMOVED" as ReviewStatus,
    report: "REMOVED" as ReportStatus,
    action: "Removed a reported review",
    past: "removed",
  },
  keep: {
    review: "VISIBLE" as ReviewStatus,
    report: "DISMISSED" as ReportStatus,
    action: "Dismissed a review report",
    past: "kept — the report was dismissed",
  },
  hide: {
    review: "HIDDEN_PENDING_APPEAL" as ReviewStatus,
    report: "HIDDEN_PENDING_APPEAL" as ReportStatus,
    action: "Hid a review pending appeal",
    past: "hidden while the author appeals",
  },
} as const

type Decision = keyof typeof OUTCOMES

/**
 * The console **layout**, not this page: the sidebar's Reviews badge is the
 * open-queue size and the layout renders it, and every page of this list is a
 * different URL. Same mechanism `lib/actions/wishlist.ts` documents for the
 * sidebar's wishlist count.
 */
function revalidateConsole() {
  revalidatePath("/dashboard/admin", "layout")
}

async function decide(
  reportId: string,
  decision: Decision
): Promise<AdminReviewsResult> {
  const session = await getSession()
  if (session?.user.role !== "admin") return DENIED

  if (typeof reportId !== "string" || reportId.length === 0) return GONE

  const report = await db.contentReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, targetType: true, targetId: true },
  })

  // Refused for anything already decided, which is not paranoia: two admins
  // working one queue is the ordinary case, and a stale tab would otherwise
  // silently overwrite a colleague's decision. The same guard, for the same
  // reason, that `admin-courses.ts` puts on a course already out of review.
  if (!report || report.targetType !== "REVIEW" || report.status !== "OPEN") {
    return GONE
  }

  const review = await db.courseReview.findUnique({
    where: { id: report.targetId },
    select: { id: true, course: { select: { title: true } } },
  })
  if (!review) return GONE

  const outcome = OUTCOMES[decision]
  const now = new Date()

  await db.$transaction([
    db.courseReview.update({
      where: { id: review.id },
      data: {
        status: outcome.review,
        // Remove is a **soft** delete, which is what `CourseReview.deletedAt`
        // exists for: the audit log names its targets, and a review a
        // moderator took down has to still resolve to something 24 months
        // later. Keep and Hide clear it, so a removal can be undone in the
        // database without leaving a tombstone behind.
        deletedAt: decision === "remove" ? now : null,
      },
    }),
    db.contentReport.update({
      where: { id: report.id },
      data: {
        status: outcome.report,
        resolvedById: session.user.id,
        resolvedAt: now,
      },
    }),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        actorName: session.user.name,
        actorRole: session.user.role ?? null,
        action: outcome.action,
        targetType: "review",
        targetId: review.id,
        // The shape `ContentReport.targetLabel` already stores, so the log
        // and the queue name the same row the same way.
        targetLabel: `Review on ${review.course.title}`,
        // `AuditCategory` has no CONTENT member and a review is part of the
        // catalog, so it logs under COURSES — the reading
        // `lib/actions/admin-categories.ts` settled for the same reason.
        category: "COURSES",
      },
    }),
  ])

  revalidateConsole()

  return {
    ok: true,
    message: `Review on ${review.course.title} ${outcome.past}`,
  }
}

/** "Remove review" — the dark button, and the only destructive one. */
export async function removeReportedReview(reportId: string) {
  return decide(reportId, "remove")
}

/** "Keep & dismiss" — the review was critical, not against the guidelines. */
export async function keepReportedReview(reportId: string) {
  return decide(reportId, "keep")
}

/** "Hide pending appeal" — parked, not decided. See the module note. */
export async function hideReportedReview(reportId: string) {
  return decide(reportId, "hide")
}

/**
 * "Suspend reviewer".
 *
 * It takes the **report** id rather than a user id and resolves the account
 * server-side, for the reason every action in this console re-resolves its
 * target: a user id sent from the browser would let anyone with the page open
 * suspend an account that has nothing to do with the queue.
 *
 * The work itself is `setUserStatus`, not a second copy of it. That function
 * writes `User.status` and Better Auth's `banned` together, writes the
 * SECURITY audit entry, and refuses the two cases that would lock the console
 * — all of which are as right here as they are on the Users page.
 *
 * **It deliberately leaves the report open.** Suspending the person and
 * deciding the review are two different acts, which is exactly why the export
 * draws them as two buttons: the review is still there, and somebody still has
 * to say whether it stays up.
 */
export async function suspendReviewer(
  reportId: string
): Promise<AdminReviewsResult> {
  const session = await getSession()
  if (session?.user.role !== "admin") return DENIED

  if (typeof reportId !== "string" || reportId.length === 0) return GONE

  const report = await db.contentReport.findUnique({
    where: { id: reportId },
    select: { status: true, targetType: true, targetId: true },
  })
  if (!report || report.targetType !== "REVIEW" || report.status !== "OPEN") {
    return GONE
  }

  const review = await db.courseReview.findUnique({
    where: { id: report.targetId },
    select: { userId: true },
  })
  if (!review) return GONE

  return setUserStatus([review.userId], "SUSPENDED")
}
