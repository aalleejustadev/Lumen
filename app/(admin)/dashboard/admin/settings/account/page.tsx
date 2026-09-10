import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SettingsAccount } from "@/components/dashboard/settings/settings-account"
import { getAccount } from "@/lib/account"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Admin account · ${siteConfig.name}`,
}

/**
 * `/dashboard/admin/settings/account`.
 *
 * **There is no admin export for this section** — `platform-settings.png`
 * draws the Account row in the nav card and never opens it — so it renders
 * the learner's own account card, unchanged. That is the right answer rather
 * than a placeholder: the fields on it (name, date of birth, language, time
 * zone) are properties of a *person's* login, not of a learner, and an admin
 * has exactly the same four. A second copy would be one more form to keep in
 * step with `lib/actions/account.ts` for no difference on screen.
 *
 * It is the same reading the user gave for Notifications — one layout across
 * the student, instructor and admin modes — applied to the section next to
 * it. Profile is the one that genuinely diverges, and it has its own export
 * saying so.
 */
export default async function Page() {
  const account = await getAccount()
  if (!account) redirect("/login")

  return <SettingsAccount account={account} />
}
