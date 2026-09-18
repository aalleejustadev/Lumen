import "server-only"

import type Stripe from "stripe"

import { BUSINESS_PLAN_KEY } from "@/lib/config/pricing"
import { db } from "@/lib/db"
import { getStripe } from "@/lib/stripe"
import type {
  SubscriptionInterval,
  SubscriptionStatus,
} from "@/lib/generated/prisma/client"

/**
 * The webhook's half of Lumen Business: everything that writes a
 * `Subscription` row.
 *
 * **A subscription integration is not finished without this**, which is the
 * one thing Stripe's own guidance is loudest about. Checkout tells you a plan
 * *started*; every later fact about it — the renewal that succeeded, the card
 * that failed, the cancellation somebody made in the Customer Portal, the
 * downgrade at period end — arrives only as an event, with no browser
 * involved. An integration that wrote the row on the return page would show
 * every customer as permanently subscribed from their first payment onwards.
 *
 * So `lib/subscription.ts` reads a row that this module is solely responsible
 * for, and the events it handles are listed in `app/api/stripe/webhook/route.ts`.
 *
 * Everything here is **idempotent**: delivery is at-least-once, events arrive
 * out of order often enough to matter, and `checkout.session.completed` and
 * `customer.subscription.created` both describe the same new plan.
 */

/** Stripe's status strings to ours. Anything unrecognised is treated as
 *  `INCOMPLETE` rather than dropped — an unknown status must not silently
 *  leave a stale `ACTIVE` row granting access. */
const STATUS: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE_EXPIRED",
  unpaid: "UNPAID",
  paused: "PAUSED",
}

/**
 * Which user a Stripe subscription belongs to.
 *
 * `metadata.userId` is written by `startBusinessCheckout` and is the fast
 * path. The customer lookup is the fallback that makes the integration
 * survive the cases metadata does not cover: a subscription created from the
 * Stripe Dashboard by hand, one migrated in, or one whose metadata was
 * dropped. Resolving through `User.stripeCustomerId` is what
 * `getOrCreateStripeCustomer` stores that column for.
 */
async function resolveUserId(
  subscription: Stripe.Subscription
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.userId
  if (fromMetadata) {
    const exists = await db.user.findUnique({
      where: { id: fromMetadata },
      select: { id: true },
    })
    if (exists) return exists.id
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id
  if (!customerId) return null

  const byCustomer = await db.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  })
  return byCustomer?.id ?? null
}

/**
 * The subscription's price, interval and period end.
 *
 * **`current_period_end` moved onto the subscription *item*** in recent API
 * versions — the same migration `lib/billing.ts` already documents — so it is
 * read from the first item and only falls back to the subscription-level field
 * for older payloads. Reading only the old location silently produces `null`
 * on a current account, which would leave the billing page unable to say when
 * the plan renews.
 */
function readItem(subscription: Stripe.Subscription) {
  const item = subscription.items?.data?.[0]
  const price = item?.price
  const recurring = price?.recurring

  const periodEnd =
    item?.current_period_end ??
    // Older API versions carried it here. The cast is the honest way to read a
    // field the current types no longer declare.
    (subscription as unknown as { current_period_end?: number })
      .current_period_end ??
    null

  return {
    priceId: price?.id ?? "",
    interval: (recurring?.interval === "year"
      ? "YEAR"
      : "MONTH") as SubscriptionInterval,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
  }
}

/**
 * Write what Stripe currently says about a subscription.
 *
 * Upsert keyed on `stripeSubscriptionId`, so the create and every later update
 * are the same call and an out-of-order redelivery cannot produce a second
 * row. The whole state is rewritten from the payload rather than patched,
 * because the payload *is* the current truth and merging fields is how a
 * cancelled plan keeps an `ACTIVE` status.
 */
async function syncSubscription(subscription: Stripe.Subscription) {
  const userId = await resolveUserId(subscription)
  if (!userId) {
    // Not an error: the Stripe account is shared with other projects (see the
    // billing note in CLAUDE.md), so subscriptions that belong to nobody here
    // are expected and must not fail the endpoint.
    return
  }

  const { priceId, interval, currentPeriodEnd } = readItem(subscription)
  const status = STATUS[subscription.status] ?? "INCOMPLETE"

  const data = {
    userId,
    stripePriceId: priceId,
    plan: BUSINESS_PLAN_KEY,
    status,
    interval,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    trialEndsAt: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : null,
  }

  await db.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: { stripeSubscriptionId: subscription.id, ...data },
    update: data,
  })
}

/**
 * A completed Checkout Session in `mode: "subscription"`.
 *
 * It **re-reads the subscription from Stripe** rather than trusting the thin
 * copy on the session: the session is a snapshot from the moment the customer
 * finished, and the subscription object carries the item, the period end and
 * the real status. It is also what makes this handler agree exactly with the
 * `customer.subscription.*` handler — one writer, one shape.
 */
async function fulfillSubscriptionCheckout(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return

  const stripe = getStripe()
  if (!stripe) return

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id
  if (!subscriptionId) return

  const subscription = await stripe.subscriptions
    .retrieve(subscriptionId)
    .catch(() => null)
  if (!subscription) return

  await syncSubscription(subscription)
}

/**
 * A subscription that has gone away.
 *
 * `customer.subscription.deleted` carries the final object with
 * `status: "canceled"`, so this is `syncSubscription` — the row is **kept**
 * rather than deleted. A cancelled plan is history somebody may ask about
 * ("when did I stop paying?"), and `ENTITLED_STATUSES` already excludes it, so
 * nothing is granted by its presence.
 */
async function cancelSubscription(subscription: Stripe.Subscription) {
  await syncSubscription(subscription)
}

/**
 * An invoice that paid or failed.
 *
 * Neither writes the row directly — Stripe raises a
 * `customer.subscription.updated` alongside, and having two writers for one
 * fact is how they end up disagreeing. What this does is re-read the
 * subscription so the row lands even if the update event is dropped or
 * arrives first, which is the belt Stripe's own subscription guidance asks
 * for.
 */
async function syncInvoiceSubscription(invoice: Stripe.Invoice) {
  const stripe = getStripe()
  if (!stripe) return

  // `subscription` is not on the current `Invoice` type in every SDK version;
  // reading it defensively is cheaper than pinning an API version here.
  const raw = (invoice as unknown as { subscription?: string | { id: string } })
    .subscription
  const subscriptionId = typeof raw === "string" ? raw : raw?.id
  if (!subscriptionId) return

  const subscription = await stripe.subscriptions
    .retrieve(subscriptionId)
    .catch(() => null)
  if (subscription) await syncSubscription(subscription)
}

/**
 * Pull every subscription Stripe holds for a user and write them all.
 *
 * **This is the repair path, and it exists because a webhook can be missed.**
 * The events are the design and stay authoritative, but they are delivered to
 * a URL — so a subscription bought while the endpoint was misconfigured, the
 * tunnel was down, or `stripe listen` simply was not running leaves somebody
 * who has *paid* with no row and therefore no plan. That happened in
 * development and would happen in production the first time an endpoint is
 * deployed late. An integration that cannot recover from a dropped event is an
 * integration that quietly keeps people's money without giving them anything.
 *
 * Called from two places, both deliberate: the billing page when Checkout
 * returns somebody to it with `?subscribed=1`, which is the exact moment a
 * missing row matters most, and `npm run stripe:reconcile` for repairing an
 * account by hand.
 */
async function syncSubscriptionsForCustomer(userId: string): Promise<number> {
  const stripe = getStripe()
  if (!stripe) return 0

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  })
  if (!user?.stripeCustomerId) return 0

  const subscriptions = await stripe.subscriptions
    // `status: "all"` on purpose — a cancelled subscription has to be written
    // too, or a row left `ACTIVE` by a missed `deleted` event keeps granting
    // the plan forever.
    .list({ customer: user.stripeCustomerId, status: "all", limit: 100 })
    .catch(() => null)
  if (!subscriptions) return 0

  for (const subscription of subscriptions.data) {
    await syncSubscription(subscription)
  }
  return subscriptions.data.length
}

export {
  cancelSubscription,
  fulfillSubscriptionCheckout,
  syncInvoiceSubscription,
  syncSubscription,
  syncSubscriptionsForCustomer,
}
