"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LayoutGridIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "@/components/ui/toast"
import { CouponDialog } from "@/components/dashboard/instructor/coupons/coupon-dialog"
import {
  couponSchedule,
  formatMoney,
  formatRedemptions,
  redemptionFraction,
} from "@/components/dashboard/instructor/coupons/coupons-format"
import {
  createCoupon,
  updateCoupon,
  type CouponInput,
} from "@/lib/actions/instructor-coupons"
import {
  COUPONS_PAGE_SIZE,
  couponStatusBadge,
  couponStatusLabel,
  couponTabs,
  couponsCopy,
  type CouponTab,
} from "@/lib/config/instructor-coupons"
import type { CouponRow, CouponsPage } from "@/lib/instructor-coupons"
import { cn } from "@/lib/utils"

/**
 * `/dashboard/instructor/coupons`, from
 * `ui-design/light/dashboard/instructor/coupons-page__main.png` — the title
 * row, the segmented tabs beside the course filter, the table, and the footer.
 *
 * Measured off that export at DPR 2 and verified against the render: the
 * instructor shell's usual page inset, a four-up KPI row of 364px cards on a
 * 16px gap, then a **42px** segmented track (`--track`, `p-1`, the dark pill
 * inside) opposite a 42px course filter, then a zero-padding card whose 43px
 * header sits over **72px** rows divided by `--border-subtle`. Cells are inset
 * 20px; a 6px redemption bar runs 196px with the counter 12px past its end,
 * and the row's trailing Edit is a 53 x 33 bordered white button.
 *
 * It is one client component because the header's **New coupon** sits in the
 * title's row and opens the dialog that the table's **Edit** also opens — the
 * reason `categories-list.tsx` is client all the way up. The four KPI cards
 * are a Server Component passed in as `children`, so a whole row of markup and
 * its icons stay off the bundle, the arrangement `community-page.tsx` records.
 *
 * Three things decide how it behaves:
 *
 *  - **The tabs and the course filter write to the URL; nothing else does.**
 *    Both change which rows exist, which happens in SQL, so a narrowed view is
 *    a link you can paste and the back button walks it — the split
 *    `users-table.tsx` makes between its filters and its Columns menu.
 *  - **Progress is tracked per control** (`busy`), not per page: one flag off
 *    `useTransition()` would spin every row's Edit while a different row saved.
 *    The rule `courses-list.tsx` states and `promotions-board.tsx` follows.
 *  - **The pager is drawn even at one page**, because the export draws it that
 *    way — its own footer reads "Showing 1–5 of 8" with Previous disabled.
 */

/** Both controls in the filter row measure 42px in the export, and they have
 *  to match each other before they match the app's 40px button baseline. */
const CONTROL = "h-[42px]"

function CouponsBoard({
  page,
  revenueShareBps,
  children,
}: {
  page: CouponsPage
  revenueShareBps: number
  /** The four KPI cards, rendered on the server — see the component note. */
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()
  const [saving, startSaving] = React.useTransition()
  const [dialog, setDialog] = React.useState<
    { open: false } | { open: true; coupon: CouponRow | null }
  >({ open: false })

  const push = React.useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams)
      for (const [key, next] of Object.entries(changes)) {
        if (next === null || next === "") params.delete(key)
        else params.set(key, next)
      }
      // Any filter change invalidates the page number — page 2 of one tab is
      // rarely page 2 of another.
      params.delete("page")
      const query = params.toString()
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        })
      })
    },
    [pathname, router, searchParams]
  )

  const hrefFor = React.useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams)
      if (next <= 1) params.delete("page")
      else params.set("page", String(next))
      const query = params.toString()
      return query ? `${pathname}?${query}` : pathname
    },
    [pathname, searchParams]
  )

  function submit(input: CouponInput) {
    const editing = dialog.open ? dialog.coupon : null
    startSaving(async () => {
      const result = editing
        ? await updateCoupon(editing.id, input)
        : await createCoupon(input)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) setDialog({ open: false })
    })
  }

  // Off the **page size**, not `rows.length`: the last page is short, so
  // multiplying by what it happens to hold made page 2 of 8 read "4–6".
  const from = page.total === 0 ? 0 : (page.page - 1) * COUPONS_PAGE_SIZE + 1
  const to = from === 0 ? 0 : from + page.rows.length - 1
  const filtered = page.query.tab !== "all" || page.query.courseId !== null

  return (
    <>
      {/* Header ---------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* `font-bold` explicitly: `globals.css` sets every `h1` to 800 and
              the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
          <h1 className="text-[32px] leading-none font-bold">
            {couponsCopy.title}
          </h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {couponsCopy.description}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setDialog({ open: true, coupon: null })}
          disabled={page.courses.length === 0}
          className="h-10 shrink-0 gap-2 px-4"
        >
          <PlusIcon className="size-4" />
          {couponsCopy.newCoupon}
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>

      {/* Filter row ------------------------------------------------------ */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {/* `aria-pressed:hover:` rather than a plain `hover:`: both are single
            attribute selectors, so Tailwind's variant order — not source order
            — would decide which wins and could wash the dark pill out. The
            note `enrolled-courses-section.tsx` records. */}
        <ToggleGroup
          value={[page.query.tab]}
          onValueChange={(next: string[]) => {
            const chosen = next[0] as CouponTab | undefined
            if (!chosen || chosen === page.query.tab) return
            push({ tab: chosen === "all" ? null : chosen })
          }}
          aria-label="Filter coupons by status"
          className={cn(CONTROL, "gap-0 rounded-lg bg-track p-1")}
        >
          {couponTabs.map((tab) => (
            <ToggleGroupItem
              key={tab.value}
              value={tab.value}
              size="lg"
              className="rounded-md px-4 text-muted-foreground aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
            >
              {tab.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="ml-auto">
          <Select
            value={page.query.courseId ?? "all"}
            onValueChange={(next: string | null) =>
              push({ course: !next || next === "all" ? null : next })
            }
          >
            {/* `data-[size=default]:h-[42px]` repeats the variant
                `SelectTrigger` carries — an attribute selector a plain height
                loses to on specificity. */}
            <SelectTrigger
              aria-label={couponsCopy.allCourses}
              className={cn(
                CONTROL,
                "min-w-[180px] gap-2 rounded-lg bg-card shadow-sm data-[size=default]:h-[42px]"
              )}
            >
              <LayoutGridIcon className="size-4 text-muted-foreground" />
              {/* A render function, not a bare `SelectValue`: the trigger
                  otherwise prints the raw value, and "all" is a sentinel
                  rather than a label anybody should read. The pattern
                  `browse-courses.tsx` already uses. */}
              <SelectValue>
                {(current: string) =>
                  page.courses.find((course) => course.id === current)?.title ??
                  couponsCopy.allCourses
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{couponsCopy.allCourses}</SelectItem>
              {page.courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table ----------------------------------------------------------- */}
      {page.total === 0 && !filtered ? (
        <Card className="mt-4 p-0 [--card-spacing:0px]">
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PlusIcon />
              </EmptyMedia>
              <EmptyTitle>{couponsCopy.empty.title}</EmptyTitle>
              <EmptyDescription>
                {couponsCopy.empty.description}
              </EmptyDescription>
            </EmptyHeader>
            <Button
              type="button"
              onClick={() => setDialog({ open: true, coupon: null })}
              disabled={page.courses.length === 0}
              className="h-10 gap-2 px-4"
            >
              <PlusIcon className="size-4" />
              {couponsCopy.newCoupon}
            </Button>
          </Empty>
        </Card>
      ) : (
        <Card
          className={cn(
            "mt-4 overflow-hidden p-0 [--card-spacing:0px]",
            isPending && "opacity-60"
          )}
        >
          {/* The repo's own `Table`, not a hand-rolled one: its container is
              what actually clips a wide table to the card. Rolled by hand the
              900px table escaped its `overflow-x-auto` wrapper and gave the
              *page* a horizontal scrollbar at phone width, which the shipped
              Users and Community tables do not — measured against both. */}
          <Table className="min-w-[900px] border-b border-border-subtle">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                {[
                  "Code",
                  "Course",
                  "Discount",
                  "Price",
                  "Redemptions",
                  "Revenue",
                ].map((heading) => (
                  <TableHead
                    key={heading}
                    className="h-[43px] px-5 text-[13px] font-medium text-muted-foreground"
                  >
                    {heading}
                  </TableHead>
                ))}
                <TableHead className="px-5">
                  <span className="sr-only">{couponsCopy.edit}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={7}
                    className="px-5 py-10 text-center text-[14px] text-muted-foreground"
                  >
                    {couponsCopy.noMatches}
                  </TableCell>
                </TableRow>
              ) : (
                page.rows.map((row) => (
                  <CouponTableRow
                    key={row.id}
                    row={row}
                    now={page.generatedAt}
                    onEdit={() => setDialog({ open: true, coupon: row })}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Footer ---------------------------------------------------------- */}
      {page.total > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[13px] text-muted-foreground">
            {couponsCopy.showing(from, to, page.total)}
          </p>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={hrefFor(page.page - 1)}
                  aria-disabled={page.page <= 1}
                  className={cn(
                    "h-9",
                    page.page <= 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
              {Array.from({ length: page.pageCount }, (_, index) => (
                <PaginationItem key={index}>
                  {/* `bg-primary!` is the one case `!` is necessary here:
                      `isActive` makes `PaginationLink` use the outline
                      variant, whose `dark:bg-input/30` is a wrapped selector
                      that outranks a plain override regardless of source
                      order — the dark-mode trap `browse-courses.tsx` and
                      `instructor-courses-section.tsx` both record. */}
                  <PaginationLink
                    href={hrefFor(index + 1)}
                    isActive={index + 1 === page.page}
                    className={cn(
                      "size-9",
                      index + 1 === page.page &&
                        "bg-primary! text-primary-foreground!"
                    )}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href={hrefFor(page.page + 1)}
                  aria-disabled={page.page >= page.pageCount}
                  className={cn(
                    "h-9",
                    page.page >= page.pageCount &&
                      "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}

      <CouponDialog
        open={dialog.open}
        onOpenChange={(next) =>
          setDialog(next ? { open: true, coupon: null } : { open: false })
        }
        courses={page.courses}
        coupon={dialog.open ? dialog.coupon : null}
        revenueShareBps={revenueShareBps}
        pending={saving}
        onSubmit={submit}
      />
    </>
  )
}

function CouponTableRow({
  row,
  now,
  onEdit,
}: {
  row: CouponRow
  now: Date
  onEdit: () => void
}) {
  const schedule = couponSchedule(row.startsAt, row.endsAt, now)
  const fraction = redemptionFraction(row.redemptions, row.redemptionLimit)

  return (
    <TableRow className="h-18 border-border-subtle hover:bg-transparent">
      <TableCell className="px-5">
        <div className="grid gap-1.5">
          <span className="text-[14px] leading-none font-bold tracking-[0.01em]">
            {row.code}
          </span>
          <span
            className={cn(
              "inline-flex h-5 w-fit items-center rounded-full px-2 text-[12px] font-medium",
              couponStatusBadge[row.status]
            )}
          >
            {couponStatusLabel[row.status]}
          </span>
        </div>
      </TableCell>
      <TableCell className="px-5 text-[14px] text-muted-foreground">
        {row.courseTitle}
      </TableCell>
      <TableCell className="px-5 text-[14px] font-semibold tabular-nums">
        {row.percentOff}% off
      </TableCell>
      <TableCell className="px-5 text-[15px] font-semibold tabular-nums">
        {formatMoney(row.priceCents)}
      </TableCell>
      <TableCell className="px-5">
        <div className="grid gap-1.5">
          <div className="flex items-center gap-3">
            <span
              className="h-1.5 w-[196px] shrink-0 overflow-hidden rounded-full bg-track"
              // The bar is plotted truthfully — measured, the export's own
              // fill is 42% against 212/500, so it is not placed by eye the
              // way the Reports chart's bars were.
              role="presentation"
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${fraction * 100}%` }}
              />
            </span>
            <span className="text-[13px] whitespace-nowrap text-muted-foreground tabular-nums">
              {formatRedemptions(row.redemptions, row.redemptionLimit)}
            </span>
          </div>
          {schedule ? (
            <span className="text-[12px] text-muted-foreground">
              {schedule}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="px-5 text-[16px] font-bold tabular-nums">
        {/* An em dash, not "$0" — a coupon nobody has used has earned nothing,
            and a zero reads as a figure somebody computed. The export draws
            exactly this on its scheduled row. */}
        {row.redemptions === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          formatMoney(row.revenueCents)
        )}
      </TableCell>
      <TableCell className="px-5 text-right">
        <Button
          type="button"
          variant="outline"
          onClick={onEdit}
          className="h-[33px] bg-card px-4 text-[14px] shadow-sm"
        >
          {couponsCopy.edit}
        </Button>
      </TableCell>
    </TableRow>
  )
}

export { CouponsBoard }
