"use client"

import { Button } from "@/components/ui/button"
import {
  methodDescription,
  methodTitle,
} from "@/components/dashboard/instructor/settings/payouts-format"
import {
  payoutMethodTypes,
  payoutRoleBadges,
  payoutSettingsCopy,
} from "@/lib/config/instructor-payouts"
import type { PayoutMethodView } from "@/lib/instructor-payouts"
import { cn } from "@/lib/utils"

/**
 * One row under "Payout methods", from
 * `ui-design/light/dashboard/instructor/payout-settings-page.png`.
 *
 * Measured off that export at DPR 2 and verified against the render: a **72px**
 * row filled `--background` on a white card (the page colour is what separates
 * the two — the trick `settings-controls.ts` records for its text fields),
 * `rounded-xl`, 20px side padding, a **38px** `--hover` tile 16px from a
 * 15px/600 title over a 13px muted line on a 20px pitch, then a right-hand
 * cluster of a **22px** role pill and a **54 x 34** Edit button, 16px apart,
 * ending 20px from the row's trailing edge.
 *
 * Two readings worth keeping:
 *
 *  - **The row is a plain `div`, not a `Card`.** `Card`'s hairline is a `ring`
 *    which paints *outside* the layout box, so the export's 14px gap between
 *    rows would read as 12 — the trap the wishlist rows and the notification
 *    toggles both record. This row has no hairline at all, only a fill, so a
 *    `Card` would also have to have its ring removed.
 *  - **Edit carries `shadow-sm`.** It is a card-coloured control sitting on a
 *    tinted surface, which is the same "lifted" case the sale page's Buy now /
 *    Wishlist buttons document. The flat content cards elsewhere do not get
 *    it; a control on a tint does.
 *
 * The pill is a label rather than a button. Making it clickable was the other
 * reading and is worse: "Primary" and "Backup" would then be a two-state
 * control whose second state cannot be chosen (you cannot demote the only
 * primary without promoting another), so promotion lives in the Edit dialog
 * where the choice has somewhere to go.
 */
function PayoutMethodRow({
  method,
  onEdit,
}: {
  method: PayoutMethodView
  onEdit: () => void
}) {
  const Icon =
    payoutMethodTypes.find((type) => type.value === method.type)?.icon ??
    payoutMethodTypes[0]!.icon
  const badge = payoutRoleBadges[method.role]

  return (
    <div className="flex h-18 items-center gap-4 rounded-xl bg-background px-5">
      <span
        aria-hidden
        className="grid size-9.5 shrink-0 place-items-center rounded-xl bg-hover"
      >
        <Icon className="size-4.5 text-foreground/80" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] leading-5 font-semibold">
          {methodTitle(method)}
        </p>
        <p className="truncate text-[13px] leading-[18px] text-muted-foreground">
          {methodDescription(method)}
        </p>
      </div>

      <span
        className={cn(
          "hidden h-5.5 shrink-0 items-center rounded-full border px-3 text-[13px] font-medium sm:inline-flex",
          badge.className
        )}
      >
        {badge.label}
      </span>

      <Button
        type="button"
        variant="outline"
        onClick={onEdit}
        aria-label={`Edit ${methodTitle(method)}`}
        className="h-8.5 shrink-0 bg-card px-4 text-[13px] shadow-sm"
      >
        {payoutSettingsCopy.editMethod}
      </Button>
    </div>
  )
}

export { PayoutMethodRow }
