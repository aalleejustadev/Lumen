import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BillingPaymentMethods } from "@/components/dashboard/settings/billing-payment-methods"
import { BillingPlanHeader } from "@/components/dashboard/settings/billing-plan-header"
import { BillingTransactions } from "@/components/dashboard/settings/billing-transactions"
import type { Billing } from "@/lib/billing"

/**
 * The right-hand card on `/dashboard/settings/billing`, from
 * `ui-design/light/dashboard/student/settings-billing-page.png`.
 *
 * Same 923px card as the other two settings pages, but it is the one that
 * can't use `CardContent`: the rule under the plan header is **full-bleed**,
 * running the whole 923px rather than stopping at the 30px padding. So each
 * block carries its own padding and the `Separator` sits between them as a
 * direct child of `Card`.
 *
 * `[--card-spacing:0px]` rather than `py-0 gap-0`: `Card` sets its padding and
 * gap as `py-(--card-spacing)`/`gap-(--card-spacing)`, and tailwind-merge does
 * **not** recognise an arbitrary CSS-variable shorthand as the same utility
 * group — checked against the rendered HTML, `py-0` and `gap-0` left both
 * generated classes in place and the card came out with 16px of stray padding
 * and a 16px gap between the three blocks. Zeroing the variable turns them off
 * at the source.
 *
 * Vertical rhythm, measured off that export at DPR 2 relative to the card's
 * top edge: 30px to the title, 22px from the subline to the rule, 22px from
 * the rule to "Payment Method", 26px between the dashed add row and
 * "Transaction History", and 30px from the last table divider to the bottom.
 *
 * There is only one rule in the export — under the header. Payment Method and
 * Transaction History are stacked blocks inside the same padded container,
 * not separately divided sections.
 */
function SettingsBilling({ billing }: { billing: Billing }) {
  return (
    <Card className="[--card-spacing:0px]">
      <div className="px-7.5 pt-7.5 pb-5.5">
        <BillingPlanHeader
          plan={billing.plan}
          configured={billing.configured}
        />
      </div>

      <Separator />

      <div className="px-7.5 pt-5.5 pb-7.5">
        <BillingPaymentMethods
          cards={billing.cards}
          configured={billing.configured}
        />
        <div className="mt-6.5">
          <BillingTransactions transactions={billing.transactions} />
        </div>
      </div>
    </Card>
  )
}

export { SettingsBilling }
