"use client"

import * as React from "react"
import { CreditCardIcon, StarIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  createBillingPortalSession,
  removePaymentMethod,
  setDefaultPaymentMethod,
} from "@/lib/actions/billing"

/**
 * The client controls on `/dashboard/settings/billing`. Kept in one file
 * because they are the page's only interactive pieces — the plan header, the
 * card rows and the transaction table all render on the server.
 *
 * Every action re-checks the session *and* re-checks that the payment method
 * belongs to the caller's own Stripe customer before touching it (see
 * `lib/actions/billing.ts`): a `pm_…` id reaches the browser, so an action
 * that trusted the id it was handed would let one account detach another's
 * card.
 */

/**
 * "Change plan" — the export's primary button, top-right.
 *
 * It opens Stripe's **Customer Portal**, which is Stripe's own surface for
 * changing a plan, and the only real destination available: Lumen has no plan
 * product of its own, so there is no in-app plan picker to link to. The portal
 * needs a default configuration created in the Stripe Dashboard; without one
 * the action returns a message saying exactly that instead of throwing.
 *
 * `window.location.href`, not `router.push` — the portal is Stripe's origin,
 * so this is a full navigation, not a client-side route change.
 */
function ChangePlanButton({ disabled }: { disabled?: boolean }) {
  const [pending, startTransition] = React.useTransition()

  return (
    <Button
      type="button"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await createBillingPortalSession()
          if (!result.ok) {
            toast.add({ title: result.message, type: "error" })
            return
          }
          window.location.href = result.url
        })
      }
      className="h-10 shrink-0 px-4.5"
    >
      {pending ? <Spinner data-icon="inline-start" /> : null}
      {pending ? "Opening…" : "Change plan"}
    </Button>
  )
}

/**
 * The trailing button on a saved-card row.
 *
 * The export draws a 40px outlined square holding a credit-card glyph, with no
 * label to say what it does. The two operations a saved card actually needs
 * are "make this the primary one" and "remove it", so the button is the
 * trigger for a menu offering exactly those — the same reading the profile
 * page's URL rows got for their unlabelled trailing control. The glyph stays
 * the export's card icon rather than the ellipsis a menu would normally use;
 * matching the export won, and the `aria-label` carries the meaning for
 * anyone who can't see it.
 *
 * A `DropdownMenuLabel` is not used here on purpose — it throws
 * `MenuGroupContext is missing` outside a `DropdownMenuGroup`, which is why
 * the items are wrapped in one.
 */
function CardRowMenu({
  paymentMethodId,
  label,
  isDefault,
}: {
  paymentMethodId: string
  label: string
  isDefault: boolean
}) {
  const [pending, startTransition] = React.useTransition()

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action()
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={pending}
            aria-label={`Manage ${label}`}
            className="size-10 shrink-0 bg-card"
          />
        }
      >
        {pending ? (
          <Spinner className="size-4.5" />
        ) : (
          <CreditCardIcon className="size-4.5" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={isDefault}
            onClick={() => run(() => setDefaultPaymentMethod(paymentMethodId))}
          >
            <StarIcon />
            {isDefault ? "Primary card" : "Set as primary"}
          </DropdownMenuItem>
          {/* Removing the *last* card is deliberately allowed. Blocking it
              would be an invented restriction: Lumen charges per purchase
              rather than off-session, so nothing needs a card on file, and
              refusing to let someone delete their own card details is the
              wrong default. Stripe's own portal allows it too. */}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => run(() => removePaymentMethod(paymentMethodId))}
          >
            <Trash2Icon />
            Remove card
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { ChangePlanButton, CardRowMenu }
