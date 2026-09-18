export type BillingPeriod = "monthly" | "yearly"

/**
 * The one plan on this page that is a real Stripe subscription.
 *
 * Named rather than matched on a string in four places — the pricing section,
 * the sidebar's upgrade card, `lib/subscription.ts` and the setup script all
 * address it, and an id typo would fail silently as "no such plan".
 */
export const BUSINESS_PLAN_ID = "lumen-business"

/** What `Subscription.plan` stores. Separate from the display id because the
 *  column is written by a webhook and outlives any marketing rename. */
export const BUSINESS_PLAN_KEY = "business"

export type Plan = {
  id: string
  name: string
  /** Same value for both periods when the plan isn't a subscription. */
  price: Record<BillingPeriod, string>
  suffix: Record<BillingPeriod, string>
  description: string
  features: string[]
  cta: { label: string; href: string }
  featured?: boolean
}

export const plans: Plan[] = [
  {
    id: "per-course",
    name: "Per course",
    price: { monthly: "$12–17", yearly: "$12–17" },
    suffix: { monthly: "one-off", yearly: "one-off" },
    description: "Buy a course outright and keep it for life.",
    features: [
      "Lifetime access to what you buy",
      "Certificate on completion",
      "Full Q&A and discussions",
      "30-day refund guarantee",
    ],
    cta: { label: "Browse courses", href: "/courses" },
  },
  {
    id: "lumen-business",
    name: "Lumen Business",
    price: { monthly: "$29", yearly: "$299" },
    suffix: { monthly: "/month", yearly: "/year" },
    description:
      "Every course from every instructor, while your plan is active.",
    features: [
      "All 12,000 courses unlocked",
      "New releases included",
      "Team seats and reporting",
      "Priority support",
      "Cancel any time",
    ],
    // **Not "Start free trial".** There is no trial — `subscription_data`
    // sets none — and a button promising one is the kind of lie the billing
    // page's plan line already refuses. The href is only used for the
    // signed-out case; a signed-in visitor gets a real checkout button
    // instead, so the label is overridden per state by `businessCta`.
    cta: { label: "Get Lumen Business", href: "/register" },
    featured: true,
  },
  {
    id: "teach-on-lumen",
    name: "Teach on Lumen",
    price: { monthly: "Free", yearly: "Free" },
    suffix: { monthly: "to publish", yearly: "to publish" },
    description: "No listing fees. You only share revenue when you earn.",
    features: [
      "Unlimited courses and students",
      "Keep up to 70% of revenue",
      "Analytics, coupons, and payouts",
      "Monthly payouts from $100",
    ],
    cta: { label: "Become an instructor", href: "/teach" },
  },
]

/**
 * What the Business card's button says and does, by who is looking at it.
 *
 * Four states rather than one button, because each is a different promise:
 * an anonymous visitor cannot be charged before they have an account, a
 * subscriber must not be sold the plan twice, and an unconfigured Stripe must
 * say so rather than opening a checkout that would throw — the treatment every
 * unbuilt surface in this app gets.
 */
export type BusinessOfferState =
  "anonymous" | "available" | "subscribed" | "unconfigured"

export const businessCta: Record<
  BusinessOfferState,
  { label: string; hint?: string }
> = {
  anonymous: { label: "Get Lumen Business" },
  available: { label: "Get Lumen Business" },
  subscribed: { label: "Manage plan", hint: "You are on this plan." },
  unconfigured: {
    label: "Get Lumen Business",
    hint: "Subscriptions aren't configured yet.",
  },
}

/** Everything the pricing card needs that only the server can answer. */
export type BusinessOffer = {
  state: BusinessOfferState
  /** Live from Stripe when configured, the strings above otherwise — so the
   *  page can never advertise a price different from the one it charges. */
  price: Record<BillingPeriod, string>
  suffix: Record<BillingPeriod, string>
}
