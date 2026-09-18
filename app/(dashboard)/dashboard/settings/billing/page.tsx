import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SettingsBilling } from "@/components/dashboard/settings/settings-billing"
import { getSession } from "@/lib/auth"
import { getBilling } from "@/lib/billing"
import { siteConfig } from "@/lib/config/site"
import { syncSubscriptionsForCustomer } from "@/lib/subscription-sync"

export const metadata: Metadata = {
  title: `Billing · ${siteConfig.name}`,
}

/**
 * `/dashboard/settings/billing`, built against
 * `ui-design/light/dashboard/student/settings-billing-page.png`.
 *
 * Nothing on this page is demo data. Saved cards and the plan come from the
 * signed-in user's Stripe customer; the transaction table is their course
 * `order` rows merged with their Stripe subscription invoices, because a
 * renewal has no order behind it. Most accounts have none of those, so most of
 * the time this renders the export's shape with empty states — which is the
 * point: the moment a real purchase, plan or saved card exists, it appears
 * here without a line changing.
 *
 * **`?subscribed=1` reconciles before rendering**, and that is the one write
 * this route does. Stripe's Checkout sends a new subscriber back to this URL,
 * and it is the exact moment a missing row hurts most: the webhook owns
 * subscription state, but it is delivered to an endpoint, and one that was not
 * yet configured — or a tunnel that was not running — leaves somebody who has
 * *paid* with no plan and no way to get one. Pulling their subscriptions
 * straight from Stripe here closes that hole. It is deliberately **not** on
 * every render: the webhook is the design, this is the repair, and a page that
 * re-synced on each view would put a Stripe round trip in front of every visit
 * (`npm run stripe:reconcile` is the same call for fixing an account by hand).
 *
 * The heading and the sections card come from the group's layout.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ subscribed?: string }>
}) {
  const { subscribed } = await searchParams

  if (subscribed) {
    const session = await getSession()
    // Failing soft on purpose: a Stripe hiccup here must cost the reconcile,
    // not the billing page somebody was sent to.
    if (session) {
      await syncSubscriptionsForCustomer(session.user.id).catch(() => {})
    }
  }

  const billing = await getBilling()
  if (!billing) redirect("/login")

  return <SettingsBilling billing={billing} />
}
