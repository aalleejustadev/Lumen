import { after, NextResponse } from "next/server"

import {
  expireCheckoutSession,
  failCheckoutSession,
  fulfillCheckoutSession,
} from "@/lib/orders"
import { getStripe } from "@/lib/stripe"

/**
 * Stripe's event endpoint — where orders are actually fulfilled.
 *
 * This is not an optional extra on top of the return page. A customer can pay
 * and never load the return page, and delayed-notification payment methods
 * settle hours or days after the Checkout Session completes, long after every
 * browser tab is gone. The webhook is the only delivery Stripe guarantees, so
 * it owns fulfilment and the return page only reports what it finds.
 *
 * Point the CLI at it while developing:
 *   stripe listen --forward-to localhost:3000/api/stripe/webhook
 * which prints the `whsec_…` to put in `STRIPE_WEBHOOK_SECRET`.
 */
export async function POST(request: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripe || !secret) {
    // Unconfigured rather than broken — same posture as the rest of the app's
    // optional integrations. 503 tells Stripe to retry later, which is right:
    // once the secret is set, the backlog is delivered.
    return NextResponse.json(
      { error: "Stripe webhooks are not configured." },
      { status: 503 }
    )
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 })
  }

  // The *raw* body — `request.json()` would reserialize it and the signature,
  // which is computed over the exact bytes Stripe sent, would never match.
  const payload = await request.text()

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret
    )
  } catch (error) {
    // Anything that fails verification is not from Stripe (or was tampered
    // with), so it is rejected before a single field is read. 400 rather than
    // a retryable code — replaying it would fail identically.
    const message = error instanceof Error ? error.message : "Invalid payload."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Acknowledge fast and do the work after the response: Stripe treats a slow
  // endpoint as a failure and retries, which would have us fulfilling the same
  // order twice. `lib/orders.ts` is idempotent anyway, but not racing is
  // better than surviving the race.
  after(async () => {
    switch (event.type) {
      // Fires for every completed session, including ones whose money is
      // still in flight — `fulfillCheckoutSession` is what filters those out
      // on `payment_status`.
      case "checkout.session.completed":
      // The delayed half of the pair: a bank debit or voucher that cleared.
      case "checkout.session.async_payment_succeeded": {
        await fulfillCheckoutSession(event.data.object)
        break
      }
      case "checkout.session.async_payment_failed": {
        await failCheckoutSession(event.data.object)
        break
      }
      case "checkout.session.expired": {
        await expireCheckoutSession(event.data.object)
        break
      }
      // Every other event type Stripe is configured to send. Ignored, not an
      // error — the endpoint still answers 200 so Stripe doesn't retry it.
      default:
        break
    }
  })

  return NextResponse.json({ received: true })
}
