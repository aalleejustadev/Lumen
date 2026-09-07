import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckCircle2Icon, ClockIcon, XCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getStripe } from "@/lib/stripe"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Order confirmed · ${siteConfig.name}`,
}

/**
 * Where Stripe sends the customer after payment (`return_url` in
 * `lib/actions/checkout.ts`).
 *
 * This page **reports**; it does not fulfil. Marking the order paid and
 * emptying the cart happen in `app/api/stripe/webhook/route.ts`, because a
 * customer is not guaranteed to ever arrive here — they can pay and close the
 * tab, and with a delayed-notification payment method the money settles days
 * later with no browser involved at all. So this reads the Checkout Session
 * back from Stripe, tells the customer where their payment stands, and leaves
 * the database writes to the event handler.
 *
 * The consequence worth knowing: an order can still read PENDING here for the
 * second or two before the webhook lands. That's what the "processing" state
 * is for — it isn't an error, and the copy doesn't claim the purchase failed.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams
  const stripe = getStripe()
  const session = await getSession()

  if (!sessionId || !stripe || !session) {
    redirect("/dashboard/cart")
  }

  const checkout = await stripe.checkout.sessions.retrieve(sessionId)

  // `open` means they backed out without paying — Stripe's own guidance is to
  // put them back on the form rather than show them a receipt.
  if (checkout.status === "open") {
    redirect("/checkout")
  }

  // Scoped to the signed-in user, so pasting somebody else's `session_id`
  // shows nothing. The order is the app's record; the Stripe session is the
  // payment's.
  const order = await db.order.findFirst({
    where: { stripeSessionId: sessionId, userId: session.user.id },
    include: { items: true },
  })

  if (!order) {
    redirect("/dashboard/cart")
  }

  const paid = order.status === "PAID"
  const failed = order.status === "FAILED"
  const email = checkout.customer_details?.email ?? order.email

  const Icon = paid ? CheckCircle2Icon : failed ? XCircleIcon : ClockIcon

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col px-6 py-12 md:py-20">
      <Card className="items-center gap-0 px-8 py-10 text-center ring-border">
        <Icon
          className={
            paid
              ? "size-11 text-success"
              : failed
                ? "size-11 text-destructive"
                : "size-11 text-muted-foreground"
          }
        />

        <h1 className="mt-5 text-[26px] leading-tight">
          {paid
            ? "Thank you for your order"
            : failed
              ? "Your payment didn't go through"
              : "Your payment is processing"}
        </h1>

        <p className="mt-2.5 text-[15px] text-muted-foreground">
          {paid ? (
            <>
              We&apos;ve sent a receipt
              {email ? <> to {email}</> : null}. Your courses are ready in My
              Learning.
            </>
          ) : failed ? (
            <>
              Your bank declined the payment, so nothing was charged. Your cart
              is still there if you&apos;d like to try again.
            </>
          ) : (
            <>
              Some payment methods take a little while to clear. We&apos;ll
              email you
              {email ? <> at {email}</> : null} the moment it settles — you can
              close this page.
            </>
          )}
        </p>

        <dl className="mt-7 w-full border-t pt-5 text-left">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-baseline justify-between gap-4 py-1.5"
            >
              <dt className="text-sm">{item.title}</dt>
              <dd className="text-sm text-muted-foreground tabular-nums">
                ${(item.unitAmount / 100).toFixed(2)}
              </dd>
            </div>
          ))}
          <div className="mt-2 flex items-baseline justify-between gap-4 border-t pt-3">
            <dt className="font-bold">Total</dt>
            <dd className="font-bold tabular-nums">
              ${(order.amountTotal / 100).toFixed(2)}
            </dd>
          </div>
        </dl>

        <Button
          nativeButton={false}
          className="mt-7 h-11 w-full text-sm font-semibold shadow-sm"
          render={<Link href={paid ? "/dashboard" : "/dashboard/cart"} />}
        >
          {paid ? "Go to dashboard" : "Back to cart"}
        </Button>
      </Card>
    </main>
  )
}
