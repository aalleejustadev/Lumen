"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { Card } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { toast } from "@/components/ui/toast"
import {
  ReportedReviewCard,
  type CardAction,
  type ReportedReviewCardRow,
} from "@/components/dashboard/admin/reviews/reported-review-card"
import {
  hideReportedReview,
  keepReportedReview,
  removeReportedReview,
  suspendReviewer,
} from "@/lib/actions/admin-reviews"
import {
  adminReviewsCopy,
  REPORTED_REVIEWS_PAGE_SIZE,
} from "@/lib/config/admin-reviews"
import { cn } from "@/lib/utils"

const RUN: Record<
  CardAction,
  (reportId: string) => Promise<{
    ok: boolean
    message: string
  }>
> = {
  remove: removeReportedReview,
  keep: keepReportedReview,
  hide: hideReportedReview,
  suspend: suspendReviewer,
}

/**
 * The stack of cards from `reported-reviews__admin.png`, on a **14px** gap
 * even though that export measures 12px between the hairlines: `Card`'s
 * hairline is a `ring`, which paints *outside* the layout box, so it eats 1px
 * off each end of the gap — the arithmetic the wishlist rows document, and
 * verified here against the rendered page.
 *
 * It is one client component because the pending flag belongs to every card at
 * once: one transition covers the list, so the card that was pressed spins and
 * the rest go inert rather than each card holding its own copy of the same
 * state. `busy` is a `{ id, action }` pair rather than a boolean for the
 * reason `courses-list.tsx` gives about its own Approve — a bare `pending`
 * would spin all five buttons on all of them.
 *
 * **The pager is an addition the export does not draw**, and it is drawn only
 * once there is a second page, so the queue as the export shows it looks
 * exactly as drawn. The reason it exists at all is the one
 * `admin-courses.ts` records for its filter row: the export's three cards are
 * today's whole queue, and a moderation queue that could only ever show its
 * first page would quietly hide work. Filters and tabs are *not* added — every
 * card here is an open report, so there is nothing to filter by.
 */
function ReportedReviewsList({
  rows,
  page,
  pageCount,
  total,
}: {
  rows: ReportedReviewCardRow[]
  page: number
  pageCount: number
  total: number
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [saving, startSaving] = React.useTransition()
  const [busy, setBusy] = React.useState<{
    id: string
    action: CardAction
  } | null>(null)

  const hrefFor = React.useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams)
      if (next <= 1) params.delete("page")
      else params.set("page", String(next))
      const search = params.toString()
      return search ? `${pathname}?${search}` : pathname
    },
    [pathname, searchParams]
  )

  function act(id: string, action: CardAction) {
    setBusy({ id, action })
    startSaving(async () => {
      const result = await RUN[action](id)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      setBusy(null)
    })
  }

  if (rows.length === 0) {
    return (
      <Card className="mt-6 items-center gap-3 px-6 py-20 text-center ring-border">
        <p className="text-base font-bold">{adminReviewsCopy.emptyTitle}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {adminReviewsCopy.emptyDescription}
        </p>
      </Card>
    )
  }

  const from = (page - 1) * REPORTED_REVIEWS_PAGE_SIZE + 1

  return (
    <>
      <div className="mt-6 flex flex-col gap-3.5">
        {rows.map((row) => (
          <ReportedReviewCard
            key={row.id}
            row={row}
            busy={busy?.id === row.id ? busy.action : null}
            disabled={saving}
            onAct={(action) => act(row.id, action)}
          />
        ))}
      </div>

      {pageCount > 1 ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[13px] text-muted-foreground">
            {adminReviewsCopy.showing(from, from + rows.length - 1, total)}
          </p>

          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={hrefFor(page - 1)}
                  className={cn(
                    "bg-card",
                    page <= 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
              {Array.from({ length: pageCount }, (_, index) => index + 1)
                .filter(
                  (entry) =>
                    entry === 1 ||
                    entry === pageCount ||
                    Math.abs(entry - page) <= 1
                )
                .flatMap((entry, index, list) =>
                  index > 0 && entry - list[index - 1]! > 1
                    ? [null, entry]
                    : [entry]
                )
                .map((entry, index) =>
                  entry === null ? (
                    <PaginationItem key={`gap-${index}`}>
                      <span className="px-2 text-sm text-muted-foreground">
                        …
                      </span>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={entry}>
                      <PaginationLink
                        href={hrefFor(entry)}
                        isActive={entry === page}
                        // `!` forces these: `isActive` makes `PaginationLink`
                        // use the "outline" Button variant, whose
                        // `dark:bg-input/30` — a `:is(.dark *)`-wrapped
                        // selector — outranks a plain `bg-primary` on
                        // specificity in dark mode regardless of source order.
                        className={cn(
                          entry === page
                            ? "border-transparent! bg-primary! text-primary-foreground! hover:bg-primary/80! hover:text-white!"
                            : "bg-card"
                        )}
                      >
                        {entry}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
              <PaginationItem>
                <PaginationNext
                  href={hrefFor(page + 1)}
                  className={cn(
                    "bg-card",
                    page >= pageCount && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </>
  )
}

export { ReportedReviewsList }
