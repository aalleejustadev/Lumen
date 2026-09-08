import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SettingsProfile } from "@/components/dashboard/settings/settings-profile"
import { getProfile } from "@/lib/profile"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Profile settings · ${siteConfig.name}`,
}

/**
 * `/dashboard/settings/profile`, built against
 * `ui-design/light/dashboard/student/setting-profile-page.png`.
 *
 * Every value on this page is real: `getProfile()` reads the signed-in user's
 * row, and `lib/actions/profile.ts` writes it back. The heading and the
 * sections card come from the group's layout.
 *
 * The `(dashboard)` layout already redirects an anonymous visitor, so a null
 * profile here means the row vanished mid-request rather than "not signed
 * in"; sending them to sign-in is still the only sensible answer.
 */
export default async function Page() {
  const profile = await getProfile()
  if (!profile) redirect("/login")

  return <SettingsProfile profile={profile} />
}
