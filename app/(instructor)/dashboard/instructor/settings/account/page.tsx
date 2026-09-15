import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SettingsAccount } from "@/components/dashboard/settings/settings-account"
import { getAccount } from "@/lib/account"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Account settings · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/settings/account`, from
 * `ui-design/light/dashboard/instructor/account-page.png`.
 *
 * **It is the learner's card, unchanged** — the arrangement
 * `/dashboard/admin/settings/account` already makes, and for that route's own
 * reason: date of birth, language and time zone are properties of a *person's*
 * login rather than of a learner, and one account holds every mode, so a
 * second copy could only drift from `lib/actions/account.ts` for no difference
 * on screen. Checked against this export field by field, the shipped form is
 * already what it draws: the same three controls in the same order, the same
 * "Select language" and "(GMT+00:00) London" placeholders, the same
 * `Popover` + `Calendar` behind "Pick a date", and the same "Update account".
 *
 * **The one divergence is the export's Name field, and it is deliberate.**
 * Profile owns identity in every mode and Account owns preferences — the
 * standing rule in `CLAUDE.md` — so `updateAccount` no longer writes `name` at
 * all and neither the learner's nor the console's account card draws it. This
 * export was drawn before that split; reproducing it here would put the same
 * value on two of this mode's own pages, which is exactly what the split
 * removed. Full name is one field up the nav card, on
 * `/dashboard/instructor/settings/profile`.
 *
 * `getAccount()` reads the signed-in user's row and returns `null` only if it
 * vanished mid-request — `app/(instructor)/layout.tsx` has already turned away
 * anyone who may not teach — and sign-in is still the only sensible answer.
 * The heading and the sections card come from the group's layout.
 */
export default async function Page() {
  const account = await getAccount()
  if (!account) redirect("/login")

  return <SettingsAccount account={account} />
}
