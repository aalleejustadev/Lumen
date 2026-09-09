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
