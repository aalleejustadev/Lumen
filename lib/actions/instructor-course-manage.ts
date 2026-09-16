"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { canTeach, getInstructorProfile } from "@/lib/instructor"

/**
 * The one write behind `/dashboard/instructor/courses/[slug]` — taking a live
 * course off sale, and putting it back. Reads live in
 * `lib/instructor-course-manage.ts`.
 *
 * Like every action in `lib/actions/instructor-*`, it **re-resolves the
 * instructor from the session and scopes the `where` by it** rather than
 * trusting the id it was handed: course ids reach the browser, and an action
 * that did not would let any instructor unpublish somebody else's catalog. It
 * re-checks `canTeach` too — the same function `app/(instructor)/layout.tsx`
 * guards the shell with, so the two cannot disagree — because a Server Action
 * is a public endpoint and the layout's guard covers the page, not this.
 *
 * Three things about what it does:
 *
 *  - **Unpublishing writes ARCHIVED, not DRAFT.** `courseStatusBadge`' own
 *    note says an archived course "is not a problem, it is simply no longer on
 *    sale", which is exactly what the word means; DRAFT would say the course
 *    was never finished and would drop it into My Courses' Drafts tab beside
 *    work that genuinely is unfinished.
 *  - **Republishing goes straight back to PUBLISHED**, without a second trip
 *    through the console's review queue. The course was approved once and
 *    nothing about it can have changed since — there is no editor — so this
 *    only ever re-lists something the platform already said yes to. It is also
 *    what makes Unpublish safe to offer at all: a one-way button on an
 *    instructor's own catalog would be the kind of mistake
 *    `maintenance-dialog.tsx` exists to prevent.
 *  - **It refuses anything that is not in the state it expects**, the rule
 *    `admin-courses.ts`' own `decide()` states: two tabs open on one course is
 *    the ordinary case, and a stale one must not silently overwrite what
 *    happened in the other.
 *
 * `publishedAt` is left alone on both paths. The catalog's "new this month"
 * and the Reports chart count from it, and a course that has been on sale
 * since March did not become new again because it spent a week off the
 * catalog.
 */

export type PublishActionResult = { ok: boolean; message: string }

export async function setCoursePublished(
  courseId: string,
  published: boolean
): Promise<PublishActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Please sign in and try again." }
  if (!(await canTeach(session.user))) {
    return { ok: false, message: "Only instructors can manage a course." }
  }

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) {
    return { ok: false, message: "Only instructors can manage a course." }
  }

  const course = await db.course.findFirst({
    where: { id: courseId, instructorId: profile.id },
    select: { id: true, title: true, status: true },
  })
  if (!course) return { ok: false, message: "That course could not be found." }

  const from = published ? "ARCHIVED" : "PUBLISHED"
  if (course.status !== from) {
    return {
      ok: false,
      message: published
        ? "That course is not currently unpublished."
        : "That course is not currently published.",
    }
  }

  // One transaction, so the catalog and the audit trail cannot disagree about
  // whether it happened — the arrangement `admin-courses.ts` uses for its own
  // three decisions.
  await db.$transaction([
    db.course.update({
      where: { id: course.id },
      data: { status: published ? "PUBLISHED" : "ARCHIVED" },
    }),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        actorName: session.user.name,
        actorRole: session.user.role ?? null,
        action: published ? "course.republished" : "course.unpublished",
        targetType: "course",
        targetId: course.id,
        targetLabel: course.title,
        // A catalog change, so COURSES — `AuditCategory` has no CONTENT
        // member, the point the admin Categories page records.
        category: "COURSES",
      },
    }),
  ])

  // The **layout**, not the page: My Courses' KPI row, its tabs and the
  // catalog all move with this, and every filtered view of that list is a
  // different URL. The mechanism `lib/actions/wishlist.ts` documents for the
  // sidebar's counts.
  revalidatePath("/dashboard", "layout")

  return {
    ok: true,
    message: published
      ? `${course.title} is back in the catalog.`
      : `${course.title} is no longer on sale.`,
  }
}
