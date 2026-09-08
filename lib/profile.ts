import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  USERNAME_CHANGE_DAYS,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/lib/config/settings"

/**
 * Reads for `/dashboard/settings/profile`. Pulls in `lib/db`, so the same
 * "never from a Client Component" rule as `lib/cart.ts` applies.
 */

export type Profile = {
  name: string
  email: string
  image: string | null
  username: string
  bio: string
  urls: string[]
  /**
   * `null` when the handle can be changed now; otherwise the date it unlocks.
   * Resolved here rather than in the form so the client never has to be
   * trusted with the rule — `updateProfile` re-derives it before writing.
   */
  usernameLockedUntil: Date | null
}

/**
 * Turn a display name into a usable handle: `"Ada Lovelace"` → `"adalovelace"`,
 * which is exactly what the export shows for a user named Ada Lovelace.
 *
 * Accounts arrive without a handle — Better Auth's sign-up collects a name,
 * and Google/GitHub hand us a name too — so the field would otherwise open
 * empty on a page whose own help text calls it "your public display name".
 * Seeding it keeps the form showing something real, and nothing is written
 * until the user saves.
 */
export function suggestUsername(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
  return slug.slice(0, USERNAME_MAX_LENGTH).padEnd(USERNAME_MIN_LENGTH, "0")
}

/** When a handle last changed at `changedAt`, the date it can change again. */
export function usernameUnlocksAt(changedAt: Date | null) {
  if (!changedAt) return null
  const unlocks = new Date(
    changedAt.getTime() + USERNAME_CHANGE_DAYS * 24 * 60 * 60 * 1000
  )
  return unlocks > new Date() ? unlocks : null
}

/**
 * The signed-in user's profile, or `null` when there is no session. The
 * dashboard layout already guards the route, so the page treats `null` as
 * "redirect" rather than rendering an empty form.
 *
 * `username` and `bio` are nullable columns but the form wants strings, so
 * they are coalesced here — one place, rather than at every input.
 */
export async function getProfile(): Promise<Profile | null> {
  const session = await getSession()
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      username: true,
      usernameChangedAt: true,
      bio: true,
      urls: true,
    },
  })
  if (!user) return null

  return {
    name: user.name,
    email: user.email,
    image: user.image,
    username: user.username ?? suggestUsername(user.name),
    bio: user.bio ?? "",
    urls: user.urls,
    usernameLockedUntil: usernameUnlocksAt(user.usernameChangedAt),
  }
}
