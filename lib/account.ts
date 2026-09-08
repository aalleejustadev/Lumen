import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * Reads for `/dashboard/settings/account`, the sibling of `lib/profile.ts`.
 * Pulls in `lib/db`, so the same "never from a Client Component" rule applies.
 */

export type Account = {
  name: string
  /**
   * `yyyy-MM-dd`, never a `Date`. The column is a Postgres `DATE` and a
   * birthday has no zone, so moving it as a plain string is what keeps it
   * from sliding a day when it crosses the server/client boundary or gets
   * formatted in a zone other than UTC. The form parses it into a *local*
   * midnight for the calendar and posts the same shape back.
   */
  dateOfBirth: string | null
  language: string | null
  timeZone: string | null
}

/** A `DATE` column comes back as UTC midnight — read the UTC parts, not local. */
export function toDateInput(value: Date | null): string | null {
  if (!value) return null
  return value.toISOString().slice(0, 10)
}

export async function getAccount(): Promise<Account | null> {
  const session = await getSession()
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      dateOfBirth: true,
      language: true,
      timeZone: true,
    },
  })
  if (!user) return null

  return {
    name: user.name,
    dateOfBirth: toDateInput(user.dateOfBirth),
    language: user.language,
    timeZone: user.timeZone,
  }
}
