"use server"

import type Stripe from "stripe"

import { getSession } from "@/lib/auth"
import { getOrCreateStripeCustomer } from "@/lib/billing"
import { getCart } from "@/lib/cart"
import { db } from "@/lib/db"
import { getStripe } from "@/lib/stripe"

/**
 * Opens (or re-opens) a Stripe Checkout Session for the signed-in user's cart
 * and returns its client secret. `components/checkout/checkout-payment.tsx`
 * hands that to `CheckoutElementsProvider`.
 *
 * Everything the customer is charged for is assembled here, from cart rows the
 * server read itself — the client sends no amounts, no slugs and no titles, so
 * there is nothing in the request to tamper with. That is the whole reason
 * this is an action rather than a fetch the browser could shape.
 *
 * `ui_mode: "elements"` (what the docs call the *custom* flow) rather than
 * `embedded_page`: the export is Lumen's own layout — its columns are
 * `--background`/`--card` and its borders `--border`, and it puts "Back to
 * cart" *inside* the panel — none of which is reachable inside Stripe's
 * embedded iframe. In this mode Stripe supplies only the payment inputs and we
 * own every other pixel. See `components/checkout/`.
 */

/** Stripe works in minor units; catalog prices are dollars as `number`. */
function toCents(price: number) {
  return Math.round(price * 100)
}

/**
 * Tags every session this flow opens so the Dashboard can compare it against
 * any future checkout surface (a one-click buy, a subscription upgrade).
 * Stripe asks for a random 8-letter suffix on the label; it is a constant here
 * rather than generated per call, because the point is to identify the
 * *integration*, not the session.
 */
const INTEGRATION_IDENTIFIER = "lumen-cart-checkout-qwbtmxhd"

/** How long an abandoned session is worth picking back up. */
const REUSE_WINDOW_MS = 60 * 60 * 1000

/**
 * Payment methods kept out of the form, leaving Card and Amazon Pay.
 *
 * `excluded_payment_method_types`, **not** `payment_method_types`. Listing the
 * methods you want switches off dynamic payment methods entirely, pinning the
 * form to that list forever and losing Stripe's per-customer ranking; the
 * exclusion list subtracts from whatever the Dashboard has enabled and leaves
 * everything else dynamic. Stripe's own integration guidance treats passing
 * `payment_method_types` as a mistake in every non-Terminal integration.
 *
 * The other half of this lives in the Dashboard's payment-method settings —
 * **anything enabled there and not named below will appear**, so this list is
 * a subtraction, not a whitelist. Klarna is here for exactly that reason: it
 * was enabled on the account and would have taken the slot Bank vacated. If
 * the two-method rule needs to survive someone switching a method on in the
 * Dashboard, the durable tool is a `payment_method_configuration` holding
 * card + amazon_pay, passed as `payment_method_configuration` on the session;
 * that is an account-level object, so it is not created here.
 *
 * Link is deliberately *not* in this list, and can't be: the API rejects
 * `link` here outright ("must be one of card, acss_debit, …"). Link is a
 * wallet, not a payment method type, so it is switched off client-side with
 * `wallets: { link: "never" }` on the Payment Element — see
 * `components/checkout/checkout-payment.tsx`. That matters because the tab
 * labelled **"Bank"** (with the "US$5 back when you pay by bank" promo) is
 * Link's pay-by-bank, not `us_bank_account`: excluding `us_bank_account`
 * removed nothing visible, and the session still offered exactly `card`,
 * `link` and `amazon_pay` against three tabs, which is what identified it.
 *
 * Sorted, because `sameExclusions` compares against it element-wise.
 */
const EXCLUDED_PAYMENT_METHODS = [
  "cashapp",
  "klarna",
  "us_bank_account",
] as const

/**
 * Whether a session was opened with the exclusions this code now applies.
 *
 * Same shape of trap as the `ui_mode` check below, and for the same reason:
 * sessions stay open for 24h, so after this list changes the reuse path would
 * otherwise hand back a session built under the *old* list and the form would
 * keep offering methods that have since been removed.
 */
function sameExclusions(session: Stripe.Checkout.Session) {
  const applied = [...(session.excluded_payment_method_types ?? [])].sort()

  return (
    applied.length === EXCLUDED_PAYMENT_METHODS.length &&
    applied.every((type, i) => type === EXCLUDED_PAYMENT_METHODS[i])
  )
}

/**
 * The `ui_mode` values `initCheckoutElementsSdk` can actually drive — i.e.
 * what `components/checkout/checkout-payment.tsx` is able to mount.
 *
 * Two names, because Stripe renamed these across API versions: what is now
 * `elements` used to be `custom` (just as `embedded_page` used to be
 * `embedded`), and a session created under an older version still reports the
 * old name. Both are the same mode.
 */
const ELEMENTS_UI_MODES = new Set(["elements", "custom"])

/**
 * Whether a session was opened against a real Customer with card saving on.
 *
 * The third guard on the reuse path, added for the reason the other two
 * document: sessions stay open for 24h, so after this changed shape an older
 * session — created with a bare `customer_email` and no
 * `saved_payment_method_options` — still matched on cart and recency and
 * would have been handed back, quietly losing the "save this card" option and
 * attaching the payment to a throwaway guest customer instead of the one
 * `/dashboard/settings/billing` reads. Add a guard alongside these whenever a
 * new option starts shaping the session.
 */
function savesToCustomer(session: Stripe.Checkout.Session) {
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer?.id ?? null)

  return (
    customerId !== null &&
    session.saved_payment_method_options?.payment_method_save === "enabled"
  )
}

export async function createCheckoutSession(): Promise<string> {
  const session = await getSession()
  if (!session) {
    throw new Error("Sign in to check out.")
  }

  const stripe = getStripe()
  if (!stripe) {
    throw new Error("Checkout is not configured.")
  }

  const cart = await getCart()
  if (cart.lines.length === 0) {
    throw new Error("Your cart is empty.")
  }

  const customerId = await getOrCreateStripeCustomer()
  if (!customerId) {
    throw new Error("Checkout is not configured.")
  }

  const origin = process.env.BETTER_AUTH_URL
  if (!origin) {
    // Reused rather than adding a second "where is this app served from"
    // constant — Better Auth already needs the real origin, and two of them
    // would eventually disagree.
    throw new Error("BETTER_AUTH_URL must be set to build the return URL.")
  }

  const slugs = cart.lines.map((line) => line.course.slug).sort()

  // Reloading /checkout must not mint a new session (and a new PENDING order)
  // every time. If the last one is still open and covers exactly this cart,
  // pick it back up — the customer keeps whatever they had already typed.
  const existing = await db.order.findFirst({
    where: {
      userId: session.user.id,
      status: "PENDING",
      createdAt: { gt: new Date(Date.now() - REUSE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { courseSlug: true } } },
  })

  if (existing) {
    const sameCart =
      existing.items.length === slugs.length &&
      existing.items
        .map((item) => item.courseSlug)
        .sort()
        .every((slug, i) => slug === slugs[i])

    if (sameCart) {
      // `retrieve` can still fail (a session expires after 24h, or the key
      // rotated) — falling through to a fresh session is always safe.
      const reopened = await stripe.checkout.sessions
        .retrieve(existing.stripeSessionId)
        .catch(() => null)

      // The `ui_mode` check is not belt-and-braces — it is the bug this
      // caught. A session opened by an *earlier build* of this page was
      // `embedded_page`, and it stayed `open` for 24h; with a matching cart
      // inside the reuse window, this branch handed it to the Elements SDK,
      // which refused it with "You must create a Checkout Session with
      // ui_mode=custom or ui_mode=elements". Falling through creates a fresh
      // session in the mode this client can mount, and the stale one expires
      // on its own.
      if (
        reopened?.status === "open" &&
        reopened.client_secret &&
        ELEMENTS_UI_MODES.has(String(reopened.ui_mode)) &&
        sameExclusions(reopened) &&
        savesToCustomer(reopened)
      ) {
        return reopened.client_secret
      }
    }
  }

  const checkout = await stripe.checkout.sessions.create({
    ui_mode: "elements",
    mode: "payment",
    integration_identifier: INTEGRATION_IDENTIFIER,
    // `{CHECKOUT_SESSION_ID}` is a literal Stripe substitutes on redirect.
    return_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    // A real Customer, not the `customer_email` shortcut this used to pass.
    // That shortcut makes Stripe mint a throwaway guest customer per session,
    // so nothing could ever be saved for next time and
    // `/dashboard/settings/billing` had no customer to list cards from. With a
    // durable customer, past payments and saved cards collect in one place.
    customer: customerId,
    // Shows Stripe's own "save this card for next time" checkbox in the
    // Payment Element. Opt-in by the customer — `enabled` offers the choice,
    // it does not save silently, which is both the honest behaviour and what
    // several jurisdictions require.
    saved_payment_method_options: { payment_method_save: "enabled" },
    // No `payment_method_types` on purpose. Omitting it turns on dynamic
    // payment methods, so what a given customer is offered is decided by
    // Stripe (and the Dashboard's payment-method settings) rather than
    // hard-coded to cards here. Adding it back would silently switch that off.
    // Narrow the list with the exclusions above instead.
    excluded_payment_method_types: [...EXCLUDED_PAYMENT_METHODS],
    line_items: cart.lines.map((line) => ({
      quantity: 1,
      // Inline `price_data` rather than a stored Stripe Price id: courses
      // live in `lib/config/browse-courses.ts` and have never been pushed to
      // Stripe as Products. When the instructor-authoring flow lands and
      // `Course` holds real rows, create Prices there and pass ids here.
      price_data: {
        currency: "usd",
        unit_amount: toCents(line.course.price),
        product_data: {
          name: line.course.title,
          description: line.course.instructor,
        },
      },
    })),
    metadata: { userId: session.user.id },
  })

  if (!checkout.client_secret) {
    throw new Error("Stripe did not return a client secret.")
  }

  // Recorded before the customer types a card, so an abandoned checkout is a
  // PENDING row we can see rather than silence. `stripeSessionId` is unique,
  // which is what lets the return page find this order from the URL.
  await db.order.create({
    data: {
      userId: session.user.id,
      stripeSessionId: checkout.id,
      amountTotal: checkout.amount_total ?? 0,
      currency: checkout.currency ?? "usd",
      email: session.user.email,
      items: {
        create: cart.lines.map((line) => ({
          courseSlug: line.course.slug,
          title: line.course.title,
          unitAmount: toCents(line.course.price),
        })),
      },
    },
  })

  return checkout.client_secret
}
