import "server-only"

import type Stripe from "stripe"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getStripe } from "@/lib/stripe"

/**
 * Reads for `/dashboard/settings/billing`. Writes are in
 * `lib/actions/billing.ts`.
 *
 * Everything on that page is real: saved cards and the plan come from Stripe,
 * the transaction table comes from our own `order` rows. There is no demo
 * data anywhere in here — an account that has never paid for anything gets
 * empty states, which is the honest answer and what almost every account will
 * see today.
 *
 * The one thing worth knowing before changing any of it: **Lumen has no
 * subscription product.** Courses are one-time `mode: "payment"` purchases, so
 * `subscription` is `null` for every real account and the header renders its
 * "no plan" state. It is still read from Stripe rather than stubbed, so the
 * day a plan exists the page shows it without a change here.
 */

export type BillingCard = {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  /** Cardholder name, falling back to the customer's — the export shows one. */
  name: string | null
  /** The customer's `invoice_settings.default_payment_method`. */
  isDefault: boolean
}

export type BillingPlan = {
  /** "monthly" / "yearly" / "every 3 months" — built from the price interval. */
  interval: string
  /** Cents. `null` for a plan Stripe can't quote a next amount for. */
  amountCents: number | null
  currency: string
  nextPaymentAt: Date | null
  status: Stripe.Subscription.Status
  cancelAtPeriodEnd: boolean
}

export type BillingTransaction = {
  id: string
  /** `#36223` in the export — see `orderReference`. */
  reference: string
  product: string
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED"
  date: Date
  amountCents: number
  currency: string
}

export type Billing = {
  /** False when `STRIPE_SECRET_KEY` is blank — the page says so rather than 500ing. */
  configured: boolean
  plan: BillingPlan | null
  cards: BillingCard[]
  transactions: BillingTransaction[]
}

/**
 * How many orders the table lists.
 *
 * The export draws six rows, but that is its sample's size, not a designed
 * limit — there is no pager and no "showing 6 of N" line anywhere on it. A
 * section called "Transaction History" that silently hid older orders would be
 * worse than one that scrolls, so the cap is set well above what anyone is
 * likely to have rather than at the drawn row count. Add a pager here if that
 * ever stops being true.
 */
export const TRANSACTIONS_LIMIT = 50

/**
 * The `#36223` in the Reference column.
 *
 * Order ids are cuids — 25 characters of base36, which is not something a
 * person reads out over support. The export shows a short numeric handle, so
 * this derives a stable 5-digit one from the id: same order, same reference,
 * every render, with no extra column to keep in step. Collisions are possible
 * in principle and harmless in practice — nothing looks an order *up* by it,
 * and `id` is still what every query uses.
 */
export function orderReference(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 100000
  }
  return `#${String(hash).padStart(5, "0")}`
}

/**
 * The signed-in user's Stripe Customer, creating it on first use.
 *
 * A customer is what makes everything else on the billing page possible: a
 * saved card has to be attached to one, and Stripe's own `customer_email`
 * shortcut deliberately does *not* create a durable customer. Created lazily
 * rather than at sign-up so accounts that never reach checkout don't litter
 * the Stripe account, and so this works for the accounts that already exist.
 *
 * `metadata.userId` is the reverse link, which is what makes a customer
 * recognisable in the Dashboard and recoverable if the column is ever lost.
 */
export async function getOrCreateStripeCustomer(): Promise<string | null> {
  const session = await getSession()
  if (!session) return null

  const stripe = getStripe()
  if (!stripe) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true, email: true, name: true },
  })
  if (!user) return null

  if (user.stripeCustomerId) {
    // The stored id can be stale — a key rotated to a different Stripe
    // account, or the customer deleted in the Dashboard. Verify before
    // handing it out, or every later call fails with "No such customer".
    const existing = await stripe.customers
      .retrieve(user.stripeCustomerId)
      .catch(() => null)
    if (existing && !existing.deleted) return existing.id
  }

  const created = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: session.user.id },
  })

  await db.user.update({
    where: { id: session.user.id },
    data: { stripeCustomerId: created.id },
  })

  return created.id
}

/** The stored customer id, without creating one. Reads must not have side effects. */
async function readStripeCustomerId(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  })
  return user?.stripeCustomerId ?? null
}

function intervalLabel(price: Stripe.Price | null | undefined) {
  const recurring = price?.recurring
  if (!recurring) return "monthly"

  const singular: Record<string, string> = {
    day: "daily",
    week: "weekly",
    month: "monthly",
    year: "annually",
  }

  const count = recurring.interval_count ?? 1
  if (count === 1) {
    return singular[recurring.interval] ?? `every ${recurring.interval}`
  }
  return `every ${count} ${recurring.interval}s`
}

/**
 * The subscription behind the card's header, or `null`.
 *
 * `status: "all"` then filtered here, rather than asking Stripe for `active`
 * only: a subscription that is `past_due` or `trialing` is still the one the
 * header should describe, and one that is `canceled` should read as no plan.
 */
async function readPlan(
  stripe: Stripe,
  customerId: string
): Promise<BillingPlan | null> {
  const subscriptions = await stripe.subscriptions
    .list({
      customer: customerId,
      status: "all",
      limit: 10,
      expand: ["data.items.data.price"],
    })
    .catch(() => null)
  if (!subscriptions) return null

  const live = subscriptions.data.find((subscription) =>
    ["active", "trialing", "past_due", "unpaid"].includes(subscription.status)
  )
  if (!live) return null

  const item = live.items.data[0]
  const price = item?.price
  // `current_period_end` moved onto the subscription *item* in recent API
  // versions; read the item first and fall back for older shapes.
  const periodEnd =
    (item as { current_period_end?: number } | undefined)?.current_period_end ??
    (live as unknown as { current_period_end?: number }).current_period_end ??
    null

  const unit = price?.unit_amount ?? null
  const quantity = item?.quantity ?? 1

  return {
    interval: intervalLabel(price),
    amountCents: unit === null ? null : unit * quantity,
    currency: price?.currency ?? "usd",
    nextPaymentAt: periodEnd ? new Date(periodEnd * 1000) : null,
    status: live.status,
    cancelAtPeriodEnd: live.cancel_at_period_end,
  }
}

/**
 * The customer's saved cards, default first.
 *
 * Only `type: "card"` — the export draws card rows (brand, last four, expiry)
 * and there is nothing sensible to show for a wallet or a bank debit in that
 * shape. Anything else the customer has saved stays reachable through the
 * Stripe portal.
 */
async function readCards(
  stripe: Stripe,
  customerId: string
): Promise<BillingCard[]> {
  const [customer, methods] = await Promise.all([
    stripe.customers.retrieve(customerId).catch(() => null),
    stripe.paymentMethods
      .list({ customer: customerId, type: "card", limit: 20 })
      .catch(() => null),
  ])
  if (!methods) return []

  const defaultId =
    customer && !customer.deleted
      ? typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : (customer.invoice_settings?.default_payment_method?.id ?? null)
      : null

  const customerName =
    customer && !customer.deleted ? (customer.name ?? null) : null

  const cards = methods.data.flatMap<BillingCard>((method) => {
    const card = method.card
    if (!card) return []
    return [
      {
        id: method.id,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.exp_month,
        expYear: card.exp_year,
        name: method.billing_details?.name ?? customerName,
        isDefault: method.id === defaultId,
      },
    ]
  })

  // Default first, then newest — the export puts the "Primary" row on top.
  // Stripe already returns newest first, so a stable sort on `isDefault` is
  // all that is needed.
  return cards.sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
}

/**
 * The transaction table. Our own `order` rows, not Stripe's charges: an order
 * knows *what course* was bought (Stripe only knows a line-item name we sent
 * it), and it exists for abandoned checkouts too, which is what makes the
 * `pending` rows in the export real rather than decorative.
 *
 * `product` is the order's own snapshotted item titles — see `OrderItem`'s
 * note on why those are stored rather than looked up.
 */
async function readTransactions(
  userId: string,
  take: number
): Promise<BillingTransaction[]> {
  const orders = await db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      status: true,
      amountTotal: true,
      currency: true,
      createdAt: true,
      paidAt: true,
      items: { select: { title: true } },
    },
  })

  return orders.map((order) => ({
    id: order.id,
    reference: orderReference(order.id),
    product:
      order.items.length === 0
        ? "Course purchase"
        : order.items.length === 1
          ? order.items[0]!.title
          : `${order.items[0]!.title} + ${order.items.length - 1} more`,
    status: order.status,
    // Paid orders are dated by when the money arrived; anything still open or
    // failed by when it was started, since it has no payment date.
    date: order.paidAt ?? order.createdAt,
    amountCents: order.amountTotal,
    currency: order.currency,
  }))
}

/**
 * Everything the billing page renders, in one round trip per source.
 *
 * Returns `configured: false` with empty lists when there is no Stripe key,
 * the same posture `lib/stripe.ts` and `lib/storage.ts` take: the page says
 * billing isn't configured instead of throwing. The transaction table is
 * still filled in that case — it comes from our database, not Stripe.
 */
export async function getBilling(
  take = TRANSACTIONS_LIMIT
): Promise<Billing | null> {
  const session = await getSession()
  if (!session) return null

  const stripe = getStripe()
  const transactions = await readTransactions(session.user.id, take)

  if (!stripe) {
    return { configured: false, plan: null, cards: [], transactions }
  }

  // Deliberately *not* `getOrCreateStripeCustomer` — a page render must not
  // create a Stripe object as a side effect. An account with no customer yet
  // simply has no cards and no plan; one is created the first time they add a
  // card or open checkout.
  const customerId = await readStripeCustomerId(session.user.id)
  if (!customerId) {
    return { configured: true, plan: null, cards: [], transactions }
  }

  const [plan, cards] = await Promise.all([
    readPlan(stripe, customerId),
    readCards(stripe, customerId),
  ])

  return { configured: true, plan, cards, transactions }
}
