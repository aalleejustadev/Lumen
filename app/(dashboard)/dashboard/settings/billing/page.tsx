import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SettingsBilling } from "@/components/dashboard/settings/settings-billing"
import { getBilling } from "@/lib/billing"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Billing · ${siteConfig.name}`,
}

/**
 * `/dashboard/settings/billing`, built against
 * `ui-design/light/dashboard/student/settings-billing-page.png`.
 *
 * Nothing on this page is demo data. Saved cards and the plan come from the
 * signed-in user's Stripe customer; the transaction table comes from our own
 * `order` rows. Most accounts have no cards, no plan and no orders, so most
 * of the time this renders the export's shape with empty states — which is
 * the point: the moment a real purchase or a saved card exists, it appears
 * here without a line changing.
 *
 * The heading and the sections card come from the group's layout.
 */
export default async function Page() {
  const billing = await getBilling()
  if (!billing) redirect("/login")

  return <SettingsBilling billing={billing} />
}
