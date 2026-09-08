import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SettingsAccount } from "@/components/dashboard/settings/settings-account"
import { getAccount } from "@/lib/account"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Account settings · ${siteConfig.name}`,
}

/**
 * `/dashboard/settings/account`, built against
 * `ui-design/light/dashboard/student/settings-account-page.png`.
 *
 * Every value is real: `getAccount()` reads the signed-in user's row and
 * `lib/actions/account.ts` writes it back. The heading and the sections card
 * come from the group's layout, so this file is only the card.
 *
 * Null means the row vanished mid-request — the `(dashboard)` layout has
 * already turned an anonymous visitor away — and sign-in is still the only
 * sensible answer. Same shape as the profile route.
 */
export default async function Page() {
  const account = await getAccount()
  if (!account) redirect("/login")

  return <SettingsAccount account={account} />
}
