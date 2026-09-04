import type { Metadata } from "next"

import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Reset your password · ${siteConfig.name}`,
  description: "We'll send a link to reset your password.",
}

/**
 * Better Auth's emailed link hits `/api/auth/reset-password/:token`, which
 * validates the token and bounces back here with either `?token=` or
 * `?error=`. Both land as search params, so this one route covers asking for a
 * link and setting the new password.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams

  return <ResetPasswordForm token={token} linkError={error} />
}
