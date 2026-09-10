import type { Metadata } from "next"

import { AdminSettingsPlatform } from "@/components/dashboard/admin/settings/admin-settings-platform"
import { getPlatformSettings } from "@/lib/admin/settings"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Platform controls · ${siteConfig.name}`,
}

/**
 * `/dashboard/admin/settings/platform`, from
 * `ui-design/light/dashboard/admin/platform-settings.png` — the section that
 * export actually opens.
 *
 * **Nothing on it is demo data and it needed no migration**: `PlatformSetting`
 * was already shaped for this screen, field for field. `getPlatformSettings`
 * materialises the singleton row on first read, so a database that has never
 * been seeded renders the schema's own defaults rather than an empty form.
 *
 * No `redirect` on a null: unlike the other three sections this page reads
 * the platform rather than the person, so there is no user row to be missing
 * — the role guard in `app/(admin)/layout.tsx` is the whole gate.
 */
export default async function Page() {
  const settings = await getPlatformSettings()

  return <AdminSettingsPlatform settings={settings} />
}
