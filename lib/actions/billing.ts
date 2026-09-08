"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getOrCreateStripeCustomer } from "@/lib/billing"
import { getStripe } from "@/lib/stripe"

/**
 * Writes for `/dashboard/settings/billing`. Reads are in `lib/billing.ts`.
 *
 * Same posture as the other action modules: re-check the session, do the work
 * server-side, return `{ ok, message }` for the caller to toast. The rule that
 * matters most here is that **every payment-method id is re-checked against
 * the caller's own customer before it is touched.** A payment method id is not
 * a secret and `pm_…` ids are handed to the browser, so an action that
 * detached whatever id it was given would let one account remove or re-point
 * another account's card. `ownsPaymentMethod` is that gate, and nothing below
 * skips it.
 */

export type BillingActionResult = { ok: boolean; message: string }

const NOT_CONFIGURED =
  "Billing isn't configured for this environment yet." as const

/**
 * Whether `paymentMethodId` is attached to this user's Stripe customer.
 *
 * Stripe's `paymentMethods.retrieve` returns the method regardless of who it
 * belongs to, so the check is on the `customer` field it comes back with —
 * comparing that against the id stored on *our* row, which the client never
 * supplies.
 */
async function ownsPaymentMethod(customerId: string, paymentMethodId: string) {
  const stripe = getStripe()
  if (!stripe) return false

  const method = await stripe.paymentMethods
    .retrieve(paymentMethodId)
    .catch(() => null)
  if (!method) return false

  const owner =
    typeof method.customer === "string"
      ? method.customer
      : (method.customer?.id ?? null)

  return owner === customerId
}

/**
 * A SetupIntent client secret for the "Add payment method" dialog.
 *
 * SetupIntents, not the deprecated Sources or Tokens APIs — this is what
 * Stripe's own guidance says to use for saving a payment method for later.
 * `usage: "off_session"` because the point of saving is to charge it on a
 * later purchase without the customer present.
 *
 * No `payment_method_types`: omitting it is what keeps dynamic payment
 * methods on, exactly as `lib/actions/checkout.ts` does. Setting it would pin
 * the dialog to a fixed list forever.
 */
export async function createSetupIntent(): Promise<
  { ok: true; clientSecret: string } | { ok: false; message: string }
> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to add a card." }

  const stripe = getStripe()
  if (!stripe) return { ok: false, message: NOT_CONFIGURED }

  const customerId = await getOrCreateStripeCustomer()
  if (!customerId) return { ok: false, message: NOT_CONFIGURED }

  const intent = await stripe.setupIntents.create({
    customer: customerId,
    usage: "off_session",
    metadata: { userId: session.user.id },
  })

  if (!intent.client_secret) {
    return { ok: false, message: "Stripe did not return a client secret." }
  }

  return { ok: true, clientSecret: intent.client_secret }
}

/**
 * Called once the dialog's SetupIntent has confirmed, to re-render the list.
 *
 * It takes no id and trusts nothing: the card is already attached by Stripe
 * at that point, so all this does is invalidate the page so the server reads
 * the customer's methods again. The *first* saved card is also made the
 * default — otherwise a customer with exactly one card would have no
 * "Primary" row, and Stripe would have no method to fall back on for an
 * off-session charge.
 */
export async function syncPaymentMethods(): Promise<BillingActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to manage billing." }

  const stripe = getStripe()
  if (!stripe) return { ok: false, message: NOT_CONFIGURED }

  const customerId = await db.user
    .findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    })
    .then((user) => user?.stripeCustomerId ?? null)
  if (!customerId) return { ok: false, message: NOT_CONFIGURED }

  const [customer, methods] = await Promise.all([
    stripe.customers.retrieve(customerId).catch(() => null),
    stripe.paymentMethods
      .list({ customer: customerId, type: "card", limit: 20 })
      .catch(() => null),
  ])

  const hasDefault =
    customer && !customer.deleted
      ? Boolean(customer.invoice_settings?.default_payment_method)
      : false

  if (!hasDefault && methods?.data.length) {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: methods.data[0]!.id },
    })
  }

  revalidatePath("/dashboard/settings/billing")
  return { ok: true, message: "Payment method added." }
}

/** Make one saved card the customer's default — the export's "Primary" badge. */
export async function setDefaultPaymentMethod(
  paymentMethodId: string
): Promise<BillingActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to manage billing." }

  const stripe = getStripe()
  if (!stripe) return { ok: false, message: NOT_CONFIGURED }

  const customerId = await db.user
    .findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    })
    .then((user) => user?.stripeCustomerId ?? null)
  if (!customerId) return { ok: false, message: NOT_CONFIGURED }

  if (!(await ownsPaymentMethod(customerId, paymentMethodId))) {
    return { ok: false, message: "That card isn't on your account." }
  }

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  })

  revalidatePath("/dashboard/settings/billing")
  return { ok: true, message: "Primary card updated." }
}

/**
 * Detach a saved card.
 *
 * Detaching is the right operation, not deleting: a `PaymentMethod` that has
 * been used for a payment stays referenced by that PaymentIntent forever, and
 * Stripe has no delete for it. Detaching removes it from the customer, which
 * is what "remove this card" means.
 *
 * If the detached card was the default, the next one becomes it — leaving a
 * customer with cards but no default would break any future off-session
 * charge.
 */
export async function removePaymentMethod(
  paymentMethodId: string
): Promise<BillingActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to manage billing." }

  const stripe = getStripe()
  if (!stripe) return { ok: false, message: NOT_CONFIGURED }

  const customerId = await db.user
    .findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    })
    .then((user) => user?.stripeCustomerId ?? null)
  if (!customerId) return { ok: false, message: NOT_CONFIGURED }

  if (!(await ownsPaymentMethod(customerId, paymentMethodId))) {
    return { ok: false, message: "That card isn't on your account." }
  }

  await stripe.paymentMethods.detach(paymentMethodId)

  const remaining = await stripe.paymentMethods
    .list({ customer: customerId, type: "card", limit: 20 })
    .catch(() => null)
  if (remaining?.data.length) {
    const customer = await stripe.customers
      .retrieve(customerId)
      .catch(() => null)
    const stillDefault =
      customer && !customer.deleted
        ? Boolean(customer.invoice_settings?.default_payment_method)
        : false
    if (!stillDefault) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: remaining.data[0]!.id },
      })
    }
  }

  revalidatePath("/dashboard/settings/billing")
  return { ok: true, message: "Card removed." }
}

/**
 * A Stripe Customer Portal session, which is where "Change plan" goes.
 *
 * Lumen has no plan product of its own yet (courses are one-time purchases),
 * so there is no in-app plan picker to send anyone to. The portal is Stripe's
 * own answer for this — it manages subscriptions, invoices and payment
 * methods for a customer with no UI of ours to maintain — and it is real
 * rather than a placeholder.
 *
 * It needs a **default portal configuration**, which is created in the Stripe
 * Dashboard (Settings → Billing → Customer portal) and cannot be created from
 * here. Without one the API errors, so that case is turned into a message the
 * button can show rather than an unhandled throw.
 */
export async function createBillingPortalSession(): Promise<
  { ok: true; url: string } | { ok: false; message: string }
> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to manage billing." }

  const stripe = getStripe()
  if (!stripe) return { ok: false, message: NOT_CONFIGURED }

  const origin = process.env.BETTER_AUTH_URL
  if (!origin) {
    return { ok: false, message: "BETTER_AUTH_URL must be set." }
  }

  const customerId = await getOrCreateStripeCustomer()
  if (!customerId) return { ok: false, message: NOT_CONFIGURED }

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/settings/billing`,
    })
    return { ok: true, url: portal.url }
  } catch {
    return {
      ok: false,
      message:
        "The Stripe customer portal isn't set up yet. Configure it in the Stripe Dashboard under Settings → Billing.",
    }
  }
}
