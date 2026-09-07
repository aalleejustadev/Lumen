"use client"

import * as React from "react"
import { loadStripe } from "@stripe/stripe-js"
import {
  CheckoutElementsProvider,
  ContactDetailsElement,
  ExpressCheckoutElement,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout"

import { Spinner } from "@/components/ui/spinner"
import {
  checkoutAppearance,
  checkoutFonts,
} from "@/components/checkout/checkout-appearance"
import { siteConfig } from "@/lib/config/site"
import { cn } from "@/lib/utils"

/**
 * The right half of `checkout-page.png` — the payment column, measured off
 * that export at DPR 2, panel-relative:
 *
 *   column         472px wide, 38px padding (rendered 518px — see the panel
 *                  width note in `app/(checkout)/checkout/page.tsx`)
 *   "Pay …"        cap top y=62, 15px muted
 *   amount         y=84-106 — 23px of cap height, so ~32px/800
 *   express button y=133-178, full width, 46px tall  (Stripe's)
 *   "Or pay …"     y=202-213, centred on a rule
 *   fields         y=237-587                          (Stripe's)
 *   Pay button     y=610-654, full width, 44px tall
 *   Stripe footer  y=674-684, centred
 *
 * Only the two marked blocks are Stripe's. The header, the divider, the submit
 * button and the footer are ours, which is the whole point of running the
 * session in `ui_mode: "elements"` — under `embedded_page` all of this would
 * be inside an iframe we cannot lay out.
 *
 * `loadStripe` runs at module scope on purpose: it injects js.stripe.com's
 * script, and calling it per render would rebuild the `Stripe` object every
 * pass. The publishable key is `NEXT_PUBLIC_` because this half of the pair
 * belongs in the browser — the secret key never leaves `lib/stripe.ts`.
 */
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

function CheckoutPayment({
  clientSecret,
  amount,
}: {
  clientSecret: string
  amount: number
}) {
  return (
    <CheckoutElementsProvider
      stripe={stripePromise}
      options={{
        clientSecret,
        elementsOptions: {
          appearance: checkoutAppearance,
          fonts: checkoutFonts,
        },
      }}
    >
      <PaymentColumn amount={amount} />
    </CheckoutElementsProvider>
  )
}

/**
 * Whether Stripe has anything to put in the express row.
 *
 * `pending` until the element's `ready` event says — we can't know up front,
 * because it depends on the visitor's browser, their saved wallets, and the
 * page being served over HTTPS. Apple Pay and Google Pay both require a
 * secure origin (and Apple Pay a registered domain), so over plain
 * `http://localhost` the answer is always `unavailable` and the row correctly
 * disappears; the same build shows it in production.
 */
type ExpressStatus = "pending" | "available" | "unavailable"

function PaymentColumn({ amount }: { amount: number }) {
  const checkout = useCheckoutElements()
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [express, setExpress] = React.useState<ExpressStatus>("pending")

  const formatted = `$${amount.toFixed(2)}`

  async function onPay() {
    if (checkout.type !== "success") return

    setSubmitting(true)
    setError(null)

    // `confirm` resolves with an error rather than throwing, and on success it
    // redirects to the session's `return_url` — so there is no success branch
    // to write here, only a failure one.
    const result = await checkout.checkout.confirm()

    if (result.type === "error") {
      setError(result.error.message ?? "Something went wrong. Try again.")
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col bg-card px-[38px] pt-[38px] pb-[38px]">
      <p className="text-[15px] leading-[22px] text-muted-foreground">
        Pay {siteConfig.legalName}
      </p>
      {/* No top margin: measured, the 32px cap sits directly under the line
          above — `leading-none` plus the 15px line box is the whole gap. */}
      <p className="mt-4 text-[32px] leading-none font-extrabold tracking-[-0.02em]">
        {formatted}
      </p>

      {checkout.type === "loading" ? (
        // Holds the column's height while Stripe mounts, so the panel doesn't
        // jump from a short box to a tall one.
        <div className="mt-6 flex h-[520px] items-center justify-center">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : checkout.type === "error" ? (
        <p className="mt-6 text-sm text-destructive">
          {checkout.error.message}
        </p>
      ) : (
        <>
          {/* Hidden only *after* `ready` reports nothing to show — never
              before. The element has to mount and lay out for that event to
              fire at all, so gating its first render on availability would
              mean it never became available. */}
          <div
            className={cn(
              express === "available" && "mt-5.5",
              express === "unavailable" && "hidden"
            )}
          >
            <ExpressCheckoutElement
              // Every key is required by the checkout-mode type even though
              // each is individually optional, so the ones we don't care about
              // are passed through as `undefined` to keep Stripe's defaults.
              options={{
                buttonHeight: 46,
                buttonTheme: undefined,
                buttonType: undefined,
                // One full-width row, matching the export's single black bar
                // — never let Stripe wrap wallets onto a second line.
                layout: { maxColumns: 1, maxRows: 1, overflow: "never" },
                paymentMethodOrder: undefined,
                paymentMethods: undefined,
              }}
              onReady={({ availablePaymentMethods }) => {
                setExpress(
                  availablePaymentMethods ? "available" : "unavailable"
                )
              }}
              // If the element fails to load there is nothing to click, so
              // treat it the same as having no wallets — otherwise the row
              // would sit there as permanent dead space.
              onLoadError={() => setExpress("unavailable")}
              onConfirm={async (event) => {
                await checkout.checkout.confirm({
                  expressCheckoutConfirmEvent: event,
                })
              }}
            />
          </div>

          {/* A rule with the label sitting *in* it, not above it — the
              export breaks the line either side of the text, with a 14px gap
              (segments measured at x 509-649 and 766-906.5).

              Rendered only on a confirmed `available`, not merely "not yet
              known to be unavailable". A separator is a statement that there
              is something on the other side of it, so it must never appear
              before the express row has actually produced buttons — gating on
              `!== "unavailable"` still showed it for the whole `pending`
              window, and forever if `ready` never fired.

              The export's wording is "Or pay with card"; "Or" was dropped at
              the user's request, so this line is a deliberate divergence from
              `checkout-page.png`. */}
          {express === "available" ? (
            <div className="mt-4.5 flex items-center gap-3.5 leading-[20px]">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[13px] text-muted-foreground">
                Pay with card
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : null}

          {/* Email, then the card fields. Both are Stripe's, labels included —
              "Card information" / "Cardholder name" / "Country or region" in
              the export are Stripe's own strings, which is a good sign the
              design was drawn from a real Payment Element. */}
          {/* 20px is the gap measured under the divider. With no express row
              the divider is gone too, so the form would otherwise crowd
              straight up against the amount — the fallback gets a little more
              air without disturbing the measured case. Keyed on `available`
              rather than `unavailable` so `pending` and `unavailable` agree
              and the form doesn't shift when the two resolve. */}
          <div className={cn(express === "available" ? "mt-5" : "mt-7")}>
            <ContactDetailsElement options={{}} />
          </div>
          <div className="mt-4.5">
            <PaymentElement
              options={{
                layout: "tabs",
                // Link off. It is a wallet rather than a payment method type,
                // so `excluded_payment_method_types` can't touch it — the API
                // rejects `link` there — and it is what draws the "Bank" tab
                // (Link's pay-by-bank, with the "US$5 back" promo), not
                // `us_bank_account`. Turning it off here is what leaves the
                // two methods asked for: Card and Amazon Pay. Link's autofill
                // and its "Save my information" box go with it; that is the
                // same switch.
                wallets: { link: "never" },
              }}
            />
          </div>

          {error ? (
            <p role="alert" className="mt-4 text-[13px] text-destructive">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onPay}
            disabled={submitting || !checkout.checkout.canConfirm}
            /* 44px tall, full content width, and Stripe's own indigo — the
               one colour in the export that isn't one of our tokens, kept
               because the export keeps it. */
            className="mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#625cf6] text-[15px] font-semibold text-white transition-colors hover:bg-[#5750e8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Spinner className="size-4" /> : null}
            Pay {formatted}
          </button>

          <p className="mt-3.5 text-center text-[13px] leading-[20px] text-muted-foreground">
            Powered by{" "}
            <span className="font-bold text-foreground/70">stripe</span>
            <span className="px-1.5">·</span>
            <a
              href="https://stripe.com/legal/consumer"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Terms
            </a>{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Privacy
            </a>
          </p>
        </>
      )}
    </div>
  )
}

export { CheckoutPayment }
