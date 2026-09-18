/**
 * Pull subscription state and abandoned-checkout state back out of Stripe for
 * every account that has a Stripe customer.
 *
 *   npm run stripe:reconcile
 *
 * **The webhook is the design; this is the repair.** Subscription rows and
 * order statuses are written by `app/api/stripe/webhook/route.ts`, and that
 * stays the only thing maintaining them in normal operation. But events are
 * delivered to a URL, so anything bought while the endpoint was not yet
 * configured — the usual case on a first deploy, and on any machine where
 * `stripe listen` was not running — simply never arrives. Without a way to
 * re-read the truth, an account that has paid is stuck without a plan and an
 * abandoned checkout is stuck on `pending` forever.
 *
 * It is safe to run repeatedly: every write is the same idempotent upsert the
 * webhook performs.
 */
import Stripe from "stripe"

import { db } from "../lib/db"
import type { SubscriptionStatus } from "../lib/generated/prisma/enums"

/** Stripe's statuses onto ours — the same table `lib/subscription-sync.ts`
 *  keeps, duplicated here only because a script must not import a
 *  `server-only` module. */
const STATUS_MAP: Partial<
  Record<Stripe.Subscription.Status, SubscriptionStatus>
> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE_EXPIRED",
  unpaid: "UNPAID",
  paused: "PAUSED",
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.error("STRIPE_SECRET_KEY is not set.")
    process.exit(1)
  }
  const stripe = new Stripe(key)

  // --- Subscriptions ------------------------------------------------------
  const users = await db.user.findMany({
    where: { stripeCustomerId: { not: null } },
    select: { id: true, email: true, stripeCustomerId: true },
  })

  let written = 0
  for (const user of users) {
    const subs = await stripe.subscriptions
      .list({ customer: user.stripeCustomerId!, status: "all", limit: 100 })
      .catch(() => null)
    if (!subs?.data.length) continue

    for (const sub of subs.data) {
      const item = sub.items?.data?.[0]
      const periodEnd =
        item?.current_period_end ??
        (sub as unknown as { current_period_end?: number }).current_period_end
      const status: SubscriptionStatus = STATUS_MAP[sub.status] ?? "INCOMPLETE"

      const data = {
        userId: user.id,
        stripePriceId: item?.price?.id ?? "",
        plan: "business",
        status,
        interval:
          item?.price?.recurring?.interval === "year"
            ? ("YEAR" as const)
            : ("MONTH" as const),
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      }
      await db.subscription.upsert({
        where: { stripeSubscriptionId: sub.id },
        create: { stripeSubscriptionId: sub.id, ...data },
        update: data,
      })
      written += 1
      console.log(`• ${user.email}: ${sub.id} → ${status}`)
    }
  }
  console.log(`subscriptions reconciled: ${written}`)

  // --- Abandoned checkouts ------------------------------------------------
  // A PENDING order whose session Stripe says is `expired` should say so.
  // These are real abandoned checkouts, not demo rows — leaving them pending
  // makes a billing page look like it is showing invented data.
  const pending = await db.order.findMany({
    // `stripeSessionId` is a required, unique column — every order has one.
    where: { status: "PENDING" },
    select: { id: true, stripeSessionId: true },
  })

  let expired = 0
  for (const order of pending) {
    const checkout = await stripe.checkout.sessions
      .retrieve(order.stripeSessionId)
      .catch(() => null)
    if (!checkout) continue
    if (checkout.status === "expired") {
      await db.order.update({
        where: { id: order.id },
        data: { status: "EXPIRED" },
      })
      expired += 1
    }
  }
  console.log(
    `orders marked expired: ${expired} (of ${pending.length} pending)`
  )
  await db.$disconnect()
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error)
  await db.$disconnect()
  process.exit(1)
})
