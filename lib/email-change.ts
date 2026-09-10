import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { MAX_EMAIL_LENGTH } from "@/lib/config/settings"

/**
 * Changing the address on your own account, shared by the learner's
 * `updateProfile` and the admin's `updateAdminProfile`.
 *
 * It lives in its own module rather than in either action because a
 * `"use server"` file may only export async *actions* — a helper exported
 * from one becomes a public endpoint. Both callers need the identical
 * behaviour, and email is the one field where "identical" matters: it is
 * Better Auth's identity key, so two implementations that drifted would mean
 * two different answers to "who is this account".
 *
 * **The confirmation goes to the address on the account today**, not to the
 * new one — Better Auth's design, and the right one, for the reason
 * `lib/email.ts`' template spells out. So a successful call usually leaves
 * the stored address *unchanged* until the link is clicked, which is why the
 * outcome distinguishes "applied" from "pending" rather than reporting a
 * flat success. Saying "email updated" while the old address is still live
 * would be a lie the user only discovers at the next sign-in.
 *
 * Which of the two happens is decided by Better Auth (an unverified account
 * can be configured to change outright), so it is **observed rather than
 * predicted**: the row is re-read after the call and the outcome reports what
 * actually landed. That keeps the message honest if the auth config changes.
 */

export type EmailChangeOutcome =
  | { status: "unchanged" }
  /** Applied immediately — the stored address is now `email`. */
  | { status: "applied"; email: string }
  /** A confirmation link was sent to `sentTo`; nothing has changed yet. */
  | { status: "pending"; sentTo: string }
  | { status: "error"; message: string }

/**
 * Deliberately loose. The exhaustive grammar is not worth reproducing and a
 * false negative here locks somebody out of their own settings page; this
 * catches the typo the field actually receives. The address is proven by the
 * confirmation link either way, which is a far better check than a regex.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function requestEmailChange(
  userId: string,
  currentEmail: string,
  raw: string
): Promise<EmailChangeOutcome> {
  const next = String(raw ?? "")
    .trim()
    .toLowerCase()
    .slice(0, MAX_EMAIL_LENGTH)

  if (next.length === 0)
    return { status: "error", message: "Enter an email address." }
  if (next === currentEmail.trim().toLowerCase()) return { status: "unchanged" }
  if (!EMAIL_PATTERN.test(next)) {
    return { status: "error", message: "Enter a valid email address." }
  }

  // Checked before the call so the answer is a sentence rather than Better
  // Auth's own error string. It is not a guarantee — two people can race the
  // same address — which is why the catch below still has to handle it.
  const taken = await db.user.findFirst({
    where: { email: next, NOT: { id: userId } },
    select: { id: true },
  })
  if (taken) {
    return { status: "error", message: "That email is already in use." }
  }

  try {
    await auth.api.changeEmail({
      body: { newEmail: next },
      headers: await headers(),
    })
  } catch {
    return {
      status: "error",
      message: "That email couldn't be changed. Try again.",
    }
  }

  const after = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })

  return after?.email.toLowerCase() === next
    ? { status: "applied", email: next }
    : { status: "pending", sentTo: currentEmail }
}

/** The sentence each outcome adds to the form's toast. */
export function emailChangeMessage(outcome: EmailChangeOutcome): string | null {
  switch (outcome.status) {
    case "applied":
      return "Your email address was updated."
    case "pending":
      return `Confirm the change from the link we sent to ${outcome.sentTo}.`
    default:
      return null
  }
}
