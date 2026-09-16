"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  PAYOUT_LABEL_MAX_LENGTH,
  PAYOUT_LAST4_LENGTH,
  payoutCurrencies,
  payoutMethodDialogCopy,
  payoutMethodTypes,
  type PayoutMethodTypeValue,
} from "@/lib/config/instructor-payouts"
import type {
  PayoutMethodFieldErrors,
  PayoutMethodInput,
} from "@/lib/actions/instructor-payouts"
import { cn } from "@/lib/utils"

/**
 * "Add payout method" and "Edit payout method". **Neither has an export** —
 * `payout-settings-page.png` draws the "Add payout method" button and the per
 * row "Edit" and stops there — so the dialog is built from
 * `new-category__dialog_admin.png`'s vocabulary, which is the app's own dialog
 * measurement: a 478px box on 30px padding, a 20px/700 title over a 15px lead,
 * 44px fields filled `--background`, a 67px bordered switch row and a 44px
 * submit. One component for both modes rather than two, so the two forms
 * cannot drift — the arrangement `category-dialog.tsx` makes for the same
 * reason.
 *
 * **The export's own page has no Cancel and neither does this**: `DialogContent`
 * already draws a close X, and a second control whose only job is to dismiss is
 * the redundancy the payout-run dialog had removed. That is the standing rule
 * here, not a one-off. The footer keeps the two controls that *do* something —
 * and in edit mode Remove is one of them, drawn as destructive text rather than
 * a filled button, the weight `course-view-page__admin.png` gives Reject.
 *
 * **Removal lives here rather than on the row.** The export draws no remove
 * affordance at all, and a list you can only add to is the gap the profile
 * page's URL rows already document ("the little teal glyph … rendered here as
 * the remove button a grow-by-hand list actually needs"). Putting it inside
 * Edit keeps the row exactly as drawn and puts the destructive action one
 * deliberate step away.
 *
 * Three things about the fields:
 *
 *  - **The form asks for the last four digits, not an account number.**
 *    `PayoutMethod`'s own schema note forbids storing a raw one, and the row
 *    only ever renders a last-4. A full number would have to be handed
 *    straight to a processor, and there is none — see
 *    `lib/actions/instructor-payouts.ts`.
 *  - **PayPal has no last-4 and no currency.** The address *is* the
 *    identifier, and a PayPal balance settles in whatever currency that
 *    account holds — which nothing here is told. Showing two fields that would
 *    be stored as filler would be worse than not asking.
 *  - `Select` needs **`data-[size=default]:h-11`** rather than a plain
 *    `h-11`: its own `data-[size=default]:h-8` is an attribute selector that
 *    wins on specificity whatever order Tailwind emits. Repeat the variant,
 *    don't reach for `!` — the trap `account-form.tsx` already records.
 */

const BLANK = {
  type: "BANK_TRANSFER" as PayoutMethodTypeValue,
  label: "",
  last4: "",
  currency: "usd",
  primary: false,
}

/** Everything the dialog needs about the row it is editing. */
export type PayoutMethodDialogValues = typeof BLANK

const FIELD = cn(
  "h-11 bg-background px-3.5 text-[15px] md:text-[15px] dark:bg-background",
  "placeholder:text-muted-foreground"
)

const LABEL = "text-[15px] font-semibold"

/** The notifications page's 46 x 26 switch with a 20px thumb inset 3px,
 *  against the generated 32 x 18.4. Reproduced rather than imported for the
 *  reason `category-dialog.tsx` gives: it is one measurement read off several
 *  exports, and an instructor dialog should not be coupled to a learner
 *  settings page. */
const SWITCH = cn(
  "border-0 p-[3px] data-[size=default]:h-6.5 data-[size=default]:w-11.5",
  "data-unchecked:bg-track dark:data-unchecked:bg-track",
  "[&_[data-slot=switch-thumb]]:size-5",
  "[&_[data-slot=switch-thumb]]:data-checked:translate-x-full"
)

function PayoutMethodDialog({
  open,
  onOpenChange,
  mode,
  targetId,
  values,
  errors,
  pending,
  /** True when this would be the account's only method, which forces PRIMARY
   *  on and makes the switch inert — there is nothing to fall back to. */
  isOnlyMethod,
  onSubmit,
  onRemove,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  targetId?: string
  values: PayoutMethodDialogValues | null
  errors: PayoutMethodFieldErrors
  pending: boolean
  isOnlyMethod: boolean
  onSubmit: (input: PayoutMethodInput) => void
  onRemove: () => void
}) {
  const [type, setType] = React.useState<PayoutMethodTypeValue>("BANK_TRANSFER")
  const [label, setLabel] = React.useState("")
  const [last4, setLast4] = React.useState("")
  const [currency, setCurrency] = React.useState("usd")
  const [primary, setPrimary] = React.useState(false)

  // Seeded by **adjusting state during render** rather than in an effect —
  // React's own pattern for "a prop changed, reset some state", and the one
  // the hooks lint rule accepts. The trigger is a **string**, not the `values`
  // object, whose identity the parent rebuilds every render: comparing
  // identities would re-seed the fields on every keystroke and spin the render
  // loop. See `category-dialog.tsx`, which records the same trap.
  const formKey = open
    ? mode === "edit"
      ? `edit:${targetId}`
      : "create"
    : null
  const [seededKey, setSeededKey] = React.useState<string | null>(null)
  if (formKey !== seededKey) {
    setSeededKey(formKey)
    if (formKey) {
      const seed = values ?? BLANK
      setType(seed.type)
      setLabel(seed.label)
      setLast4(seed.last4)
      setCurrency(seed.currency)
      setPrimary(seed.primary || isOnlyMethod)
    }
  }

  const copy = payoutMethodDialogCopy
  const isBank = type === "BANK_TRANSFER"
  const canSubmit = label.trim().length > 0 && (!isBank || last4.length > 0)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit || pending) return
    onSubmit({ type, label: label.trim(), last4, currency, primary })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* `sm:max-w-[478px]` repeats the variant on purpose: `DialogContent`
          carries `sm:max-w-sm` (384px), which a plain `max-w-*` loses to above
          the breakpoint whatever order Tailwind emits. */}
      <DialogContent className="w-[478px] gap-0 p-7.5 sm:max-w-[478px]">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-bold">
            {mode === "create" ? copy.createTitle : copy.editTitle}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-6">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="mt-4 flex flex-col gap-5">
          {/* Native radios inside their labels (`sr-only`, not removed), so
              arrow-key selection and the group's screen-reader semantics come
              from the platform — the arrangement the quiz page's option rows
              and the new-user role cards both use. */}
          <div className="flex flex-col gap-2">
            <p className={LABEL}>{copy.typeLabel}</p>
            <div
              role="radiogroup"
              aria-label={copy.typeLabel}
              className="grid grid-cols-2 gap-2.5"
            >
              {payoutMethodTypes.map((option) => {
                const selected = option.value === type
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 text-[15px] font-medium transition-colors",
                      "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                      selected
                        ? "border-foreground bg-background"
                        : "border-border hover:bg-hover"
                    )}
                  >
                    <input
                      type="radio"
                      name="payout-method-type"
                      value={option.value}
                      checked={selected}
                      onChange={() => setType(option.value)}
                      className="sr-only"
                    />
                    <option.icon
                      aria-hidden
                      className="size-4.5 text-muted-foreground"
                    />
                    {option.label}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="payout-label" className={LABEL}>
              {isBank ? copy.bankNameLabel : copy.paypalLabel}
            </label>
            <Input
              id="payout-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={PAYOUT_LABEL_MAX_LENGTH}
              placeholder={
                isBank ? copy.bankNamePlaceholder : copy.paypalPlaceholder
              }
              // Deliberately not `type="email"` for PayPal: the action
              // validates the address server-side either way, and the browser
              // refusing to submit would hide our own message behind a native
              // bubble the page cannot style.
              inputMode={isBank ? "text" : "email"}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={errors.label ? true : undefined}
              className={FIELD}
            />
            {errors.label ? (
              <p className="text-[13px] text-destructive">{errors.label}</p>
            ) : null}
          </div>

          {isBank ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="payout-last4" className={LABEL}>
                  {copy.last4Label}
                </label>
                <Input
                  id="payout-last4"
                  value={last4}
                  onChange={(event) =>
                    setLast4(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, PAYOUT_LAST4_LENGTH)
                    )
                  }
                  inputMode="numeric"
                  placeholder={copy.last4Placeholder}
                  autoComplete="off"
                  aria-invalid={errors.last4 ? true : undefined}
                  className={FIELD}
                />
                {errors.last4 ? (
                  <p className="text-[13px] text-destructive">{errors.last4}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="payout-currency" className={LABEL}>
                  {copy.currencyLabel}
                </label>
                {/* Base UI's `onValueChange` is typed `string | null` — a Select can
                    be cleared — so the null is folded back to the platform
                    default rather than widening this state to nullable for a
                    case the trigger never offers. */}
                <Select
                  value={currency}
                  onValueChange={(value) => setCurrency(value ?? "usd")}
                >
                  <SelectTrigger
                    id="payout-currency"
                    className={cn(
                      FIELD,
                      "w-full data-[size=default]:h-11",
                      "[&>span]:text-[15px]"
                    )}
                  >
                    {/* A render function, not a bare `SelectValue`: Base UI
                        prints the raw *value* unless it is told how to label
                        one, so this showed "usd" rather than "USD ($)". */}
                    <SelectValue>
                      {(current: string) =>
                        payoutCurrencies.find(
                          (option) => option.value === current
                        )?.label ?? current
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {payoutCurrencies.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {/* 67px, which `py-3.5` over a 20px title line and an 18px
              description line lands on. A plain `div` rather than a `Card`:
              `Card`'s hairline is a `ring`, which paints outside the layout
              box and would push the row past that height. */}
          <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5">
            <div className="min-w-0">
              {/* `label htmlFor` rather than a wrapping label: Base UI's
                  `Switch` renders a `button`, and a label does not forward a
                  click to a nested button the way it does to a nested input. */}
              <Label
                htmlFor="payout-primary"
                className={cn(
                  "text-[15px] leading-5 font-semibold",
                  isOnlyMethod ? "cursor-default" : "cursor-pointer"
                )}
              >
                {copy.primaryTitle}
              </Label>
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                {isOnlyMethod
                  ? copy.primaryOnlyDescription
                  : copy.primaryDescription}
              </p>
            </div>
            <Switch
              id="payout-primary"
              checked={primary || isOnlyMethod}
              disabled={isOnlyMethod}
              onCheckedChange={setPrimary}
              className={SWITCH}
            />
          </div>

          <div className="mt-1 flex items-center gap-2">
            <Button
              type="submit"
              loading={pending}
              disabled={!canSubmit}
              className="h-11 px-5"
            >
              {mode === "create" ? copy.createSubmit : copy.editSubmit}
            </Button>
            {mode === "edit" ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onRemove}
                disabled={pending}
                className="h-11 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {copy.remove}
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { PayoutMethodDialog }
