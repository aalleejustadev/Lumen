import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CreditCardIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { CheckoutPayment } from "@/components/checkout/checkout-payment"
import { CheckoutSummary } from "@/components/checkout/checkout-summary"
import { createCheckoutSession } from "@/lib/actions/checkout"
import { getCart } from "@/lib/cart"
import { isStripeConfigured } from "@/lib/stripe"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Checkout · ${siteConfig.name}`,
}

/**
 * `/checkout`, built to `ui-design/light/dashboard/student/checkout-page.png`.
 *
 * Measured off that export at DPR 2: a **920 × 708** panel on a
 * `--background` page, `rounded-2xl`, hairline `--border`, split by a vertical
 * `--border` rule at x=944 into a **448px** summary column on `--background`
 * and a **472px** payment column on `--card`. Those are the app's own tokens,
 * not Stripe's palette — which is the reason this page renders the layout
 * itself (`ui_mode: "elements"`) instead of embedding Stripe's checkout
 * iframe. Under `embedded_page` every pixel inside the panel would be Stripe's
 * and none of the above would be reachable, "Back to cart" included.
 *
 * **The panel then runs 10% wider than the export by request** — 1012px, with
 * the split scaled to match (493px, so the ratio stays the export's 0.487).
 * The columns' own 37/38px padding is *not* scaled: it is an inset, so the
 * extra width goes to the content. Every vertical measurement in
 * `checkout-summary.tsx` and `checkout-payment.tsx` is unaffected.
 *
 * The session is created here rather than fetched from the client: the client
 * secret then arrives with the first paint (no spinner-then-form), and React's
 * double-invoked initialisers in development can't mint two Stripe sessions.
 * `createCheckoutSession` re-opens the last still-open session for an
 * unchanged cart, so a reload doesn't leave a trail of PENDING orders.
 */
export default async function Page() {
  const cart = await getCart()

  // Nothing to pay for — bounce rather than open a Stripe session for $0.
  if (cart.lines.length === 0) {
    redirect("/dashboard/cart")
  }

  if (!isStripeConfigured()) {
    /* Same posture as a blank OAuth key pair: the app keeps working and says
       what is missing, rather than throwing on a null client. */
    return (
      <main className="mx-auto w-full max-w-[1012px] px-6 py-[18px]">
        <Empty className="rounded-2xl border bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCardIcon />
            </EmptyMedia>
            <EmptyTitle>Checkout isn&apos;t configured yet</EmptyTitle>
            <EmptyDescription>
              Add <code>STRIPE_SECRET_KEY</code> and{" "}
              <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to{" "}
              <code>.env</code> to take payments. Your cart is safe in the
              meantime.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/cart" />}
            >
              Back to cart
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    )
  }

  const clientSecret = await createCheckoutSession()

  return (
    <main className="mx-auto w-full max-w-[1012px] px-6 py-[18px]">
      {/* `items-stretch` is what carries the summary column's `--background`
          fill and the divider the full height of the taller payment column;
          without it each column would only be as tall as its own content and
          the rule would stop halfway down. */}
      <div className="grid overflow-hidden rounded-2xl border bg-card md:grid-cols-[493px_1fr] md:items-stretch">
        <div className="border-b md:border-r md:border-b-0">
          <CheckoutSummary summary={cart} />
        </div>
        <CheckoutPayment clientSecret={clientSecret} amount={cart.total} />
      </div>
    </main>
  )
}
