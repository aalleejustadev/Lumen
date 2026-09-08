"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth, getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { languages, timeZoneIds } from "@/lib/config/locale"
import { MAX_NAME_LENGTH, MIN_AGE_YEARS } from "@/lib/config/settings"

/**
 * Writes for `/dashboard/settings/account`. Reads are in `lib/account.ts`.
 *
 * Same posture as `lib/actions/profile.ts`: re-check the session, validate
 * server-side, return `{ ok, message }` for the caller to toast. And the same
 * split over *where* each field is written —
 *
 *  - `name` goes through `auth.api.updateUser`. It is a core Better Auth
 *    field, and the sidebar, app bar and account menu all render it from the
 *    *session*, which has a 5-minute cookie cache; a bare `db.user.update`
 *    would leave the old name in the chrome for up to five minutes.
 *  - `dateOfBirth`, `language` and `timeZone` are plain Prisma columns and are
 *    deliberately not `additionalFields`, which would both bloat that cookie
 *    and let a client set them straight through `/api/auth/update-user`,
 *    skipping the checks below.
 */

export type AccountFieldErrors = {
  name?: string
  dateOfBirth?: string
  language?: string
  timeZone?: string
}

export type AccountActionResult = {
  ok: boolean
  message: string
  errors?: AccountFieldErrors
}

const languageCodes = new Set(languages.map((language) => language.value))

/**
 * `yyyy-MM-dd` → UTC midnight, which is what a `@db.Date` column wants.
 * Built from the parts rather than `new Date(value)` so a malformed string
 * fails here instead of silently becoming an `Invalid Date`, and so nothing
 * is ever interpreted in the server's local zone.
 */
function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ]
  const date = new Date(Date.UTC(year, month - 1, day))
  // Rejects 2026-02-30 and friends, which `Date.UTC` would happily roll over.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date
}

function yearsSince(date: Date) {
  const now = new Date()
  const years = now.getUTCFullYear() - date.getUTCFullYear()
  const beforeBirthday =
    now.getUTCMonth() < date.getUTCMonth() ||
    (now.getUTCMonth() === date.getUTCMonth() &&
      now.getUTCDate() < date.getUTCDate())
  return beforeBirthday ? years - 1 : years
}

export async function updateAccount(
  formData: FormData
): Promise<AccountActionResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, message: "Sign in to update your account." }
  }

  const errors: AccountFieldErrors = {}

  // ---- Name --------------------------------------------------------------
  // Collapsed rather than only trimmed: this is the string the chrome and
  // outgoing email render, and "Ada   Lovelace" is a typo, not a choice.
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ")
  if (name.length === 0) {
    errors.name = "Enter the name you'd like shown."
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Use at most ${MAX_NAME_LENGTH} characters.`
  }

  // ---- Date of birth -----------------------------------------------------
  // Optional: the export opens on "Pick a date", so an account that has never
  // set one is a valid state and clearing it has to stay possible.
  const rawDateOfBirth = String(formData.get("dateOfBirth") ?? "").trim()
  let dateOfBirth: Date | null = null
  if (rawDateOfBirth) {
    dateOfBirth = parseDateInput(rawDateOfBirth)
    if (!dateOfBirth) {
      errors.dateOfBirth = "Pick a valid date."
    } else {
      const age = yearsSince(dateOfBirth)
      if (age < 0) {
        errors.dateOfBirth = "That date is in the future."
      } else if (age < MIN_AGE_YEARS) {
        errors.dateOfBirth = `You need to be at least ${MIN_AGE_YEARS} to use Lumen.`
      } else if (age > 120) {
        errors.dateOfBirth = "Check that year — it doesn't look right."
      }
    }
  }

  // ---- Language / time zone ----------------------------------------------
  // Re-checked against the configured lists rather than stored as sent: these
  // arrive as opaque strings and end up in a column something will later
  // format or translate against.
  const rawLanguage = String(formData.get("language") ?? "").trim()
  if (rawLanguage && !languageCodes.has(rawLanguage)) {
    errors.language = "Choose a language from the list."
  }

  const rawTimeZone = String(formData.get("timeZone") ?? "").trim()
  if (rawTimeZone && !timeZoneIds.has(rawTimeZone)) {
    errors.timeZone = "Choose a time zone from the list."
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      errors,
    }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      dateOfBirth,
      language: rawLanguage || null,
      timeZone: rawTimeZone || null,
    },
  })

  if (name !== session.user.name) {
    await auth.api.updateUser({ body: { name }, headers: await headers() })
  }

  // The layout renders the name in the sidebar footer and the account menu, so
  // the whole shell re-renders — the same reason the cart, wishlist and avatar
  // actions revalidate the layout rather than their own page.
  revalidatePath("/dashboard", "layout")
  return { ok: true, message: "Account updated." }
}
