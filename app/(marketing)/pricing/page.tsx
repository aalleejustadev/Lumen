import type { Metadata } from "next"

import { PricingSection } from "@/components/marketing/pricing-section"
import { getBusinessOffer } from "@/lib/subscription"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Buy a course outright, or unlock every course on Lumen with Lumen Business.",
}

/**
 * `/pricing` — **the route the whole site was already linking at.**
 *
 * `siteConfig`'s header nav, the sidebar's upgrade card and the Business
 * plan's own CTA all pointed here and it did not exist: every one of them was
 * a 404, which is the dead link this codebase refuses everywhere else. It
 * renders the section the marketing home page already carries rather than a
 * second arrangement of the same three cards, so the two can never drift.
 *
 * It is a Server Component because `getBusinessOffer` decides which of the
 * four Business buttons this visitor gets, and that needs the session and the
 * subscription row — see `lib/subscription.ts`.
 */
export default async function PricingPage() {
  const offer = await getBusinessOffer()

  return <PricingSection offer={offer} />
}
