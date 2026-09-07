import "server-only"

import Stripe from "stripe"

/**
 * The Stripe client, server-side only — `server-only` makes an accidental
 * import from a Client Component a build error rather than a leaked secret
 * key.
 *
 * Built lazily and returned as `null` when `STRIPE_SECRET_KEY` is blank, the
 * same arrangement the Google/GitHub keys get in `lib/auth.ts`: a checkout
 * this project hasn't been given keys for should leave the app booting and
 * every other surface working, not crash the build. Callers branch on `null`
 * and say so — see `app/(checkout)/checkout/page.tsx`.
 */
let client: Stripe | null | undefined

function getStripe() {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY
    // No `apiVersion` pin: the installed `stripe` package already defaults to
    // the version its types were generated against, and pinning a different
    // string is how you get types that disagree with the wire format.
    client = key ? new Stripe(key) : null
  }

  return client
}

/** Whether checkout is configured at all — both halves of the key pair. */
function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  )
}

export { getStripe, isStripeConfigured }
