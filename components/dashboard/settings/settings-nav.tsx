"use client"

import { SettingsNavCard } from "@/components/dashboard/settings/settings-nav-card"
import { settingsNav } from "@/lib/config/settings"

/**
 * The learner's settings sections card, from
 * `ui-design/light/dashboard/student/setting-profile-page.png`.
 *
 * The card itself is `settings-nav-card.tsx`, shared with the console and the
 * instructor workspace — all three exports draw the identical 228px column of
 * 40px rows, so the geometry is measured once. This file only binds the list,
 * which is what keeps the learner's four sections owned by
 * `lib/config/settings.ts` (the same list `lib/config/dashboard.ts` derives
 * the sidebar's Settings children from, so the card and the sidebar cannot
 * drift).
 *
 * The list is imported here rather than handed down as a prop because this
 * file is a Client Component: `SettingsNavItem.icon` is a component, and a
 * function cannot cross the server→client boundary. Importing it on this side
 * means nothing is ever serialized.
 */
function SettingsNav() {
  return <SettingsNavCard items={settingsNav} />
}

export { SettingsNav }
