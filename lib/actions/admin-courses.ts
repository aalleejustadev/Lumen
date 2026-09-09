"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  changeReasonOptions,
  NOTE_MAX_LENGTH,
} from "@/lib/config/admin-courses"
import type {
  ChangeReason,
  CourseStatus,
  SubmissionDecision,
} from "@/lib/generated/prisma/client"

/**
 * The three decisions an admin can take on a submitted course, from
 * `courses-page__admin.png`, `request-changes__dialog_admin.png` and
 * `course-view-page__admin.png`. Reads live in `lib/admin/courses.ts`.
 *
 * **Every one re-checks the admin role.** A Server Action is a public
 * endpoint: the console's layout guard covers the page, not the function, and
 * these three publish courses to the catalog and send other people's work
 * back. They return `{ ok, message }` for the caller to toast rather than
 * throwing, the shape `lib/actions/cart.ts` established.
 *
 * All three share one implementation, because they are one operation with
 * three outcomes: write the decision onto the **submission**, move
 * `Course.status` to match, and record it in the audit log. That pairing is
 * the important part — `CourseSubmission` is one trip through review and holds
 * the history, `Course.status` only ever holds the latest outcome (the model's
 * own note), and letting the two disagree would give the queue and the
 * instructor's own page different ideas about the same course.
 */

export type AdminCoursesResult = { ok: boolean; message: string }

const DENIED: AdminCoursesResult = {
  ok: false,
  message: "You do not have access to course review.",
}

const reasonValues = new Set(changeReasonOptions.map((option) => option.value))

/** What each decision does to the course and what the log calls it. */
const OUTCOMES = {
  APPROVED: {
    status: "PUBLISHED" as CourseStatus,
    action: "Approved a course submission",
    past: "approved and published",
  },
  CHANGES_REQUESTED: {
    status: "NEEDS_CHANGES" as CourseStatus,
    action: "Requested changes on a course",
    past: "sent back to the instructor",
  },
  REJECTED: {
    status: "REJECTED" as CourseStatus,
    action: "Rejected a course submission",
    past: "rejected",
  },
} satisfies Record<
  SubmissionDecision,
  { status: CourseStatus; action: string; past: string }
>

async function decide(
  courseId: string,
  decision: SubmissionDecision,
  extra: { changeReasons?: ChangeReason[]; noteToInstructor?: string } = {}
): Promise<AdminCoursesResult> {
  const session = await getSession()
  if (session?.user.role !== "admin") return DENIED

  if (typeof courseId !== "string" || courseId.length === 0) {
    return { ok: false, message: "That course could not be found." }
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      status: true,
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  })

  if (!course) return { ok: false, message: "That course could not be found." }

  // **The decision is only offered on a course that is actually in review.**
  // The buttons are already hidden for anything else, but a stale tab is
  // enough to send one anyway — two admins working the queue at once is the
  // ordinary case, not a hostile one — and publishing a course somebody has
  // already rejected would be a silent overwrite of their decision.
  if (course.status !== "IN_REVIEW") {
    return {
      ok: false,
      message: `${course.title} is no longer awaiting review — reload to see where it stands.`,
    }
  }

  const submissionId = course.submissions[0]?.id
  if (!submissionId) {
    return {
      ok: false,
      message: `${course.title} has no submission on file to decide on.`,
    }
  }

  const outcome = OUTCOMES[decision]
  const now = new Date()

  await db.$transaction([
    db.course.update({
      where: { id: course.id },
      // `publishedAt` is written only on approval, and only here: it is what
      // the catalog's "new this month" and the Reports chart count from, so a
      // course that is later sent back keeps the date it actually went live.
      data:
        decision === "APPROVED"
          ? { status: outcome.status, publishedAt: now }
          : { status: outcome.status },
    }),
    db.courseSubmission.update({
      where: { id: submissionId },
      data: {
        decision,
        reviewedById: session.user.id,
        reviewedAt: now,
        changeReasons: extra.changeReasons ?? [],
        noteToInstructor: extra.noteToInstructor ?? null,
      },
    }),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        actorName: session.user.name,
        actorRole: session.user.role ?? null,
        action: outcome.action,
        targetType: "course",
        targetId: course.id,
        targetLabel: course.title,
        category: "COURSES",
      },
    }),
  ])

  // The **layout**, not the page: the console sidebar's Courses badge is the
  // review-queue size and it is rendered by `app/(admin)/layout.tsx`, and every
  // filtered view of this list is a different URL. Same mechanism
  // `lib/actions/wishlist.ts` documents for the sidebar's wishlist count.
  revalidatePath("/dashboard/admin", "layout")

  return { ok: true, message: `${course.title} was ${outcome.past}` }
}

/** "Approve" on a queue row, and "Approve & publish" on the course view. */
export async function approveCourse(
  courseId: string
): Promise<AdminCoursesResult> {
  return decide(courseId, "APPROVED")
}

/**
 * "Send back to instructor" from the Request changes dialog.
 *
 * Neither the reasons nor the note is trusted: the reasons are filtered
 * against `ChangeReason` (an unknown string would be an enum error at the
 * database rather than a validation message), and the note is trimmed and
 * capped. The export's dialog allows an empty selection and an empty note, so
 * both stay optional — a note-only request is a perfectly ordinary one.
 */
export async function requestCourseChanges(
  courseId: string,
  input: { reasons: string[]; note: string }
): Promise<AdminCoursesResult> {
  const reasons = [
    ...new Set(
      (Array.isArray(input?.reasons) ? input.reasons : []).filter(
        (reason): reason is ChangeReason =>
          reasonValues.has(reason as ChangeReason)
      )
    ),
  ]
  const note = (input?.note ?? "").trim().slice(0, NOTE_MAX_LENGTH)

  return decide(courseId, "CHANGES_REQUESTED", {
    changeReasons: reasons,
    noteToInstructor: note || undefined,
  })
}

/** "Reject" on the course view. The list has no Reject — the export draws it
 *  only once you have opened the course, which is the right place for the one
 *  decision that cannot be resubmitted against. */
export async function rejectCourse(
  courseId: string
): Promise<AdminCoursesResult> {
  return decide(courseId, "REJECTED")
}
