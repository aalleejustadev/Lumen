"use client"

import { SettingsNavCard } from "@/components/dashboard/settings/settings-nav-card"
import { adminSettingsNav } from "@/lib/config/admin-settings"

/**
 * The console's settings sections card, from
 * `ui-design/light/dashboard/admin/platform-settings.png`.
 *
 * The card itself is `settings-nav-card.tsx`, shared with the learner's
 * settings and the instructor workspace's — measured against those exports the
 * geometry is **identical** (a 228px nav card, a 28px gutter and a 922px form
 * card, adding to the same 1178px content column), so none of it is
 * re-measured per mode. This file only binds the list, and the lists are
 * separate because the sections differ: the learner has Billing where the
 * admin has Platform Controls.
 *
 * `"use client"` for the reason `settings-nav.tsx` gives: the list carries
 * icon *components*, which cannot be serialized across the server→client
 * boundary, so it is imported on this side rather than passed down.
 */
function AdminSettingsNav() {
  return <SettingsNavCard items={adminSettingsNav} />
}

export { AdminSettingsNav }
