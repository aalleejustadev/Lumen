"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CalendarIcon,
  CircleOffIcon,
  CopyIcon,
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { CouponDialog } from "@/components/dashboard/instructor/coupons/coupon-dialog"
import {
  formatCount,
  formatCouponDate,
  formatMoney,
  formatMoneyWhole,
  formatRedemptions,
} from "@/components/dashboard/instructor/coupons/coupons-format"
import {
  EDITOR_CARD,
  EDITOR_HEADING,
  EDITOR_LEAD,
} from "@/components/dashboard/instructor/courses/edit/editor-controls"
import {
  COUPON_PERCENT_OPTIONS,
  courseCouponsCopy,
} from "@/lib/config/course-editor"
import {
  COUPON_CODE_MAX,
  couponStatusBadge,
  couponStatusLabel,
} from "@/lib/config/instructor-coupons"
import {
  createCoupon,
  endCoupon,
  updateCoupon,
  type CouponInput,
} from "@/lib/actions/instructor-coupons"
import type { CouponRow, CourseCoupons } from "@/lib/instructor-coupons"
import { cn } from "@/lib/utils"

/**
 * The Coupons step, from `create-course-page__coupons.png` — every coupon on
 * this one course, the three figures above them, and a quick form to add one.
 *
 * Measured off that export at DPR 2: the editor's shared card, a heading row
 * whose **New coupon** (140 x 40) sits opposite the title, a lead held to a
 * **555px** measure (it wraps after "run up to"), three **80px** tiles on a
 * 16px gap filled with `--background`, a flush table of a **42px** header over
 * **61px** rows on `--border-subtle` hairlines, a 32px `⋯` at the trailing
 * edge, and a **188px** "Create a coupon" panel on `--background` holding four
 * 40px fields on a 14px gutter. Verified against the render.
 *
 * **It is the Coupons page's data and the Coupons page's rules, not a copy of
 * either.** The rows, their order and the three figures come from
 * `getCourseCoupons`, which runs the same three functions `getCouponsPage` does;
 * both forms here call `createCoupon` / `updateCoupon`, where the code format,
 * the three-active limit and the ownership check already live. Two screens
 * showing one code cannot disagree about it.
 *
 * Four things the export does not settle:
 *
 *  - **Two ways to create, on purpose, because the export draws both.** The
 *    quick form covers the common case — a percentage off, starting now, with
 *    an optional limit and end date. **New coupon** opens the full dialog for
 *    the rest: a fixed price, or a start date in the future.
 *  - **The row menu does three things that exist.** Edit (the dialog), Copy
 *    code, and **End coupon** — ending is a write to the coupon's dates, never
 *    a delete, because a redeemed code is attached to orders. An expired row's
 *    End is drawn disabled with the reason.
 *  - **The quick form's fields are placeholders, not values.** The export draws
 *    "AUTUMN30", "250" and "Pick a date" in the placeholder grey. The limit's
 *    placeholder says "Unlimited" rather than "250", because leaving it blank
 *    *is* unlimited and a number there would advertise a cap nobody set. The
 *    discount opens on 30% at full strength, since a select always holds a
 *    value.
 *  - **A course with no list price cannot take a coupon** — a percentage of
 *    nothing is nothing, and `createCoupon` would refuse it — so the form says
 *    where to set one instead of failing on submit.
 *
 * Progress is tracked **per control** (`busy`), the rule `courses-list.tsx`
 * states, so ending one row does not spin the quick form's button.
 *
 * **Every successful write calls `router.refresh()`.** The actions revalidate
 * both coupon surfaces, but this route lives in the `(instructor)` group, and a
 * revalidation from a Server Action did not re-render it in place — verified:
 * the coupon was written and the table kept showing the old rows until a
 * reload. It is the fix `publish-toggle.tsx` records for the manage page, which
 * sits in the same group.
 */
function CouponsStep({
  courseId,
  data,
}: {
  courseId: string
  data: CourseCoupons
}) {
  const [dialog, setDialog] = React.useState<
    { open: false } | { open: true; coupon: CouponRow | null }
  >({ open: false })
  const [busy, setBusy] = React.useState<
    { kind: "dialog" } | { kind: "end"; id: string } | null
  >(null)
  const [, startTransition] = React.useTransition()
  const router = useRouter()

  const { stats } = data
  const hasPrice = data.course.listPriceCents > 0

  function submitDialog(input: CouponInput) {
    const editing = dialog.open ? dialog.coupon : null
    setBusy({ kind: "dialog" })
    startTransition(async () => {
      const result = editing
        ? await updateCoupon(editing.id, input)
        : await createCoupon(input)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) {
        setDialog({ open: false })
        router.refresh()
      }
      setBusy(null)
    })
  }

  function end(row: CouponRow) {
    setBusy({ kind: "end", id: row.id })
    startTransition(async () => {
      const result = await endCoupon(row.id)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) router.refresh()
      setBusy(null)
    })
  }

  return (
    <Card className={EDITOR_CARD}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className={EDITOR_HEADING}>{courseCouponsCopy.heading}</h2>
          {/* A narrower measure than the shared lead: this export wraps after
              "run up to", which 620px does not reproduce. */}
          <p className={cn(EDITOR_LEAD, "max-w-[555px]")}>
            {courseCouponsCopy.lead}
          </p>
        </div>
        <Button
          type="button"
          disabled={!hasPrice}
          title={hasPrice ? undefined : courseCouponsCopy.needsPrice}
          onClick={() => setDialog({ open: true, coupon: null })}
          className="-mt-0.5 h-10 gap-2 px-4 text-[15px]"
        >
          <PlusIcon className="size-4" />
          {courseCouponsCopy.newCoupon}
        </Button>
      </div>

      <div className="mt-5.5 grid gap-4 sm:grid-cols-3">
        <StatTile
          value={formatCount(stats.activeCount)}
          label={courseCouponsCopy.stats.active}
        />
        <StatTile
          value={formatCount(stats.redemptions)}
          label={courseCouponsCopy.stats.redemptions}
        />
        <StatTile
          value={formatMoneyWhole(stats.revenueCents)}
          label={courseCouponsCopy.stats.revenue}
        />
      </div>

      {data.rows.length > 0 ? (
        // The repo's `Table`, not a hand-rolled one: it owns the scroll
        // container, and a hand-rolled table escaped its wrapper at phone
        // width on the Coupons page — that page's own note.
        <Table className="mt-5 min-w-[800px] table-fixed border-b border-border-subtle">
          {/* Narrower than the export's own split (23 / 15.5 / 15.5 / 19%):
              it is drawn with no sidebar, so its table is ~250px wider, and
              at those proportions the status date truncated at 1553px. The
              status column takes the difference. */}
          <colgroup>
            <col className="w-[21%]" />
            <col className="w-[14%]" />
            <col className="w-[13%]" />
            <col className="w-[15%]" />
            <col />
            <col className="w-11" />
          </colgroup>
          <TableHeader>
            <TableRow className="h-[42px] border-border-subtle hover:bg-transparent">
              {Object.values(courseCouponsCopy.columns).map((label) => (
                <TableHead
                  key={label}
                  className="h-[42px] px-1 text-[15px] font-normal text-muted-foreground"
                >
                  {label}
                </TableHead>
              ))}
              <TableHead className="px-1">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <CouponLine
                key={row.id}
                row={row}
                ending={busy?.kind === "end" && busy.id === row.id}
                onEdit={() => setDialog({ open: true, coupon: row })}
                onEnd={() => end(row)}
              />
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="mt-5 grid h-[120px] place-items-center rounded-xl border border-dashed px-6 text-center">
          <div>
            <p className="text-[15px] font-semibold">
              {courseCouponsCopy.empty.title}
            </p>
            <p className="mt-1 text-[14px] text-muted-foreground">
              {courseCouponsCopy.empty.description}
            </p>
          </div>
        </div>
      )}

      <QuickCreate courseId={courseId} hasPrice={hasPrice} />

      <CouponDialog
        open={dialog.open}
        onOpenChange={(next) =>
          setDialog(next ? { open: true, coupon: null } : { open: false })
        }
        // This course alone: the dialog's "Applies to" is then a one-row
        // choice that is already made, and a coupon created here cannot land
        // on another course.
        courses={[data.course]}
        coupon={dialog.open ? dialog.coupon : null}
        revenueShareBps={data.revenueShareBps}
        pending={busy?.kind === "dialog"}
        onSubmit={submitDialog}
      />
    </Card>
  )
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border bg-background px-4.5 py-3.5">
      <p className="text-2xl leading-8 font-bold tabular-nums">{value}</p>
      <p className="text-[15px] leading-5 text-muted-foreground">{label}</p>
    </div>
  )
}

function CouponLine({
  row,
  ending,
  onEdit,
  onEnd,
}: {
  row: CouponRow
  ending: boolean
  onEdit: () => void
  onEnd: () => void
}) {
  const copy = courseCouponsCopy
  const when =
    row.status === "scheduled"
      ? copy.when.scheduled(formatCouponDate(row.startsAt))
      : row.status === "expired" && row.endsAt
        ? copy.when.expired(formatCouponDate(row.endsAt))
        : copy.when.active(row.endsAt ? formatCouponDate(row.endsAt) : null)

  return (
    <TableRow
      className={cn(
        "h-[61px] border-border-subtle hover:bg-transparent",
        ending && "opacity-60"
      )}
    >
      <TableCell className="truncate px-1 text-[16px] font-bold tracking-[0.01em]">
        {row.code}
      </TableCell>
      <TableCell className="px-1 text-[16px] text-muted-foreground tabular-nums">
        {copy.discount(row.percentOff)}
      </TableCell>
      <TableCell className="px-1 text-[16px] font-semibold tabular-nums">
        {formatMoney(row.priceCents)}
      </TableCell>
      <TableCell className="px-1 text-[16px] text-muted-foreground tabular-nums">
        {formatRedemptions(row.redemptions, row.redemptionLimit)}
      </TableCell>
      <TableCell className="px-1">
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "inline-flex h-5.5 shrink-0 items-center rounded-full px-2.5 text-[14px] font-medium",
              couponStatusBadge[row.status]
            )}
          >
            {couponStatusLabel[row.status]}
          </span>
          <span className="truncate text-[15px] text-muted-foreground">
            {when}
          </span>
        </span>
      </TableCell>
      <TableCell className="px-1 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={copy.actions.label(row.code)}
            className="inline-grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground ring-1 ring-border transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <EllipsisIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit} className="cursor-pointer p-2">
              <PencilIcon />
              {copy.actions.edit}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void navigator.clipboard
                  .writeText(row.code)
                  .then(() =>
                    toast.add({
                      title: copy.actions.copied(row.code),
                      type: "success",
                    })
                  )
                  .catch(() => undefined)
              }}
              className="cursor-pointer p-2"
            >
              <CopyIcon />
              {copy.actions.copy}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={row.status === "expired" || ending}
              title={
                row.status === "expired" ? copy.actions.expired : undefined
              }
              onClick={onEnd}
              className="cursor-pointer p-2"
            >
              <CircleOffIcon />
              {row.status === "scheduled"
                ? copy.actions.endScheduled
                : copy.actions.end}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

/**
 * "Create a coupon", the panel at the foot of the export. A percentage off,
 * starting now; the full dialog behind **New coupon** covers everything else.
 */
function QuickCreate({
  courseId,
  hasPrice,
}: {
  courseId: string
  hasPrice: boolean
}) {
  const copy = courseCouponsCopy.create
  const [code, setCode] = React.useState("")
  const [percent, setPercent] = React.useState("30")
  const [limit, setLimit] = React.useState("")
  const [expires, setExpires] = React.useState<Date | null>(null)
  const [dateOpen, setDateOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const router = useRouter()

  // Computed once, in a state initialiser, so the calendar's "before today"
  // boundary is fixed — reading the clock in the body of a render is the
  // `react-hooks/purity` error the audit log's note records.
  const [today] = React.useState(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return start
  })

  function submit() {
    const trimmedLimit = limit.trim()
    const parsedLimit = trimmedLimit === "" ? null : Number(trimmedLimit)
    startTransition(async () => {
      const result = await createCoupon({
        code,
        courseId,
        discountType: "PERCENT",
        percentOff: Number(percent),
        priceCents: 0,
        redemptionLimit: parsedLimit,
        startsAt: null,
        endsAt: expires ? expires.toISOString() : null,
      })
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) {
        setCode("")
        setLimit("")
        setExpires(null)
        router.refresh()
      }
    })
  }

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-lg border bg-card px-3 text-[15px] outline-none transition-shadow placeholder:text-subtle-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
  const labelClass = "block text-[15px] leading-5 text-muted-foreground"

  return (
    <section
      aria-labelledby="quick-coupon-heading"
      className="mt-6 rounded-xl border bg-background px-5 pt-4 pb-4.5"
    >
      <h3
        id="quick-coupon-heading"
        className="text-base leading-6 font-semibold"
      >
        {copy.heading}
      </h3>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <fieldset
          disabled={!hasPrice || pending}
          className="mt-2 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="min-w-0">
            <label htmlFor="quick-coupon-code" className={labelClass}>
              {copy.code}
            </label>
            <input
              id="quick-coupon-code"
              value={code}
              required
              maxLength={COUPON_CODE_MAX}
              autoComplete="off"
              placeholder={copy.codePlaceholder}
              // Upper-cased as typed, because that is how it is stored and
              // drawn in the table above — see `normaliseCode`.
              onChange={(event) =>
                setCode(event.target.value.toUpperCase().replace(/\s+/g, ""))
              }
              className={cn(fieldClass, "tracking-[0.01em]")}
            />
          </div>

          <div className="min-w-0">
            <label id="quick-coupon-discount-label" className={labelClass}>
              {copy.discount}
            </label>
            <Select
              value={percent}
              onValueChange={(value) => {
                if (typeof value === "string") setPercent(value)
              }}
            >
              <SelectTrigger
                aria-labelledby="quick-coupon-discount-label"
                className={cn(
                  fieldClass,
                  "justify-between gap-2 pr-3 data-[size=default]:h-10 dark:bg-card dark:hover:bg-card"
                )}
              >
                {/* The render form — a bare `SelectValue` prints "30". */}
                <SelectValue>
                  {(current: string) =>
                    courseCouponsCopy.discount(Number(current))
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {COUPON_PERCENT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {courseCouponsCopy.discount(option)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <label htmlFor="quick-coupon-limit" className={labelClass}>
              {copy.limit}
            </label>
            <input
              id="quick-coupon-limit"
              value={limit}
              inputMode="numeric"
              placeholder={copy.limitPlaceholder}
              onChange={(event) =>
                setLimit(event.target.value.replace(/[^0-9]/g, ""))
              }
              className={fieldClass}
            />
          </div>

          <div className="min-w-0">
            <label htmlFor="quick-coupon-expires" className={labelClass}>
              {copy.expires}
            </label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger
                render={
                  <button
                    id="quick-coupon-expires"
                    type="button"
                    className={cn(
                      fieldClass,
                      "flex cursor-pointer items-center justify-between gap-2 text-left",
                      !expires && "text-subtle-foreground"
                    )}
                  />
                }
              >
                {expires ? formatCouponDate(expires) : copy.expiresPlaceholder}
                <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={expires ?? undefined}
                  // A coupon that expires in the past is born expired.
                  disabled={{ before: today }}
                  onSelect={(date) => {
                    setExpires(date ?? null)
                    setDateOpen(false)
                  }}
                  autoFocus
                />
                {expires ? (
                  <div className="border-t border-border p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-full text-[13px]"
                      onClick={() => {
                        setExpires(null)
                        setDateOpen(false)
                      }}
                    >
                      {copy.clearDate}
                    </Button>
                  </div>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>
        </fieldset>

        {hasPrice ? null : (
          <p className="mt-3 text-[14px] text-muted-foreground">
            {courseCouponsCopy.needsPrice}
          </p>
        )}

        <Button
          type="submit"
          loading={pending}
          disabled={!hasPrice}
          className="mt-4 h-10 px-5 text-[15px]"
        >
          {copy.submit}
        </Button>
      </form>
    </section>
  )
}

export { CouponsStep }
