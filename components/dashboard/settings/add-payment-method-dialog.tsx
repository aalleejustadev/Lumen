"use client"

import * as React from "react"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  checkoutAppearance,
  checkoutFonts,
} from "@/components/checkout/checkout-appearance"
import { createSetupIntent, syncPaymentMethods } from "@/lib/actions/billing"

/**
 * The export's dashed "+ Add payment method" row, and the dialog behind it.
 *
 * This is a **real** card save, not a mock: `createSetupIntent` opens a
 * SetupIntent against the caller's Stripe customer and the Payment Element
 * confirms it, so the card is attached by Stripe and shows up in the row list
 * (and in the Dashboard) immediately. SetupIntents are what Stripe's own
 * guidance prescribes for saving a payment method for later — the Sources and
 * Tokens APIs are deprecated for this.
 *
 * `usage: "off_session"` is set server-side, because the point of saving is to
 * charge the card on a later purchase without the customer present.
 *
 * A few mechanics worth knowing:
 *
 *  - `loadStripe` runs at module scope, as it does in `checkout-payment.tsx`:
 *    it injects js.stripe.com's script, and calling it per render would
 *    rebuild the `Stripe` object every pass.
 *  - The SetupIntent is created **when the dialog opens**, not on page load. A
 *    SetupIntent is a real Stripe object; minting one for every visitor who
 *    never clicks would litter the account.
 *  - `redirect: "if_required"` on `confirmSetup`, with a `return_url` for the
 *    methods that genuinely need to leave the page (some wallets and bank
 *    debits do). Without the `return_url` Stripe refuses those outright; with
 *    `if_required` a plain card never navigates at all.
 *  - Stripe's fields live in an iframe on Stripe's origin, so no stylesheet of
 *    ours reaches them — `checkoutAppearance` is the same explicit hand-over
 *    the checkout page uses, reused rather than re-derived so the two surfaces
 *    can't drift.
 */
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

function AddPaymentMethodRow({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [clientSecret, setClientSecret] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      // Dropped on close so re-opening starts a fresh SetupIntent rather than
      // re-confirming one the customer already abandoned.
      setClientSecret(null)
      return
    }

    setLoading(true)
    const result = await createSetupIntent()
    setLoading(false)

    if (!result.ok) {
      setOpen(false)
      toast.add({ title: result.message, type: "error" })
      return
    }
    setClientSecret(result.clientSecret)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            /* 50px dashed row, full width, content centred — measured off the
               export at DPR 2. */
            className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-border text-sm font-medium transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          />
        }
      >
        <PlusIcon className="size-4" />
        Add payment method
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a payment method</DialogTitle>
          <DialogDescription>
            Saved securely by Stripe so your next course is one tap. Lumen never
            sees your card number.
          </DialogDescription>
        </DialogHeader>

        {clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: checkoutAppearance,
              fonts: checkoutFonts,
            }}
          >
            <SetupForm onDone={() => setOpen(false)} />
          </Elements>
        ) : (
          <div className="flex h-40 items-center justify-center">
            {loading ? (
              <Spinner className="size-5 text-muted-foreground" />
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SetupForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe || !elements) return

    setSubmitting(true)
    setError(null)

    const { error: confirmError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/settings/billing`,
      },
      redirect: "if_required",
    })

    if (confirmError) {
      setSubmitting(false)
      setError(confirmError.message ?? "We couldn't save that card.")
      return
    }

    // Stripe has already attached the card; this only re-reads the list and
    // makes a first card the customer's default.
    const result = await syncPaymentMethods()
    setSubmitting(false)
    toast.add({
      title: result.message,
      type: result.ok ? "success" : "error",
    })
    if (result.ok) onDone()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <PaymentElement
        options={{
          // Link is a wallet rather than a payment method type, so it is
          // switched off client-side — the same call `checkout-payment.tsx`
          // makes, and for the same reason.
          wallets: { link: "never", applePay: "never", googlePay: "never" },
        }}
      />
      {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
      <Button
        type="submit"
        loading={submitting}
        disabled={!stripe}
        className="h-11 w-full"
      >
        {submitting ? "Saving…" : "Save card"}
      </Button>
    </form>
  )
}

export { AddPaymentMethodRow }
