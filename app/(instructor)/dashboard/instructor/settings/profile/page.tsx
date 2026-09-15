import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SettingsProfile } from "@/components/dashboard/settings/settings-profile"
import { getProfile } from "@/lib/profile"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Profile settings · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/settings/profile`, from
 * `ui-design/light/dashboard/instructor/profile-page.png`.
 *
 * **The card is the learner's component, unchanged**, and that is the whole
 * point: this export draws the same avatar, Username, Email, Bio and URL list
 * as `setting-profile-page.png`, over the same `User` row. A profile is a
 * property of a *person*, not of a mode — one account holds both — so a second
 * copy could only drift from `lib/actions/profile.ts` for no difference on
 * screen. It is the arrangement `/dashboard/admin/settings/account` already
 * makes with the learner's account form.
 *
 * Three things follow from that reuse, and all three are what was asked for:
 *
 *  - **Full name leads the form**, though this export does not draw it. That
 *    is the standing rule in `CLAUDE.md` — Profile owns identity in *every*
 *    mode, Account owns preferences — and it is what the console's profile
 *    card does too.
 *  - **Every field is inline editable, including Email.** The export draws
 *    Email as a disabled `<select>` whose help text points at "your email
 *    settings", a page that does not exist, so the control was a dead end.
 *    Changing it is still not a plain column write: Better Auth owns the
 *    address and `lib/email-change.ts` sends a confirmation to the address on
 *    the account *today* before the new one takes effect. Both other modes
 *    already work this way, from that one helper, so the three cannot answer
 *    "who is this account" differently.
 *  - The bio here is `User.bio`, **not `Instructor.bio`** — the one-liner the
 *    sale page's instructor card renders, and `Instructor.about` for the
 *    profile page's paragraphs. Those belong to the teaching profile and are
 *    edited where a course is, not here; this export's own help text ("You can
 *    @mention other learners and instructors") is about the personal one.
 *
 * `updateProfile` revalidates `/dashboard` as a layout, which covers this
 * shell too — so a new name or picture reaches the instructor sidebar's footer
 * and app bar without a navigation.
 *
 * The heading and the sections card come from the group's layout, and the
 * teaching guard from `app/(instructor)/layout.tsx`. `null` here means the row
 * vanished mid-request — that layout has already turned away anyone who may
 * not teach — and sign-in is still the only sensible answer.
 */
export default async function Page() {
  const profile = await getProfile()
  if (!profile) redirect("/login")

  return <SettingsProfile profile={profile} />
}
