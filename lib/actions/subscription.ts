"use server"

import { getSession } from "@/lib/auth"
import { getOrCreateStripeCustomer } from "@/lib/billing"
import { BUSINESS_PLAN_KEY, type BillingPeriod } from "@/lib/config/pricing"
import { getStripe } from "@/lib/stripe"
import { businessPriceId, getBusinessSubscription } from "@/lib/subscription"

/**
 * Starting a Lumen Business subscription.
 *
 * **Stripe's hosted Checkout, not the Elements panel the cart uses.** That
 * panel exists because `checkout-page.png` draws a bespoke two-column layout
 * and a back link Stripe's own page cannot produce; there is no export for a
 * subscription checkout, and the hosted page brings trials, proration, SCA,
 * tax and the dunning-friendly card collection for nothing. Building a second
 * custom form to charge a recurring price would be work spent losing features.
 *
 * Four things about it are decisions:
 *
 *  - **The client sends a period, never a price id.** `businessPriceId`
 *    resolves it server-side from env, so a hand-edited request cannot
 *    subscribe somebody to an arbitrary — or free — price. The rule
 *    `lib/actions/checkout.ts` follows when it builds `line_items` from rows
 *    the server read itself.
 *  - **It refuses a second subscription.** Stripe will happily create one, and
 *    then the customer is billed twice for a plan they already have; the
 *    existing row is checked first and the caller is sent to the portal
 *    instead.
 *  - **No `payment_method_types`.** Omitting it is what enables dynamic
 *    payment methods — Stripe's own guidance treats passing it as a mistake in
 *    every non-Terminal integration, and hardcoding `["card"]` would lock out
 *    the wallets that convert best.
 *  - **No trial.** `subscription_data` sets none, at the user's instruction,
 *    which is why the button says "Get Lumen Business" rather than the
 *    export's "Start free trial". Add `trial_period_days` here and change that
 *    label in the same commit — the two must not disagree.
 *
 * Fulfilment is **not** here. It is `lib/subscription-sync.ts`, reached from
 * the webhook, for the reason that module's own header gives.
 */

/** Tags the session in the Dashboard so subscription checkouts can be compared
 *  against the cart's. Stripe asks for an 8-letter suffix. */
const INTEGRATION_IDENTIFIER = "lumen-business-sub-vkzdrpma"

export type SubscriptionActionResult =
  { ok: true; url: string } | { ok: false; message: string }

export async function startBusinessCheckout(
  period: BillingPeriod
): Promise<SubscriptionActionResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, message: "Sign in to start a plan." }
  }

  const stripe = getStripe()
  if (!stripe) {
    return { ok: false, message: "Subscriptions aren't configured yet." }
  }

  // Validated rather than trusted: this value crosses from the browser, and
  // anything but these two would resolve to the monthly price silently.
  const billing: BillingPeriod = period === "yearly" ? "yearly" : "monthly"
  const price = businessPriceId(billing)
  if (!price) {
    return { ok: false, message: "Subscriptions aren't configured yet." }
  }

  const existing = await getBusinessSubscription()
  if (existing) {
    return {
      ok: false,
      message: "You're already on Lumen Business. Manage it from Billing.",
    }
  }

  const customer = await getOrCreateStripeCustomer()
  if (!customer) {
    return { ok: false, message: "Could not start checkout. Try again." }
  }

  const origin = process.env.BETTER_AUTH_URL
  if (!origin) {
    // The same call `lib/actions/checkout.ts` makes: Better Auth already needs
    // the real origin, and a second constant for it is a second thing to get
    // wrong on a deploy.
    return { ok: false, message: "Could not start checkout. Try again." }
  }

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      // Written onto the subscription rather than only the session, because
      // the webhook's `customer.subscription.*` events never see the session.
      subscription_data: {
        metadata: { userId: session.user.id, plan: BUSINESS_PLAN_KEY },
      },
      metadata: { userId: session.user.id, plan: BUSINESS_PLAN_KEY },
      integration_identifier: INTEGRATION_IDENTIFIER,
      success_url: `${origin}/dashboard/settings/billing?subscribed=1`,
      cancel_url: `${origin}/pricing`,
      // Lets somebody change their mind on Stripe's page without coming back
      // and starting again.
      allow_promotion_codes: true,
    })

    if (!checkout.url) {
      return { ok: false, message: "Could not start checkout. Try again." }
    }
    return { ok: true, url: checkout.url }
  } catch {
    return { ok: false, message: "Could not start checkout. Try again." }
  }
}
