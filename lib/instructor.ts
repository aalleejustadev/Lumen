import { cache } from "react"

import { db } from "@/lib/db"

/**
 * Whether the header should still be inviting this account to teach.
 *
 * Pulls in `lib/db`, so the same "never import this from a Client Component"
 * rule as `lib/cart.ts` applies.
 *
 * "Become an Instructor" is an invitation, and an invitation only makes sense
 * to someone who hasn't accepted it. Three kinds of account are therefore
 * excluded:
 *
 *  - **admins**, who administer the platform rather than sell on it;
 *  - **accounts already carrying the `instructor` role**, which is what the
 *    Better Auth `admin` plugin's `role` column holds once an application is
 *    approved;
 *  - **accounts with a teaching profile**, i.e. an `Instructor` row pointing
 *    at them. That row is the thing the sale and profile pages render, so its
 *    existence — not the role string — is what "is an instructor" really
 *    means; the role can lag behind a seeded or hand-created profile.
 *
 * A *pending* application is deliberately not excluded: they have applied, not
 * arrived, and until it is approved the link is still the page that tells them
 * where their application stands.
 *
 * `cache` dedupes it per request the way `getSession` does, so the layout can
 * ask without adding a query to every dashboard navigation beyond the first.
 */
export const canBecomeInstructor = cache(
  async function canBecomeInstructor(user: {
    id: string
    role?: string | null
  }) {
    if (user.role === "admin" || user.role === "instructor") return false

    const profile = await db.instructor.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })

    return profile === null
  }
)

/**
 * The instructor **mode's** permission check, and the counterpart of
 * `canBecomeInstructor` above: that one answers "should we still be inviting
 * this account to teach", this one answers "may this account teach *now*".
 *
 * The test is the `Instructor` row, not the role string, for the reason
 * `canBecomeInstructor` already gives — that row is what the sale and profile
 * pages render, so its existence is what "is an instructor" really means, and
 * the role can lag behind a seeded or hand-created profile. The role is
 * accepted as well so an account approved through
 * `/dashboard/admin/users?tab=pending-instructors` is not locked out of the
 * mode in the window before its profile row is written.
 *
 * **`User.intent` is deliberately not consulted.** That field is the
 * "I want to teach" box on the sign-up form — a stated interest with nothing
 * behind it, which anybody can tick. The real path in is an
 * `InstructorApplication` an admin approves; letting a sign-up checkbox open
 * the mode would make the application flow decorative.
 *
 * `cache` dedupes it per request the way `getSession` does, so the layout's
 * guard, the sidebar's switch and any page underneath share one query.
 */
export const getInstructorProfile = cache(async function getInstructorProfile(
  userId: string
) {
  return db.instructor.findUnique({
    where: { userId },
    select: { id: true, slug: true, name: true },
  })
})

/**
 * Whether the workspace switch should offer Instructor at all — and therefore
 * whether `app/(instructor)/layout.tsx` lets this account in. Both read it, so
 * the control and the guard can never disagree about who may teach.
 */
export const canTeach = cache(async function canTeach(user: {
  id: string
  role?: string | null
}) {
  if (user.role === "instructor") return true
  return (await getInstructorProfile(user.id)) !== null
})
