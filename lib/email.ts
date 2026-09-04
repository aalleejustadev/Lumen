import { Resend } from "resend"

import { siteConfig } from "@/lib/config/site"

/**
 * Transactional email, used by the Better Auth handlers in `lib/auth.ts`.
 *
 * Resend only wakes up once `RESEND_API_KEY` is set; until then every message
 * is written to the server console with its link intact, so verification and
 * password-reset flows are testable before the domain is verified. That
 * fallback is deliberately noisy — and deliberately dev-only, since a
 * production deploy silently logging reset links would be a security problem.
 */
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const from = process.env.EMAIL_FROM ?? "Lumen <onboarding@resend.dev>"

type Mail = {
  to: string
  subject: string
  text: string
}

async function sendMail({ to, subject, text }: Mail) {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is not set — refusing to drop a transactional email in production."
      )
    }
    console.info(
      `\n[email:dev] to=${to}\n[email:dev] subject=${subject}\n${text}\n`
    )
    return
  }

  const { error } = await resend.emails.send({ from, to, subject, text })
  if (error) {
    throw new Error(`Resend refused the message: ${error.message}`)
  }
}

function sendVerificationEmail(to: string, url: string) {
  return sendMail({
    to,
    subject: `Verify your ${siteConfig.name} email`,
    text: `Confirm this address to finish setting up your ${siteConfig.name} account:\n\n${url}\n\nIf you didn't sign up, ignore this message.`,
  })
}

function sendPasswordResetEmail(to: string, url: string) {
  return sendMail({
    to,
    subject: `Reset your ${siteConfig.name} password`,
    text: `Choose a new password:\n\n${url}\n\nThe link expires in an hour. If you didn't ask for it, ignore this message — nothing has changed.`,
  })
}

export { sendMail, sendPasswordResetEmail, sendVerificationEmail }
