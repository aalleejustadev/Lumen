/**
 * Creates the Lumen Business Product and its two Prices, then prints the ids
 * to paste into `.env`.
 *
 *   npm run stripe:setup
 *
 * **Idempotent.** It looks the Product up by a stable `metadata.lumen_plan`
 * key rather than by name, and reuses a Price whose amount, currency and
 * interval already match — so re-running it after a key rotation, on a second
 * environment, or simply twice, does not litter the account with duplicates.
 * A Stripe Price is immutable, so changing the amount in
 * `lib/config/pricing.ts` and re-running creates a *new* Price and leaves the
 * old one in place (existing subscribers keep the price they signed up at,
 * which is the behaviour you want); paste the new id into `.env` to sell it.
 *
 * It reads the amounts from `lib/config/pricing.ts`, so the marketing card and
 * the thing Stripe charges start out as the same number by construction rather
 * than by somebody remembering. `lib/subscription.ts` then reads the amounts
 * back off Stripe at render time, so they stay the same number afterwards too.
 */
import Stripe from "stripe"

import {
  BUSINESS_PLAN_ID,
  BUSINESS_PLAN_KEY,
  plans,
} from "../lib/config/pricing"

/**
 * The Product's own id, set explicitly rather than left to Stripe.
 *
 * **This is what makes re-running safe, and a `products.search` on a metadata
 * key is not.** Search is eventually consistent — Stripe says results may lag
 * a write by up to a minute — so the first version of this script looked for
 * the product it had created seconds earlier, did not find it, and made a
 * second one. Caught by running the script twice. `retrieve` by a known id is
 * immediately consistent, and the id is stable across every environment.
 */
const PRODUCT_ID = "lumen_business"

/** Kept on the Product and its Prices so they are recognisable in the
 *  Dashboard among whatever else the account holds. */
const PLAN_KEY = "lumen_plan"

/** "$29" / "$299" from the pricing config, as minor units. The config is the
 *  one place these are written down. */
function toMinorUnits(display: string): number {
  const amount = Number(display.replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Cannot read a price out of "${display}".`)
  }
  return Math.round(amount * 100)
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.error(
      "STRIPE_SECRET_KEY is not set.\n" +
        "Add it to .env first — or, with no Stripe account at all, run:\n" +
        "  npm i -g @stripe/cli && stripe sandbox create\n"
    )
    process.exit(1)
  }

  const stripe = new Stripe(key)
  const plan = plans.find((entry) => entry.id === BUSINESS_PLAN_ID)
  if (!plan)
    throw new Error(`No "${BUSINESS_PLAN_ID}" in lib/config/pricing.ts.`)

  const currency = "usd"
  const wanted = {
    monthly: { amount: toMinorUnits(plan.price.monthly), interval: "month" },
    yearly: { amount: toMinorUnits(plan.price.yearly), interval: "year" },
  } as const

  // --- Product -----------------------------------------------------------
  // One Product for the plan, with a Price per billing interval. Stripe's own
  // guidance: separate Products are for separate *tiers*, and monthly/yearly
  // are billing variants of one plan — putting tiers on one Product makes
  // every invoice line item read the same name.
  const found = await stripe.products.retrieve(PRODUCT_ID).catch(() => null)

  const product =
    found && !found.deleted
      ? found
      : await stripe.products.create({
          id: PRODUCT_ID,
          name: plan.name,
          description: plan.description,
          metadata: { [PLAN_KEY]: BUSINESS_PLAN_KEY },
        })

  console.log(
    found
      ? `• Reusing product ${product.id} (${product.name})`
      : `• Created product ${product.id} (${product.name})`
  )

  // --- Prices ------------------------------------------------------------
  const existing = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  })

  const ids: Record<string, string> = {}
  for (const [period, spec] of Object.entries(wanted)) {
    const match = existing.data.find(
      (price) =>
        price.currency === currency &&
        price.unit_amount === spec.amount &&
        price.recurring?.interval === spec.interval &&
        price.recurring?.interval_count === 1
    )

    if (match) {
      ids[period] = match.id
      console.log(`• Reusing ${period} price ${match.id}`)
      continue
    }

    const created = await stripe.prices.create({
      product: product.id,
      currency,
      unit_amount: spec.amount,
      recurring: { interval: spec.interval },
      metadata: { [PLAN_KEY]: BUSINESS_PLAN_KEY, period },
    })
    ids[period] = created.id
    console.log(`• Created ${period} price ${created.id}`)
  }

  console.log(
    [
      "",
      "Paste these into .env:",
      "",
      `STRIPE_BUSINESS_PRICE_MONTHLY="${ids.monthly}"`,
      `STRIPE_BUSINESS_PRICE_YEARLY="${ids.yearly}"`,
      "",
      "Then, so subscription state stays correct after checkout, forward the",
      "lifecycle events to the webhook while developing:",
      "",
      "  stripe listen --forward-to localhost:3000/api/stripe/webhook",
      "",
    ].join("\n")
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
