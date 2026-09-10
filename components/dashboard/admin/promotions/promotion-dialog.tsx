"use client"

import * as React from "react"
import { CalendarIcon, CheckIcon, RocketIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  discountTypeOptions,
  promotionDialogCopy,
  promotionScopeOptions,
  PROMOTION_NAME_MAX_LENGTH,
} from "@/lib/config/admin-promotions"
import type { PromotionInput } from "@/lib/actions/admin-promotions"
import type { PromotionCategory } from "@/lib/admin/promotions"
import type {
  PromotionDiscountType,
  PromotionScope,
} from "@/lib/generated/prisma/client"
import { cn } from "@/lib/utils"

/**
 * "New promotion", from
 * `ui-design/light/dashboard/admin/new-promotion__dialog_admin.png` — and
 * "Edit promotion", which has no export of its own and is the same seven
 * controls with a different title and submit. One component rather than two,
 * so the two forms cannot drift, the arrangement `topic-dialog.tsx` and
 * `category-dialog.tsx` both make.
 *
 * Measured off that export at DPR 2: a **560px** dialog on 30px padding, 44px
 * text fields filled with `--background` (they sit on a white dialog, so the
 * page colour is what separates the two — with the `dark:` twin spelled out
 * for the specificity reason `settings-controls.ts` records), 66px radio cards
 * on a 10px gap, a 40px segmented control on `p-1`, two 241px date fields on a
 * 14px gap, a 67px bordered switch row and a 40px submit.
 *
 * Three readings of the export worth keeping:
 *
 *  - **The radio cards are filled, not outlined.** Unlike `topic-dialog.tsx`'s
 *    visibility cards — whose unselected state is a plain `--background` box
 *    with a transparent border — this export gives *both* states a fill and a
 *    hairline, and marks the selected one by darkening the fill to `--hover`
 *    and the border to `--foreground`. Both cards therefore carry the border at
 *    the same width, so selecting one cannot resize it.
 *  - **The radio itself is `notifications-form.tsx`' inverted one**, measured:
 *    an 18px circle with a 1.5px ring and a 9px dot, both `--foreground`, on a
 *    transparent face — not shadcn's filled circle with a white dot punched
 *    out of it. Native radios inside their labels (`sr-only`, not removed), so
 *    arrow-key selection and the group's screen-reader semantics come from the
 *    platform — the arrangement the quiz options and the new-user role cards
 *    both use.
 *  - **The segmented control is `enrolled-courses-section.tsx`' inverted.**
 *    That one is a `bg-track` container whose selected segment is the dark
 *    `--primary` pill; this export draws the same container with a **white**
 *    pill and a soft shadow. It needs the same `aria-pressed:hover:` doubling
 *    that file documents, for the same reason — a bare `hover:bg-*` and
 *    `aria-pressed:bg-*` are both single attribute selectors and Tailwind's
 *    variant order, not source order, decides which wins.
 *
 * **No help text under the amount field.** The export draws none, and none is
 * needed: `maxLength` caps a percentage at two digits, so the only way past
 * the limit is a flat price, and `clean()` in
 * `lib/actions/admin-promotions.ts` answers that with the range in the toast.
 * A line the export does not draw would also push everything below it down the
 * dialog.
 *
 * **The export's "Cancel" is deliberately not reproduced**, per the standing
 * rule `CLAUDE.md` records: `DialogContent` already draws a close X, so a
 * second control whose only job is to dismiss is redundant. The dialog is
 * taller than a short viewport, so its content scrolls inside a fixed height
 * rather than the page growing behind the overlay.
 *
 * **"Specific categories" is the half the export does not draw.** It only
 * draws the control with *All courses* selected, so the picker below is
 * invented — the same position the wishlist's grid view was in. It is a
 * checkbox list of the top-level categories, which is the list
 * `/dashboard/admin/categories` owns, and it appears only when that segment is
 * chosen so the dialog stays the height it was drawn at.
 */

export type PromotionDialogValues = {
  name: string
  discountType: PromotionDiscountType
  /** Percent when PERCENT, cents when FIXED_PRICE. */
  value: number
  scope: PromotionScope
  categoryIds: string[]
  /** `yyyy-MM-dd`, or null for "Immediately". */
  startsOn: string | null
  endsOn: string
  forceOnAllCourses: boolean
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/**
 * `yyyy-MM-dd` to the export's `31 Oct 2026`, and back, **without `Intl` or a
 * `Date`**.
 *
 * A calendar day has no zone, so the string is the value and the `Date` exists
 * only because `Calendar` needs one. Formatting through `Intl` here would read
 * the *browser's* zone, which is how a day slides by one between the server's
 * render and the client's — the trap `lib/account.ts` records for
 * `dateOfBirth`. So the label is assembled from the string's own parts, and
 * the `Date` handed to and taken from `Calendar` is built and read in local
 * parts so the round trip lands on the day that was clicked.
 */
function dayLabel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  return `${match[3]} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`
}

function parseDay(value: string | null): Date | undefined {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null
  if (!match) return undefined
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function toDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** 30 days out, which is what a sale's Ends field should open on. */
function defaultEndsOn() {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return toDay(date)
}

const FIELD = cn(
  "h-11 rounded-lg border-border bg-background px-3.5 text-[15px] md:text-[15px]",
  "placeholder:text-muted-foreground dark:bg-background"
)

const LABEL = "text-[15px] font-semibold"

/** `notifications-form.tsx`' 46 x 26 switch — see `category-dialog.tsx`. */
const SWITCH = cn(
  "border-0 p-[3px] data-[size=default]:h-6.5 data-[size=default]:w-11.5",
  "data-unchecked:bg-track dark:data-unchecked:bg-track",
  "[&_[data-slot=switch-thumb]]:size-5",
  "[&_[data-slot=switch-thumb]]:data-checked:translate-x-full"
)

function PromotionDialog({
  open,
  onOpenChange,
  mode,
  targetId,
  values,
  categories,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  targetId?: string
  values: PromotionDialogValues | null
  categories: PromotionCategory[]
  pending: boolean
  onSubmit: (input: PromotionInput) => void
}) {
  const copy = promotionDialogCopy

  const [name, setName] = React.useState("")
  const [discountType, setDiscountType] =
    React.useState<PromotionDiscountType>("PERCENT")
  // The amount is held as **text**, not a number: a controlled number field
  // that reformats mid-keystroke fights the person typing into it. It is
  // converted once, on submit, and validated again server-side.
  const [amount, setAmount] = React.useState("")
  const [scope, setScope] = React.useState<PromotionScope>("ALL_COURSES")
  const [categoryIds, setCategoryIds] = React.useState<string[]>([])
  const [startsOn, setStartsOn] = React.useState<string | null>(null)
  const [endsOn, setEndsOn] = React.useState("")
  const [force, setForce] = React.useState(false)
  const [startOpen, setStartOpen] = React.useState(false)
  const [endOpen, setEndOpen] = React.useState(false)

  // Seeded by **adjusting state during render**, keyed on a *string* — see
  // `category-dialog.tsx`, which records why the key cannot be the `values`
  // object (the parent rebuilds it every render, which would re-seed on every
  // keystroke and spin the render loop).
  const formKey = open
    ? mode === "edit"
      ? `edit:${targetId}`
      : "create"
    : null
  const [seededKey, setSeededKey] = React.useState<string | null>(null)
  if (formKey !== seededKey) {
    setSeededKey(formKey)
    if (formKey) {
      setName(values?.name ?? "")
      setDiscountType(values?.discountType ?? "PERCENT")
      setAmount(
        values
          ? values.discountType === "PERCENT"
            ? String(values.value)
            : (values.value / 100).toFixed(2)
          : ""
      )
      setScope(values?.scope ?? "ALL_COURSES")
      setCategoryIds(values?.categoryIds ?? [])
      setStartsOn(values?.startsOn ?? null)
      setEndsOn(values?.endsOn ?? defaultEndsOn())
      setForce(values?.forceOnAllCourses ?? false)
      setStartOpen(false)
      setEndOpen(false)
    }
  }

  /**
   * The earliest day the Ends calendar offers: the start, **or today when the
   * sale is already under way**.
   *
   * Editing a running sale seeds Starts with a date in the past, so flooring
   * Ends at the start alone would offer days that `clean()` refuses outright
   * ("Pick an end date in the future"). Offering a day the action will reject
   * is worse than not offering it.
   */
  const endsFloor = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = parseDay(startsOn)
    return start && start > today ? start : today
  }, [startsOn])

  const percent = discountType === "PERCENT"
  const trimmed = name.trim()
  const amountValue = Number(amount)
  const amountValid = amount.trim().length > 0 && Number.isFinite(amountValue)
  const scopeValid = scope === "ALL_COURSES" || categoryIds.length > 0
  const ready = trimmed.length > 0 && amountValid && scopeValid && endsOn !== ""

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!ready || pending) return
    onSubmit({
      name: trimmed,
      discountType,
      // `Promotion.value` is a percent or **cents**, one column for both —
      // see the model's own note.
      value: percent ? Math.round(amountValue) : Math.round(amountValue * 100),
      scope,
      categoryIds: scope === "CATEGORIES" ? categoryIds : [],
      startsOn,
      endsOn,
      forceOnAllCourses: force,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* `sm:max-w-[560px]` repeats the variant on purpose: `DialogContent`
          carries `sm:max-w-sm` (384px), which a plain `max-w-*` loses to
          above the breakpoint whatever order Tailwind emits. */}
      <DialogContent className="flex max-h-[88vh] w-[560px] flex-col gap-0 p-0 sm:max-w-[560px]">
        <DialogHeader className="gap-2 px-7.5 pt-7.5">
          <DialogTitle className="text-xl font-bold">
            {mode === "create" ? copy.createTitle : copy.editTitle}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-6">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-7.5 pt-5 pb-7.5"
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="promotion-name" className={LABEL}>
                {copy.nameLabel}
              </label>
              <Input
                id="promotion-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={PROMOTION_NAME_MAX_LENGTH}
                placeholder={copy.namePlaceholder}
                autoComplete="off"
                className={FIELD}
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className={LABEL}>{copy.discountTypeLabel}</p>
              <div
                role="radiogroup"
                aria-label={copy.discountTypeLabel}
                className="flex flex-col gap-2.5"
              >
                {discountTypeOptions.map((option) => {
                  const selected = option.value === discountType
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-colors",
                        "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                        selected
                          ? "border-foreground bg-hover"
                          : "border-border bg-background"
                      )}
                    >
                      <input
                        type="radio"
                        name="promotion-discount-type"
                        value={option.value}
                        checked={selected}
                        onChange={() => setDiscountType(option.value)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px]",
                          selected ? "border-foreground" : "border-border"
                        )}
                      >
                        {selected ? (
                          <span className="size-[9px] rounded-full bg-foreground" />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] leading-5 font-semibold">
                          {option.label}
                        </span>
                        <span className="block text-[13px] leading-[18px] text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="promotion-amount" className={LABEL}>
                {percent ? copy.percentLabel : copy.fixedLabel}
              </label>
              <div className="relative">
                {percent ? null : (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-muted-foreground"
                  >
                    {copy.fixedPrefix}
                  </span>
                )}
                <Input
                  id="promotion-amount"
                  // `text` with `inputMode`, not `type="number"`: a number
                  // input's spinner and scroll-to-change are the wrong
                  // affordance for a price, and it rejects a partially typed
                  // "9." while the person is still typing it.
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value.replace(/[^\d.]/g, ""))
                  }
                  maxLength={percent ? 2 : 8}
                  placeholder={
                    percent ? copy.percentPlaceholder : copy.fixedPlaceholder
                  }
                  autoComplete="off"
                  className={cn(FIELD, percent ? undefined : "pl-8")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className={LABEL}>{copy.applyToLabel}</p>
              <ToggleGroup
                value={[scope]}
                onValueChange={(next: string[]) => {
                  // Clicking the selected segment would otherwise clear the
                  // value and leave neither active — keep the current one.
                  setScope(
                    (current) =>
                      (next[0] as PromotionScope | undefined) ?? current
                  )
                }}
                aria-label={copy.applyToLabel}
                className="w-fit gap-0 rounded-xl bg-track p-1"
              >
                {promotionScopeOptions.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    size="lg"
                    // `aria-pressed:hover:` rather than a plain `hover:` — see
                    // the component note and `enrolled-courses-section.tsx`.
                    className="h-8 rounded-lg px-4 text-[15px] text-muted-foreground aria-pressed:bg-card aria-pressed:font-semibold aria-pressed:text-foreground aria-pressed:shadow-sm aria-pressed:hover:bg-card"
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {scope === "CATEGORIES" ? (
              <div className="flex flex-col gap-2">
                <p className={LABEL}>{copy.categoriesLabel}</p>
                {categories.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    {copy.categoriesEmpty}
                  </p>
                ) : (
                  <div
                    role="group"
                    aria-label={copy.categoriesLabel}
                    className="flex flex-wrap gap-2"
                  >
                    {categories.map((category) => {
                      const checked = categoryIds.includes(category.id)
                      return (
                        <label
                          key={category.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-[15px] transition-colors",
                            "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                            checked
                              ? "border-foreground bg-hover font-semibold"
                              : "border-border bg-background text-muted-foreground"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setCategoryIds((current) =>
                                current.includes(category.id)
                                  ? current.filter((id) => id !== category.id)
                                  : [...current, category.id]
                              )
                            }
                            className="sr-only"
                          />
                          {checked ? (
                            <CheckIcon aria-hidden className="size-4" />
                          ) : null}
                          {category.name}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="promotion-starts" className={LABEL}>
                  {copy.startsLabel}
                </label>
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        id="promotion-starts"
                        type="button"
                        variant="outline"
                        className={cn(
                          FIELD,
                          // `hover:`/`aria-expanded:` twins so tailwind-merge
                          // drops the outline variant's own fills — the field
                          // must not change colour because a calendar is open.
                          "w-full justify-between gap-2 pr-3.5 font-normal hover:bg-background aria-expanded:bg-background",
                          !startsOn && "text-muted-foreground"
                        )}
                      />
                    }
                  >
                    {startsOn ? dayLabel(startsOn) : copy.startsPlaceholder}
                    <CalendarIcon className="text-muted-foreground" />
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={parseDay(startsOn)}
                      onSelect={(date) => {
                        // Clearing it is meaningful: "Immediately" is the
                        // export's own placeholder for no start date.
                        setStartsOn(date ? toDay(date) : null)
                        setStartOpen(false)
                      }}
                      disabled={{ before: new Date() }}
                      defaultMonth={parseDay(startsOn) ?? new Date()}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="promotion-ends" className={LABEL}>
                  {copy.endsLabel}
                </label>
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        id="promotion-ends"
                        type="button"
                        variant="outline"
                        className={cn(
                          FIELD,
                          "w-full justify-between gap-2 pr-3.5 font-normal hover:bg-background aria-expanded:bg-background",
                          !endsOn && "text-muted-foreground"
                        )}
                      />
                    }
                  >
                    {endsOn ? dayLabel(endsOn) : copy.endsPlaceholder}
                    <CalendarIcon className="text-muted-foreground" />
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={parseDay(endsOn)}
                      onSelect={(date) => {
                        if (!date) return
                        setEndsOn(toDay(date))
                        setEndOpen(false)
                      }}
                      disabled={{ before: endsFloor }}
                      defaultMonth={parseDay(endsOn) ?? new Date()}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* A plain `div` rather than a `Card`: `Card`'s hairline is a
                `ring`, which paints outside the layout box and would push the
                row past the drawn 67px — the trap the wishlist rows and the
                notification toggles both record. */}
            <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5">
              <div>
                {/* `label htmlFor` rather than a wrapping label: Base UI's
                    `Switch` renders a `button`, and a label does not forward a
                    click to a nested button. */}
                <Label
                  htmlFor="promotion-force"
                  className="cursor-pointer text-[15px] leading-5 font-semibold"
                >
                  {copy.forceTitle}
                </Label>
                <p className="text-[13px] leading-[18px] text-muted-foreground">
                  {copy.forceDescription}
                </p>
              </div>
              <Switch
                id="promotion-force"
                checked={force}
                onCheckedChange={setForce}
                className={SWITCH}
              />
            </div>
          </div>

          <div className="mt-6">
            <Button
              type="submit"
              loading={pending}
              disabled={!ready}
              className="h-10 gap-2 px-5"
            >
              {mode === "create" ? <RocketIcon className="size-4" /> : null}
              {mode === "create" ? copy.createSubmit : copy.editSubmit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { PromotionDialog }
