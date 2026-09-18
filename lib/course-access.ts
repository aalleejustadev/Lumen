import { cache } from "react"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { userHasBusinessPlan } from "@/lib/subscription"

/**
 * Who may see a database course's **paid** lesson content — the uploaded
 * video, the article body, the quiz questions.
 *
 * Until lessons carried real content there was nothing to protect: the
 * enrolled course page drew a gradient for every course, so it had no gate on
 * purpose (its route's own note). Now it plays the instructor's actual video,
 * and a page that serves that to any signed-in visitor would give the course
 * away to anybody who guessed its URL.
 *
 * Four answers are yes:
 *
 *  - **An `Enrollment` row for this viewer.** The model has no status column,
 *    so a row is access; a refund that should revoke it would delete the row.
 *  - **The course's own instructor**, so *Preview as student* shows the whole
 *    course they are building rather than a locked one.
 *  - **An admin**, who reviews courses in the console and has to be able to
 *    watch one.
 *  - **A live Lumen Business subscription**, when the course is PUBLISHED and
 *    carries `Course.includedInBusiness`. That is the plan's entire promise —
 *    "All courses unlocked", which `lib/config/pricing.ts` has advertised
 *    since before anything could be bought — and it is what that column was
 *    added for; nothing read it until now. Two conditions rather than one:
 *    **PUBLISHED**, because a subscription must not open a draft or a course
 *    the console rejected, which no learner was ever meant to see; and the
 *    **opt-in flag**, which is per course and defaults true, so an instructor
 *    can keep one out of the plan. It grants *access*, not enrolment — no
 *    `Enrollment` row is written, so My Learning, the certificate flow and the
 *    instructor's student list still describe people who actually enrolled.
 *    Access ends with the plan, which is the difference between renting and
 *    buying and is what the card's own "while your plan is active" says.
 *
 * Everyone else sees the lessons marked free preview and a lock on the rest.
 * The check runs **on the server, before the content is read**, so a locked
 * lesson's video URL and article body never reach the page at all — hiding
 * them in the browser would still ship them.
 *
 * Wrapped in React `cache` for the course page, which asks once for the
 * syllabus and once for the lesson on screen.
 */
export const canAccessCourseContent = cache(
  async function canAccessCourseContent(courseId: string): Promise<boolean> {
    const session = await getSession()
    if (!session) return false
    if (session.user.role === "admin") return true

    const [enrollment, owned] = await Promise.all([
      db.enrollment.findUnique({
        where: {
          userId_courseId: { userId: session.user.id, courseId },
        },
        select: { id: true },
      }),
      db.course.findFirst({
        where: { id: courseId, instructor: { userId: session.user.id } },
        select: { id: true },
      }),
    ])
    if (enrollment !== null || owned !== null) return true

    // Asked last, and only when the cheap answers have all said no: the plan
    // is the uncommon case, and this is two more queries on a gate that runs
    // for every lesson on the page.
    if (!(await userHasBusinessPlan(session.user.id))) return false

    const included = await db.course.findFirst({
      where: { id: courseId, status: "PUBLISHED", includedInBusiness: true },
      select: { id: true },
    })
    return included !== null
  }
)
