"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth, getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  emailChangeMessage,
  requestEmailChange,
  type EmailChangeOutcome,
} from "@/lib/email-change"
import { suggestUsername, usernameUnlocksAt } from "@/lib/profile"
import { deleteAvatar, putAvatar } from "@/lib/storage"
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  MAX_BIO_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PROFILE_URLS,
  USERNAME_CHANGE_DAYS,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/lib/config/settings"

/**
 * Writes for `/dashboard/settings/profile`. Reads are in `lib/profile.ts`.
 *
 * Same shape as `lib/actions/cart.ts` and `lib/actions/wishlist.ts`: re-check
 * the session, validate server-side, and return `{ ok, message }` for the
 * caller to toast instead of throwing. Nothing here trusts a value the client
 * sent — the handle rules in particular are re-derived from the stored
 * `usernameChangedAt` rather than from anything in the request.
 *
 * Note what is *not* here: `username`, `bio` and `urls` are deliberately not
 * Better Auth `additionalFields`. Declaring them there would put them in the
 * session cookie cache (a 400-character bio in a 4KB cookie) and, worse,
 * would let a client PATCH them straight through `/api/auth/update-user`,
 * skipping the uniqueness and 30-day checks below. They are plain Prisma
 * columns written only from here.
 *
 * The avatar is the exception and goes through `auth.api.updateUser`: `image`
 * is a core Better Auth field that the sidebar, app bar and account menu all
 * render from the *session*, and the session has a 5-minute cookie cache. A
 * bare `db.user.update` would leave the old picture on screen for up to five
 * minutes; going through Better Auth refreshes that cache with the write.
 */

export type ProfileFieldErrors = {
  name?: string
  email?: string
  username?: string
  bio?: string
  /** Indexed to match the submitted URL list, so each row can show its own. */
  urls?: (string | undefined)[]
}

export type ProfileActionResult = {
  ok: boolean
  message: string
  errors?: ProfileFieldErrors
}

const USERNAME_PATTERN = /^[a-z0-9_-]+$/

function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase()
}

/**
 * `https://example.com` with the scheme typed in, or `example.com` without —
 * the export's own values carry the scheme, but a bare host is what people
 * actually type, so one is added rather than rejected.
 *
 * Returns `null` for anything that still isn't an http(s) URL, which keeps a
 * `javascript:` href out of a column something will later render as a link.
 */
function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (!url.hostname.includes(".")) return null
    return url.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export async function updateProfile(
  formData: FormData
): Promise<ProfileActionResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, message: "Sign in to update your profile." }
  }

  const current = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      username: true,
      usernameChangedAt: true,
    },
  })
  if (!current) {
    return { ok: false, message: "We couldn't find your account." }
  }

  const errors: ProfileFieldErrors = {}

  // ---- Full name ---------------------------------------------------------
  // Moved here from the account form: the profile page is where identity
  // lives now, and the value was previously editable on both.
  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, MAX_NAME_LENGTH)
  if (name.length === 0) errors.name = "Enter your name."

  // ---- Username ----------------------------------------------------------
  const username = normalizeUsername(String(formData.get("username") ?? ""))
  // What `getProfile` showed the form when the column is still null, so a
  // save that leaves the seeded value alone doesn't count as a change.
  const effective = current.username ?? suggestUsername(current.name)
  const changed = username !== effective

  if (username.length < USERNAME_MIN_LENGTH) {
    errors.username = `Use at least ${USERNAME_MIN_LENGTH} characters.`
  } else if (username.length > USERNAME_MAX_LENGTH) {
    errors.username = `Use at most ${USERNAME_MAX_LENGTH} characters.`
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username =
      "Use lowercase letters, numbers, hyphens and underscores only."
  } else if (changed) {
    const lockedUntil = usernameUnlocksAt(current.usernameChangedAt)
    if (lockedUntil) {
      errors.username = `You can change this again on ${formatDate(lockedUntil)}.`
    } else {
      const taken = await db.user.findFirst({
        where: { username, NOT: { id: session.user.id } },
        select: { id: true },
      })
      if (taken) errors.username = "That username is already taken."
    }
  }

  // ---- Bio ---------------------------------------------------------------
  const bio = String(formData.get("bio") ?? "").trim()
  if (bio.length > MAX_BIO_LENGTH) {
    errors.bio = `Keep it under ${MAX_BIO_LENGTH} characters.`
  }

  // ---- URLs --------------------------------------------------------------
  // Empty rows are dropped rather than flagged: the form always keeps one
  // row on screen, so an untouched blank is not a mistake.
  const submitted = formData.getAll("url").map(String)
  const urlErrors: (string | undefined)[] = []
  const urls: string[] = []

  submitted.forEach((raw, index) => {
    if (!raw.trim()) return
    const normalized = normalizeUrl(raw)
    if (!normalized) {
      urlErrors[index] = "Enter a valid web address."
      return
    }
    if (urls.includes(normalized)) {
      urlErrors[index] = "You've already added that link."
      return
    }
    urls.push(normalized)
  })

  if (urls.length > MAX_PROFILE_URLS) {
    urlErrors[MAX_PROFILE_URLS] = `Up to ${MAX_PROFILE_URLS} links.`
  }
  if (urlErrors.some(Boolean)) errors.urls = urlErrors

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      errors,
    }
  }

  // ---- Email -------------------------------------------------------------
  // Attempted *before* the column write so a rejected address (already in
  // use, malformed) fails the whole save rather than leaving the other
  // fields written and the email silently dropped. It is the one field here
  // that Better Auth owns, and usually it does not apply at once — a
  // confirmation goes to the current address first. See `lib/email-change.ts`.
  const emailOutcome: EmailChangeOutcome = await requestEmailChange(
    session.user.id,
    current.email,
    String(formData.get("email") ?? "").slice(0, MAX_EMAIL_LENGTH)
  )
  if (emailOutcome.status === "error") {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      errors: { email: emailOutcome.message },
    }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      username,
      // Stamped only on a real change, or every save would restart the
      // 30-day clock and the second one would be refused.
      ...(changed ? { usernameChangedAt: new Date() } : {}),
      bio: bio || null,
      urls: urls.slice(0, MAX_PROFILE_URLS),
    },
  })

  // `name` goes through Better Auth rather than the update above: it is a
  // core field the sidebar, app bar and account menu render from the
  // *session*, which has a five-minute cookie cache, so a bare column write
  // would leave the old name in the chrome for up to five minutes.
  if (name !== current.name) {
    await auth.api.updateUser({ body: { name }, headers: await headers() })
  }

  // The chrome renders the name, so the whole shell re-renders rather than
  // just this route.
  revalidatePath("/dashboard", "layout")
  return {
    ok: true,
    message: [
      changed
        ? `Profile updated. Your username is locked for ${USERNAME_CHANGE_DAYS} days.`
        : "Profile updated.",
      emailChangeMessage(emailOutcome),
    ]
      .filter(Boolean)
      .join(" "),
  }
}

/**
 * Store a new avatar and point `User.image` at it.
 *
 * Kept separate from `updateProfile` because the export's "Upload image"
 * button sits outside the form's submit: picking a file applies straight
 * away, which is also what stops an image from being uploaded and then lost
 * when the user navigates away without saving.
 */
export async function uploadAvatar(
  formData: FormData
): Promise<ProfileActionResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, message: "Sign in to change your picture." }
  }

  const file = formData.get("image")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image to upload." }
  }
  if (!AVATAR_MIME_TYPES.includes(file.type as never)) {
    return { ok: false, message: "Use a JPEG, PNG, WebP or GIF image." }
  }
  if (file.size > AVATAR_MAX_BYTES) {
    const mb = Math.round(AVATAR_MAX_BYTES / (1024 * 1024))
    return { ok: false, message: `Images must be under ${mb}MB.` }
  }

  const url = await putAvatar(session.user.id, {
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type,
  })
  if (!url) {
    return {
      ok: false,
      message: "Image uploads aren't configured for this environment yet.",
    }
  }

  const previous = session.user.image ?? null
  await auth.api.updateUser({
    body: { image: url },
    headers: await headers(),
  })
  // Only ever collects an object under this user's own prefix — a Google or
  // GitHub avatar URL is left alone. See `lib/storage.ts`.
  await deleteAvatar(session.user.id, previous)

  // The layout renders the avatar for every dashboard route, so the whole
  // shell has to re-render — the same reason the cart and wishlist actions
  // revalidate the layout rather than their own page.
  revalidatePath("/dashboard", "layout")
  return { ok: true, message: "Profile picture updated." }
}
