import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SettingsNotifications } from "@/components/dashboard/settings/settings-notifications"
import { siteConfig } from "@/lib/config/site"
import { getNotificationSettings } from "@/lib/notifications"

export const metadata: Metadata = {
  title: `Notification settings · ${siteConfig.name}`,
}

/**
 * `/dashboard/settings/notifications`, built against
 * `ui-design/light/dashboard/student/settings-notifications-page.png`.
 *
 * These are notification *preferences* — a different page from the
 * `/dashboard/notifications` feed the sidebar's General group links to.
 *
 * Every value is real: `getNotificationSettings()` reads the signed-in user's
 * row and `lib/actions/notifications.ts` writes it back. The heading and the
 * sections card come from the group's layout, so this file is only the card.
 *
 * Null means the row vanished mid-request — the `(dashboard)` layout has
 * already turned an anonymous visitor away — and sign-in is still the only
 * sensible answer. Same shape as the profile and account routes.
 */
export default async function Page() {
  const settings = await getNotificationSettings()
  if (!settings) redirect("/login")

  return <SettingsNotifications settings={settings} />
}
