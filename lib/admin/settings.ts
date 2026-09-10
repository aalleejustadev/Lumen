import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import type { PlatformSetting } from "@/lib/generated/prisma/client"

/**
 * The reads behind `/dashboard/admin/settings/*`, from
 * `ui-design/light/dashboard/admin/platform-settings.png` and
 * `platform-settings__profile.png`.
 *
 * Pulls in `lib/db`, so the same "never import this from a Client Component"
 * rule as the rest of `lib/admin/` applies — and, as on every console page
 * since Users, the copy and the limits live in `lib/config/admin-settings.ts`
 * so the Platform Controls form can import them without dragging the Postgres
 * driver into the browser bundle.
 *
 * **Nothing on any of the four pages is demo data, and none of them needed a
 * migration.** `PlatformSetting` was already shaped for the Platform Controls
 * export, field for field and docstring for docstring — its
 * `defaultRevenueShareBps` note names the select's whole percentages, and
 * `maintenanceMode`'s quotes the danger zone's own sentence. The profile,
 * account and notification pages read the same `User` columns the learner's
 * settings pages already write.
 */

/**
 * `PlatformSetting` is a singleton: one row, always `id = "singleton"`.
 *
 * The id is a literal rather than "the first row" because the table has no
 * other legitimate contents — a second row would be a bug, and keying on a
 * known id is what makes the write an `upsert` instead of a find-then-update
 * that can race.
 */
export const PLATFORM_SETTING_ID = "singleton"

export type AdminProfile = {
  name: string
  email: string
  image: string | null
}

/**
 * The signed-in admin's own profile — the three fields
 * `platform-settings__profile.png` draws.
 *
 * Deliberately *not* `lib/profile.ts`' `getProfile`: that one resolves a
 * username, a bio and a URL list, and derives the 30-day handle lock. The
 * admin card has none of those fields, so reading them would be four columns
 * and a date computation nothing on the page renders.
 */
export async function getAdminProfile(): Promise<AdminProfile | null> {
  const session = await getSession()
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  })
  if (!user) return null

  return user
}

/**
 * The platform's own settings row, creating it on first read if it is absent.
 *
 * Every column has a schema default, so the row carries no information until
 * an admin changes something — which is why creating it here is safe rather
 * than presumptuous, and why `prisma/seed.ts` creates it with `update: {}` so
 * a re-run never overwrites what an admin has since set.
 *
 * A missing row is the fresh-clone case (a database that has never been
 * seeded). Returning a hardcoded set of TypeScript defaults instead would put
 * a second copy of every default next to the schema's, and the two would
 * drift the first time one was changed — so the row is materialised and the
 * schema stays the single source. The `create` is guarded against the race of
 * two first requests arriving together: the id is the primary key, so the
 * loser of that race gets a unique violation and simply re-reads.
 */
export async function getPlatformSettings(): Promise<PlatformSetting> {
  const existing = await db.platformSetting.findUnique({
    where: { id: PLATFORM_SETTING_ID },
  })
  if (existing) return existing

  try {
    return await db.platformSetting.create({
      data: { id: PLATFORM_SETTING_ID },
    })
  } catch {
    // Lost the race — the row exists now, so read it back rather than
    // failing a page whose only job is to render it.
    const row = await db.platformSetting.findUnique({
      where: { id: PLATFORM_SETTING_ID },
    })
    if (!row) throw new Error("Platform settings row could not be created")
    return row
  }
}
