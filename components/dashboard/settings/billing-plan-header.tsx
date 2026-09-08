import { ChangePlanButton } from "@/components/dashboard/settings/billing-actions"
import type { BillingPlan } from "@/lib/billing"

/**
 * The card's header, from
 * `ui-design/light/dashboard/student/settings-billing-page.png`: a 20px/700
 * "Billing" over a 14px muted line, with "Change plan" pinned top-right.
 *
 * The subline is read from the customer's **real** Stripe subscription. Today
 * that is `null` for every account, because Lumen has no plan product —
 * courses are one-time `mode: "payment"` purchases — so the "no plan" line is
 * what actually renders. It is deliberately not stubbed with the export's
 * `Billing monthly · Next payment on 02/09/2026 for $59.90`: inventing a plan
 * nobody is on would be a lie on a billing screen, which is the one place that
 * matters most. The day a plan exists, `lib/billing.ts` picks it up and this
 * renders the export's line verbatim, with the interval and amount from the
 * price rather than hardcoded.
 */

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function planSummary(plan: BillingPlan) {
  const parts = [`Billing ${plan.interval}`]

  if (plan.cancelAtPeriodEnd && plan.nextPaymentAt) {
    parts.push(
      `Cancels on ${plan.nextPaymentAt.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })}`
    )
    return parts.join(" · ")
  }

  if (plan.status === "past_due" || plan.status === "unpaid") {
    parts.push("Payment failed — update your card to keep access")
    return parts.join(" · ")
  }

  if (plan.nextPaymentAt) {
    const date = plan.nextPaymentAt.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })
    parts.push(
      plan.amountCents === null
        ? `Next payment on ${date}`
        : `Next payment on ${date} for ${money(plan.amountCents, plan.currency)}`
    )
  }

  return parts.join(" · ")
}

function BillingPlanHeader({
  plan,
  configured,
}: {
  plan: BillingPlan | null
  configured: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[20px] leading-none font-bold">Billing</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {!configured
            ? "Billing isn't configured for this environment yet."
            : plan
              ? planSummary(plan)
              : "No active plan · you pay per course, with nothing recurring."}
        </p>
      </div>
      <ChangePlanButton disabled={!configured} />
    </div>
  )
}

export { BillingPlanHeader }
