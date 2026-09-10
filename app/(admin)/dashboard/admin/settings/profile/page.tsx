import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AdminSettingsProfile } from "@/components/dashboard/admin/settings/admin-settings-profile"
import { getAdminProfile } from "@/lib/admin/settings"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Admin profile · ${siteConfig.name}`,
}

/**
 * `/dashboard/admin/settings/profile`, from
 * `ui-design/light/dashboard/admin/platform-settings__profile.png`.
 *
 * Every value is real: `getAdminProfile()` reads the signed-in admin's row
 * and `lib/actions/admin-settings.ts` writes it back. The heading and the
 * sections card come from the group's layout, so this file is only the card.
 *
 * The role guard lives in `app/(admin)/layout.tsx`. `null` here means the row
 * vanished mid-request — the layout has already turned away anyone who is not
 * an admin — and sign-in is still the only sensible answer, the same shape
 * the learner's settings routes use.
 */
export default async function Page() {
  const profile = await getAdminProfile()
  if (!profile) redirect("/login")

  return <AdminSettingsProfile profile={profile} />
}
