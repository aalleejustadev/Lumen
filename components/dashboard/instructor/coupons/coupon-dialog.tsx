"use client"

import * as React from "react"
import { CalendarIcon, InfoIcon } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  formatCouponDate,
  formatMoney,
} from "@/components/dashboard/instructor/coupons/coupons-format"
import {
  COUPON_CODE_MAX,
  couponDialogCopy,
  discountTypes,
} from "@/lib/config/instructor-coupons"
import type { CouponInput } from "@/lib/actions/instructor-coupons"
import type { CouponCourse, CouponRow } from "@/lib/instructor-coupons"
import { cn } from "@/lib/utils"

/**
 * "Create coupon", from
 * `ui-design/light/dashboard/instructor/create-coupon__dialog.png` — and "Edit
 * coupon", which has no export of its own and is the same seven fields with a
 * different title and submit. One component rather than two, the call
 * `category-dialog.tsx` makes, so the two forms cannot drift.
 *
 * Measured off that export at DPR 2: a **540px** dialog on 30px padding (a
 * 478px content column), a 20px/700 title over a 14px lead, 44px fields filled
 * with `--background`, two 66px discount-type cards on a 10px gap, a two-up
 * field grid split 232/232 on a 14px gutter, a 70px callout and a 40px submit.
 *
 * Six things decide what it does:
 *
 *  - **The export's "Cancel" is not reproduced**, per the standing dialog rule
 *    — `DialogContent` already draws a close X in the corner, and this export
 *    draws one too, so a second control whose only job is to dismiss is the
 *    redundancy the payout-run dialog had removed. The footer keeps the one
 *    button that does something.
 *  - **Both discount types write both columns.** The table draws "40% off" and
 *    "$59.99" on the same row whichever card was chosen, so the action derives
 *    the missing half; `Coupon.discountType` records which one was typed, and
 *    is the only reason Edit can re-open on the right card.
 *  - **The fields are filled with `--background`, not left transparent**, and
 *    the `dark:` twin is spelled out — `Input` carries `dark:bg-input/30`, a
 *    wrapped selector a plain `bg-background` loses to, which would fill the
 *    control *lighter* than its own dialog in dark mode. The trap
 *    `settings-controls.ts` records; repeating the variant is the fix, not `!`.
 *  - **The discount cards are native radios inside their labels** (`sr-only`,
 *    not removed), so arrow-key selection and grouping come from the platform
 *    — the arrangement the quiz page's option rows and `category-dialog.tsx`'s
 *    swatches already use.
 *  - **The dates are `Popover` + `Calendar`, not `<input type="date">`**, for
 *    `account-form.tsx`' reason: the export's styling cannot be applied to the
 *    native control. They page month by month rather than
 *    `captionLayout="dropdown"` — unlike a birthday, a coupon's dates are
 *    weeks away, so paging is the right affordance.
 *  - **The callout computes its own figures** from the form's live values
 *    rather than carrying them in the sentence. It states a real rule — an
 *    instructor's share is taken on what the learner actually paid — and a
 *    number written into copy would be a second source of truth free to drift
 *    from the one the money runs on, the point the Help Center's FAQ answers
 *    make.
 */

/** 44px fields on the page ground, the geometry `category-dialog.tsx` draws. */
const FIELD =
  "h-11 rounded-lg bg-background text-[15px] md:text-[15px] dark:bg-background"
const LABEL = "text-[14px] font-medium text-foreground"

function blank(courseId: string): CouponInput {
  return {
    code: "",
    courseId,
    discountType: "PERCENT",
    percentOff: 40,
    priceCents: 0,
    redemptionLimit: null,
    startsAt: null,
    endsAt: null,
  }
}

function CouponDialog({
  open,
  onOpenChange,
  courses,
  coupon,
  revenueShareBps,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  courses: CouponCourse[]
  /** Null for "Create", a row for "Edit". */
  coupon: CouponRow | null
  /** The platform's share, so the callout can quote a real payout. */
  revenueShareBps: number
  pending: boolean
  onSubmit: (input: CouponInput) => void
}) {
  const [values, setValues] = React.useState<CouponInput>(() =>
    blank(courses[0]?.id ?? "")
  )
  const [startsOpen, setStartsOpen] = React.useState(false)
  const [endsOpen, setEndsOpen] = React.useState(false)

  // Seeded by adjusting state *during render*, keyed on a **string** rather
  // than on the `coupon` object — the parent rebuilds its props every render,
  // so keying on identity would re-seed the fields on every keystroke and spin
  // the render loop. The trap `category-dialog.tsx` records.
  const seedKey = `${open}:${coupon?.id ?? "new"}`
  const [lastSeed, setLastSeed] = React.useState(seedKey)
  if (seedKey !== lastSeed) {
    setLastSeed(seedKey)
    if (open) {
      setValues(
        coupon
          ? {
              code: coupon.code,
              courseId: coupon.courseId,
              discountType: coupon.discountType,
              percentOff: coupon.percentOff,
              priceCents: coupon.priceCents,
              redemptionLimit: coupon.redemptionLimit,
              startsAt: coupon.startsAt.toISOString(),
              endsAt: coupon.endsAt ? coupon.endsAt.toISOString() : null,
            }
          : blank(courses[0]?.id ?? "")
      )
    }
  }

  const course = courses.find((entry) => entry.id === values.courseId)
  const percent = values.discountType === "PERCENT" ? values.percentOff : null
  const listPrice = course?.listPriceCents ?? 0
  const discounted =
    values.discountType === "FIXED_PRICE"
      ? values.priceCents
      : Math.round((listPrice * (100 - (percent ?? 0))) / 100)
  const sane =
    listPrice > 0 && discounted >= 0 && discounted < listPrice && course
  const payout = Math.round((discounted * revenueShareBps) / 10000)

  const startsAt = values.startsAt ? new Date(values.startsAt) : null
  const endsAt = values.endsAt ? new Date(values.endsAt) : null

  function set<K extends keyof CouponInput>(key: K, value: CouponInput[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-7.5 sm:max-w-[540px]">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-[20px] font-bold">
            {coupon ? couponDialogCopy.editTitle : couponDialogCopy.createTitle}
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-6">
            {couponDialogCopy.description}
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(values)
          }}
        >
          {/* Coupon code ------------------------------------------------- */}
          <div className="grid gap-2">
            <Label htmlFor="coupon-code" className={LABEL}>
              {couponDialogCopy.code}
            </Label>
            <Input
              id="coupon-code"
              value={values.code}
              maxLength={COUPON_CODE_MAX}
              autoCapitalize="characters"
              placeholder={couponDialogCopy.codePlaceholder}
              onChange={(event) => set("code", event.target.value)}
              className={cn(FIELD, "uppercase")}
            />
          </div>

          {/* Applies to -------------------------------------------------- */}
          <div className="grid gap-2">
            <Label htmlFor="coupon-course" className={LABEL}>
              {couponDialogCopy.appliesTo}
            </Label>
            <Select
              value={values.courseId}
              onValueChange={(next: string | null) =>
                set("courseId", next ?? "")
              }
            >
              {/* `data-[size=default]:h-11` repeats the variant `SelectTrigger`
                  carries (`data-[size=default]:h-8`) — an attribute selector a
                  plain `h-11` loses to on specificity. The note
                  `settings-account.tsx` records. */}
              <SelectTrigger
                id="coupon-course"
                className={cn(
                  FIELD,
                  "w-full data-[size=default]:h-11 dark:bg-background"
                )}
              >
                {/* A render function, not a bare `SelectValue`: the trigger
                    otherwise prints the raw course id. The pattern
                    `browse-courses.tsx` uses. */}
                <SelectValue
                  placeholder={couponDialogCopy.appliesToPlaceholder}
                >
                  {(current: string) =>
                    courses.find((entry) => entry.id === current)?.title ??
                    couponDialogCopy.appliesToPlaceholder
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {courses.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Discount type ----------------------------------------------- */}
          <div className="grid gap-2">
            <span className={LABEL}>{couponDialogCopy.discountType}</span>
            <div className="grid gap-2.5">
              {discountTypes.map((entry) => {
                const selected = values.discountType === entry.value
                return (
                  <label
                    key={entry.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3.5 rounded-lg border px-4 py-3.5 transition-colors",
                      selected
                        ? // A 2px `--foreground` ring drawn *inside* the box,
                          // and every card carries a border so the two stay
                          // the same size — the treatment
                          // `category-dialog.tsx`'s swatches use.
                          "border-2 border-foreground bg-hover px-[15px] py-[13px]"
                        : "border-border bg-background hover:bg-hover/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="discount-type"
                      className="sr-only"
                      checked={selected}
                      onChange={() => set("discountType", entry.value)}
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-[18px] shrink-0 place-items-center rounded-full border-2",
                        selected ? "border-foreground" : "border-border bg-card"
                      )}
                    >
                      {selected ? (
                        <span className="size-2 rounded-full bg-foreground" />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[16px] font-semibold">
                        {entry.title}
                      </span>
                      <span className="block text-[13px] text-muted-foreground">
                        {entry.description}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Amount + limit ---------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="grid gap-2">
              <Label htmlFor="coupon-amount" className={LABEL}>
                {values.discountType === "PERCENT"
                  ? couponDialogCopy.percentOff
                  : couponDialogCopy.fixedPrice}
              </Label>
              <Input
                id="coupon-amount"
                inputMode="decimal"
                value={
                  values.discountType === "PERCENT"
                    ? String(values.percentOff)
                    : values.priceCents === 0
                      ? ""
                      : (values.priceCents / 100).toString()
                }
                onChange={(event) => {
                  const raw = Number(event.target.value.replace(/[^0-9.]/g, ""))
                  if (values.discountType === "PERCENT") {
                    set("percentOff", Number.isFinite(raw) ? raw : 0)
                  } else {
                    set(
                      "priceCents",
                      Number.isFinite(raw) ? Math.round(raw * 100) : 0
                    )
                  }
                }}
                className={FIELD}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coupon-limit" className={LABEL}>
                {couponDialogCopy.redemptionLimit}
              </Label>
              <Input
                id="coupon-limit"
                inputMode="numeric"
                value={
                  values.redemptionLimit === null
                    ? ""
                    : String(values.redemptionLimit)
                }
                placeholder={couponDialogCopy.redemptionLimitPlaceholder}
                onChange={(event) => {
                  const digits = event.target.value.replace(/[^0-9]/g, "")
                  set("redemptionLimit", digits === "" ? null : Number(digits))
                }}
                className={FIELD}
              />
            </div>
          </div>

          {/* Dates -------------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3.5">
            <DateField
              id="coupon-starts"
              label={couponDialogCopy.starts}
              placeholder={couponDialogCopy.startsPlaceholder}
              value={startsAt}
              open={startsOpen}
              onOpenChange={setStartsOpen}
              onSelect={(date) => {
                set("startsAt", date ? date.toISOString() : null)
                setStartsOpen(false)
              }}
            />
            <DateField
              id="coupon-expires"
              label={couponDialogCopy.expires}
              placeholder={couponDialogCopy.expiresPlaceholder}
              value={endsAt}
              open={endsOpen}
              onOpenChange={setEndsOpen}
              onSelect={(date) => {
                set("endsAt", date ? date.toISOString() : null)
                setEndsOpen(false)
              }}
            />
          </div>

          {/* Earnings callout -------------------------------------------- */}
          <div className="flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3.5">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-[13px] leading-6 text-muted-foreground">
              {sane
                ? couponDialogCopy.earningsNote(
                    formatMoney(discounted),
                    formatMoney(payout),
                    formatMoney(listPrice)
                  )
                : couponDialogCopy.earningsNotePending}
            </p>
          </div>

          <Button
            type="submit"
            loading={pending}
            className="mt-1 h-10 w-fit px-5"
          >
            {coupon ? couponDialogCopy.save : couponDialogCopy.create}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DateField({
  id,
  label,
  placeholder,
  value,
  open,
  onOpenChange,
  onSelect,
}: {
  id: string
  label: string
  placeholder: string
  value: Date | null
  open: boolean
  onOpenChange: (next: boolean) => void
  onSelect: (date: Date | undefined) => void
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className={LABEL}>
        {label}
      </Label>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className={cn(
                FIELD,
                // `hover:`/`aria-expanded:` twins so tailwind-merge drops the
                // `outline` variant's own — the field must not change colour
                // just because the calendar is open. `account-form.tsx`' note.
                "w-full justify-between gap-2 border-border px-3.5 font-normal hover:bg-background aria-expanded:bg-background",
                !value && "text-muted-foreground"
              )}
            />
          }
        >
          {value ? formatCouponDate(value) : placeholder}
          <CalendarIcon className="size-4 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={onSelect}
            autoFocus
          />
          {value ? (
            <div className="border-t border-border p-2">
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-full text-[13px]"
                onClick={() => onSelect(undefined)}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { CouponDialog }
