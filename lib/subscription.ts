import "server-only"

import { cache } from "react"

import { getSession } from "@/lib/auth"
import {
  type BillingPeriod,
  type BusinessOffer,
  BUSINESS_PLAN_ID,
  plans,
} from "@/lib/config/pricing"
import { db } from "@/lib/db"
import { getStripe } from "@/lib/stripe"
import type { SubscriptionStatus } from "@/lib/generated/prisma/client"

/**
 * Lumen Business — the platform's one subscription — read from our own rows.
 *
 * **The `Subscription` table is the source of truth for entitlement, not
 * Stripe.** Every surface that asks "is this learner on the plan?" runs on a
 * page render (the sidebar's upgrade card, the course-content gate), and an
 * API call to Stripe on each of those would put a third-party network hop in
 * the critical path of the dashboard shell — and take the whole app down with
 * Stripe when it has a bad day. The row is written by the webhook
 * (`lib/subscription-sync.ts`), which is the only delivery Stripe guarantees,
 * so it is the thing that stays correct through a renewal, a card failure and
 * a cancellation. `lib/billing.ts` still reads Stripe directly for the billing
 * page's plan header, which is a different job: that page is *about* the
 * Stripe state and is worth a round trip.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; `lib/config/pricing.ts` holds the copy and is safe to import
 * anywhere.
 */

/**
 * The statuses that grant the plan, and there is deliberately **one list** for
 * "shows as subscribed" and "may watch the courses".
 *
 *  - `ACTIVE` and `TRIALING` are the plain yes.
 *  - **`PAST_DUE` is also yes**, and that is the interesting one: Stripe keeps
 *    a subscription `past_due` while it retries a failed card, for weeks under
 *    the default dunning settings. Cutting access on the first failed retry
 *    would lock a paying customer out over an expired card before Stripe has
 *    even told them; Stripe's own guidance is to keep serving through the
 *    retry window and let dunning do its job. It becomes `canceled` or
 *    `unpaid` when that window closes, and both are no.
 *
 * Two lists — one for the badge, a stricter one for access — was the other
 * option and is how a customer ends up being told they are subscribed on one
 * screen and locked out on the next.
 */
const ENTITLED_STATUSES: SubscriptionStatus[] = [
  "ACTIVE",
  "TRIALING",
  "PAST_DUE",
]

/**
 * The Stripe Price behind each billing period.
 *
 * Env rather than a stored column: a Price id belongs to one Stripe account,
 * so it is environment configuration in exactly the way the keys beside it
 * are — the test account and the live account have different ids for the same
 * plan. `scripts/stripe-setup.ts` creates both and prints them.
 *
 * **They are server-only and never `NEXT_PUBLIC_`.** The browser has no
 * business naming a price: `startBusinessCheckout` takes a *period* and
 * resolves the id here, so a hand-edited request cannot subscribe somebody to
 * an arbitrary price — the rule `lib/actions/checkout.ts` follows when it
 * builds `line_items` from rows the server read itself.
 */
function businessPriceId(period: BillingPeriod): string | null {
  const value =
    period === "yearly"
      ? process.env.STRIPE_BUSINESS_PRICE_YEARLY
      : process.env.STRIPE_BUSINESS_PRICE_MONTHLY
  return value?.trim() ? value.trim() : null
}

/** Whether the plan can actually be bought — both prices and a Stripe client. */
function isBusinessConfigured(): boolean {
  return Boolean(
    getStripe() && businessPriceId("monthly") && businessPriceId("yearly")
  )
}

/**
 * The signed-in learner's live Business subscription, or `null`.
 *
 * Wrapped in React `cache`: on a dashboard render the layout asks (to decide
 * whether to draw the upgrade card) and the course page's access gate asks
 * again, and without it that is two queries for one fact.
 */
const getBusinessSubscription = cache(async function getBusinessSubscription() {
  const session = await getSession()
  if (!session) return null

  return db.subscription.findFirst({
    where: { userId: session.user.id, status: { in: ENTITLED_STATUSES } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      interval: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  })
})

/** Whether the signed-in learner is on the plan. */
async function hasBusinessPlan(): Promise<boolean> {
  return (await getBusinessSubscription()) !== null
}

/**
 * Whether *this* user — named, not the session — is on the plan.
 *
 * Separate from `hasBusinessPlan` because the course-content gate already has
 * a resolved session and should not read it twice, and because a future
 * server-side job (a mailer, a report) has a user id and no session at all.
 */
async function userHasBusinessPlan(userId: string): Promise<boolean> {
  const row = await db.subscription.findFirst({
    where: { userId, status: { in: ENTITLED_STATUSES } },
    select: { id: true },
  })
  return row !== null
}

/**
 * Amounts read back off the Stripe Prices, so the page cannot advertise one
 * figure and charge another.
 *
 * Cached in the module for five minutes rather than per request: a price
 * changes about never, this runs on the marketing home page as well as
 * `/pricing`, and a Stripe round trip on every anonymous visit to the front
 * page is a cost with nothing to show for it. A cold or failed read falls back
 * to the strings in `lib/config/pricing.ts`, which is what the setup script
 * created the prices *from* — so the fallback is right rather than merely
 * safe.
 */
const PRICE_TTL_MS = 5 * 60 * 1000
let priceCache: { at: number; value: Record<BillingPeriod, string> } | null =
  null

async function livePrices(): Promise<Record<BillingPeriod, string> | null> {
  const stripe = getStripe()
  if (!stripe) return null

  if (priceCache && Date.now() - priceCache.at < PRICE_TTL_MS) {
    return priceCache.value
  }

  const ids = {
    monthly: businessPriceId("monthly"),
    yearly: businessPriceId("yearly"),
  }
  if (!ids.monthly || !ids.yearly) return null

  try {
    const [monthly, yearly] = await Promise.all([
      stripe.prices.retrieve(ids.monthly),
      stripe.prices.retrieve(ids.yearly),
    ])
    const value = {
      monthly: formatPrice(monthly.unit_amount, monthly.currency),
      yearly: formatPrice(yearly.unit_amount, yearly.currency),
    }
    if (!value.monthly || !value.yearly) return null

    priceCache = {
      at: Date.now(),
      value: value as Record<BillingPeriod, string>,
    }
    return priceCache.value
  } catch {
    // A price that no longer resolves is a misconfiguration, not an outage —
    // the page falls back to its own copy rather than failing to render.
    return null
  }
}

/** Stripe's minor units to the page's own "$29" — no cents when there are none,
 *  which is what the design draws and what every other price on the site does. */
function formatPrice(amount: number | null, currency: string): string | null {
  if (amount === null) return null
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}

/**
 * Everything the pricing card needs and only the server can answer: which of
 * the four buttons to draw, and what the plan actually costs.
 */
async function getBusinessOffer(): Promise<BusinessOffer> {
  const fallback = plans.find((plan) => plan.id === BUSINESS_PLAN_ID)
  const suffix = fallback?.suffix ?? { monthly: "/month", yearly: "/year" }
  const configured = isBusinessConfigured()

  const [session, subscription, live] = await Promise.all([
    getSession(),
    configured ? getBusinessSubscription() : Promise.resolve(null),
    configured ? livePrices() : Promise.resolve(null),
  ])

  const price = live ?? fallback?.price ?? { monthly: "$29", yearly: "$299" }

  const state = !configured
    ? "unconfigured"
    : !session
      ? "anonymous"
      : subscription
        ? "subscribed"
        : "available"

  return { state, price, suffix }
}

export {
  businessPriceId,
  ENTITLED_STATUSES,
  getBusinessOffer,
  getBusinessSubscription,
  hasBusinessPlan,
  isBusinessConfigured,
  userHasBusinessPlan,
}
