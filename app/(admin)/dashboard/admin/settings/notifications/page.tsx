import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AdminSettingsNotifications } from "@/components/dashboard/admin/settings/admin-settings-notifications"
import { getAdminNotificationSettings } from "@/lib/admin/notifications"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Admin notifications · ${siteConfig.name}`,
}

/**
 * `/dashboard/admin/settings/notifications`, on the layout
 * `ui-design/light/dashboard/instructor/notification-settings-page.png`
 * draws — the same card every mode's notification settings use.
 *
 * **The layout is shared; the options are not.** The learner's rows are about
 * their courses, marketing and discussions, which say nothing to somebody
 * running the platform, so this page renders the console's own work queues
 * instead — see `lib/config/admin-notifications.ts`. That is why it does not
 * simply render `SettingsNotifications` the way `/account` renders the
 * learner's account card.
 *
 * These are notification *preferences* — a different page from the
 * `/dashboard/notifications` feed.
 *
 * The role guard lives in `app/(admin)/layout.tsx`. `null` here means the row
 * vanished mid-request, and sign-in is still the only sensible answer.
 */
export default async function Page() {
  const settings = await getAdminNotificationSettings()
  if (!settings) redirect("/login")

  return <AdminSettingsNotifications settings={settings} />
}
