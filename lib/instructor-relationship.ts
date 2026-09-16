import { cache } from "react"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * What the signed-in viewer may do with the instructor on
 * `/dashboard/instructors/[slug]` — the header's **Follow** and **Message**.
 *
 * Both were drawn by the export and did nothing. Two rules decide them now:
 *
 *  - **Anyone may follow**, except the instructor themselves, and only an
 *    instructor with an `Instructor` row: a follow is an `InstructorFollow`
 *    row, and three of the static catalog's instructors exist only in
 *    `lib/config/instructor-profiles.ts`, with nothing to attach one to. Their
 *    button renders disabled with the reason rather than failing on click.
 *  - **Message appears only for a viewer enrolled in one of this instructor's
 *    courses.** That is the rule `resolvePairing` (`lib/messages.ts`) already
 *    enforces on every conversation — a learner may write to the instructor of
 *    a course they are enrolled in — so the button is that rule made visible,
 *    and `openInstructorConversation` calls the same function again before
 *    writing anything. Enrolment means an `Enrollment` row; the demo catalog's
 *    My Learning progress is config, not enrolment, and does not count.
 *
 * `messageCourses` is one entry per enrolled course because a conversation is
 * per (learner, instructor, course) — the Messages page groups threads that
 * way — so a learner in two of this instructor's courses chooses which one
 * they are writing about. An existing thread is reopened rather than
 * duplicated.
 *
 * **It never throws.** This is the *secondary* read on a page whose job is to
 * show a profile: the profile itself comes from `getPublicInstructor`, which
 * answers the whole static catalog without a database at all. So a failure
 * here — a database that is down, or the `instructor_follow` migration not yet
 * deployed — must cost the viewer two buttons, not the page. Before this it
 * cost the page, because an uncaught error in a Server Component takes the
 * whole route down with it, and a student reading somebody's profile has no
 * interest in whether the follow table exists. The reason is logged rather
 * than swallowed, so the cause is still findable in the server output; it is
 * the posture `payout-run-dialog.tsx`' loader takes with its own `.catch()`.
 */
export type ProfileRelationship = {
  /** The viewer is this instructor. Neither button is drawn. */
  isSelf: boolean
  /** Whether a follow can be stored at all. */
  followable: boolean
  following: boolean
  followerCount: number
  /** The viewer's enrolled courses taught by this instructor. Empty means no
   *  Message button. */
  messageCourses: { id: string; title: string }[]
}

export const getProfileRelationship = cache(
  async function getProfileRelationship(
    instructorSlug: string
  ): Promise<ProfileRelationship> {
    const none: ProfileRelationship = {
      isSelf: false,
      followable: false,
      following: false,
      followerCount: 0,
      messageCourses: [],
    }

    try {
      return await read(instructorSlug, none)
    } catch (error) {
      console.error(
        `[instructor-relationship] falling back for "${instructorSlug}" — ` +
          `Follow and Message are hidden. Is the instructor_follow migration ` +
          `deployed? Run: npm run db:deploy`,
        error
      )
      return none
    }
  }
)

async function read(
  instructorSlug: string,
  none: ProfileRelationship
): Promise<ProfileRelationship> {
  const session = await getSession()
  if (!session) return none

  const instructor = await db.instructor.findUnique({
    where: { slug: instructorSlug },
    select: { id: true, userId: true },
  })
  if (!instructor) return none

  if (instructor.userId === session.user.id) {
    return { ...none, isSelf: true }
  }

  const [following, followerCount, enrollments] = await Promise.all([
    db.instructorFollow.findUnique({
      where: {
        userId_instructorId: {
          userId: session.user.id,
          instructorId: instructor.id,
        },
      },
      select: { id: true },
    }),
    db.instructorFollow.count({ where: { instructorId: instructor.id } }),
    // An instructor with no account has nobody to receive a message.
    instructor.userId
      ? db.enrollment.findMany({
          where: {
            userId: session.user.id,
            course: { instructorId: instructor.id },
          },
          orderBy: { createdAt: "desc" },
          select: { course: { select: { id: true, title: true } } },
        })
      : Promise.resolve([]),
  ])

  return {
    isSelf: false,
    followable: true,
    following: following !== null,
    followerCount,
    messageCourses: enrollments.map((row) => row.course),
  }
}
