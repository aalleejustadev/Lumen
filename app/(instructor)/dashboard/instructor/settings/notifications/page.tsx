import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SettingsNotifications } from "@/components/dashboard/instructor/settings/settings-notifications"
import { getInstructorNotificationSettings } from "@/lib/instructor-notifications"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Notification settings · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/settings/notifications`, from
 * `ui-design/light/dashboard/instructor/notification-settings-page.png` —
 * **this mode's own export**, which the learner's and the console's
 * notification settings were both built against first. It is finally
 * rendering on the screen it was drawn for.
 *
 * **The layout is shared; the options are not.** The learner's rows are about
 * the courses this person takes, which say nothing about the ones they teach,
 * so this page renders the instructor's own categories — see
 * `lib/config/instructor-notifications.ts`. That is why it does not simply
 * render the learner's `SettingsNotifications` the way `/account` renders the
 * learner's account card: those three columns are properties of a person's
 * login, where these describe a teaching business.
 *
 * These are notification *preferences* — a different page from the
 * `/dashboard/instructor/notifications` feed in the sidebar's General group,
 * which is what actually happened. The feed's gear button links here, and the
 * two share one category vocabulary so an instructor cannot switch a category
 * off and still be unable to explain why it kept arriving.
 *
 * The teaching guard lives in `app/(instructor)/layout.tsx` and the action
 * re-checks it. `null` here means the row vanished mid-request, and sign-in is
 * still the only sensible answer.
 */
export default async function Page() {
  const settings = await getInstructorNotificationSettings()
  if (!settings) redirect("/login")

  return <SettingsNotifications settings={settings} />
}
