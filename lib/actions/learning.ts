"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { setLessonComplete } from "@/lib/completion"
import { db } from "@/lib/db"

/**
 * What a learner does *to* a course they are enrolled in.
 *
 * Today that is one thing: marking a lesson complete, which is the event the
 * whole completion chain hangs off — `Enrollment.completedAt`, the
 * certificate, the instructor's congratulations note and both notifications
 * all follow from it (`lib/completion.ts`).
 *
 * **The enrolment is resolved from the session, never taken from the client.**
 * A lesson id crosses from the browser, so the write is scoped by
 * `(userId, courseId)` and the lesson is reached *through* its course — the
 * `owned()` pattern `lib/actions/instructor-course-edit.ts` uses from the
 * other side. A stray id therefore addresses nothing rather than somebody
 * else's progress.
 */

export type LearningActionResult = { ok: boolean; message?: string }

export async function markLessonComplete(
  lessonId: string,
  complete = true
): Promise<LearningActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to track your progress." }

  // The lesson, its course, and this viewer's enrolment on that course — in
  // one query, so a lesson that belongs to a course they have not enrolled in
  // simply comes back with no enrolment attached.
  const lesson = await db.courseLesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      section: {
        select: {
          course: {
            select: {
              id: true,
              slug: true,
              enrollments: {
                where: { userId: session.user.id },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  const course = lesson?.section.course
  const enrollmentId = course?.enrollments[0]?.id
  if (!course || !enrollmentId) {
    // Deliberately the same answer for "no such lesson" and "not enrolled" —
    // the console's own reasoning about not letting somebody tell the two
    // apart.
    return {
      ok: false,
      message: "That lesson isn't part of a course you're taking.",
    }
  }

  await setLessonComplete({ enrollmentId, lessonId, complete })

  // The learner shell as a **layout**: the lesson row, the syllabus, the
  // progress card, My Learning and the certificates page all move together,
  // and the sidebar's counts are rendered by the layout.
  revalidatePath("/dashboard", "layout")

  return { ok: true }
}
