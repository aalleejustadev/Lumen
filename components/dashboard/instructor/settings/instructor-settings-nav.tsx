"use client"

import { SettingsNavCard } from "@/components/dashboard/settings/settings-nav-card"
import { instructorSettingsNav } from "@/lib/config/instructor-settings"

/**
 * The instructor workspace's settings sections card, from
 * `ui-design/light/dashboard/instructor/profile-page.png`.
 *
 * The card itself is `settings-nav-card.tsx`, shared with the learner's and
 * the console's. Measured off this export at DPR 2 the shell is **identical**
 * to both of theirs — a 228px nav card, a 27px gutter and a 923px form card
 * inside a 1179px content column — so nothing here is re-measured; see
 * `app/(instructor)/dashboard/instructor/settings/layout.tsx`.
 *
 * Only Profile is built, so this is the first of the three cards where the
 * `built` flag actually does something: the other three rows render as inert
 * text rather than links onto a 404.
 *
 * `"use client"` for the reason `settings-nav.tsx` gives: the list carries
 * icon *components*, which cannot be serialized across the server→client
 * boundary, so it is imported on this side rather than passed down.
 */
function InstructorSettingsNav() {
  return <SettingsNavCard items={instructorSettingsNav} />
}

export { InstructorSettingsNav }
