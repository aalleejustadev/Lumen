import { Badge } from "@/components/ui/badge"
import { AddPaymentMethodRow } from "@/components/dashboard/settings/add-payment-method-dialog"
import { CardRowMenu } from "@/components/dashboard/settings/billing-actions"
import type { BillingCard } from "@/lib/billing"

/**
 * The "Payment Method" section, from
 * `ui-design/light/dashboard/student/settings-billing-page.png`.
 *
 * Real cards, read from the caller's Stripe customer — brand, last four,
 * expiry and cardholder name all come off the `PaymentMethod`, and "Primary"
 * is the customer's `invoice_settings.default_payment_method` rather than a
 * flag of ours. An account that has never saved a card sees just the dashed
 * add row, which is the export minus the rows and the honest state for almost
 * everyone today.
 *
 * Measured off that export at DPR 2, inside the card's 863px content box:
 * 79px rows on `px-5.5 py-4` with a 10px radius, a 12px gap between them and
 * before the 50px dashed add row, a 15px/600 name line over a 14px muted
 * expiry, and a 40px trailing button.
 *
 * A Server Component: only the trailing menu and the add dialog need the
 * client, so the rows themselves never reach the bundle.
 */

/**
 * `"visa"` → `"Visa"`, `"amex"` → `"Amex"`. Stripe returns a lowercase brand
 * slug; the export shows the cardholder's name rather than the brand, so this
 * is only a fallback for a card with no name on it.
 */
function brandLabel(brand: string) {
  if (brand === "amex") return "Amex"
  if (brand === "unionpay") return "UnionPay"
  return brand.charAt(0).toUpperCase() + brand.slice(1)
}

function expiryLabel(month: number, year: number) {
  const date = new Date(Date.UTC(year, month - 1, 1))
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

function BillingPaymentMethods({
  cards,
  configured,
}: {
  cards: BillingCard[]
  configured: boolean
}) {
  return (
    <section>
      <h2 className="text-[17px] leading-snug font-bold">Payment Method</h2>

      <div className="mt-3.5 flex flex-col gap-3">
        {cards.map((card) => {
          const label = card.name ?? brandLabel(card.brand)
          return (
            <div
              key={card.id}
              className="flex min-h-[79px] items-center justify-between gap-4 rounded-lg border border-border px-5.5 py-4"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className="truncate text-[15px] font-semibold">
                    {/* The export's separator is four bullets, not the "••••
                        4242" run Stripe's own UI uses — `•` spaced by the
                        font's own tracking, matching the drawn width. */}
                    {label} •••• {card.last4}
                  </span>
                  {card.isDefault ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-info px-3 text-info"
                    >
                      Primary
                    </Badge>
                  ) : null}
                </div>
                <span className="text-sm text-muted-foreground">
                  Expires {expiryLabel(card.expMonth, card.expYear)}
                </span>
              </div>
              <CardRowMenu
                paymentMethodId={card.id}
                label={`${label} ending ${card.last4}`}
                isDefault={card.isDefault}
              />
            </div>
          )
        })}

        <AddPaymentMethodRow disabled={!configured} />
      </div>
    </section>
  )
}

export { BillingPaymentMethods }
