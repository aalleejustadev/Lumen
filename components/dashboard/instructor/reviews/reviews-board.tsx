"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { StarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CourseFilter } from "@/components/dashboard/instructor/course-filter"
import { ReplyDialog } from "@/components/dashboard/instructor/reviews/reply-dialog"
import { ReportReviewDialog } from "@/components/dashboard/instructor/reviews/report-review-dialog"
import { ReviewCard } from "@/components/dashboard/instructor/reviews/review-card"
import { replyToReview, reportReview } from "@/lib/actions/instructor-reviews"
import {
  isReviewsFiltered,
  REVIEWS_PAGE_SIZE,
  reviewsCopy,
  reviewsTabs,
  type ReviewsTab,
} from "@/lib/config/instructor-reviews"
import type { ReviewsPage } from "@/lib/instructor-reviews"
import { cn } from "@/lib/utils"

/** Every control on the filter row, measured off the export at 42px — the
 *  instructor shell's own vocabulary, set by `coupons-page__main.png`. */
const CONTROL = "h-[42px]"

/**
 * The filter row, the review list and the footer of
 * `ui-design/light/dashboard/instructor/reviews-page.png` — everything below
 * the two summary cards, which stay on the server.
 *
 * Measured off that export at DPR 2: a **42px** segmented track (`--track`,
 * `p-1`, 34px items) opposite a 42px course filter and a 68 x 42 **Reset**
 * 10px past it, then cards on a **16px** gap, and "Showing 1–4 of 9 reviews"
 * beside the pager.
 *
 * Four things about it are decisions rather than markup:
 *
 *  - **The tabs, the course filter and the page live in the URL; nothing else
 *    does.** All three change which rows exist, which happens in SQL — the
 *    split `users-table.tsx` makes between its filters and its Columns menu —
 *    and it buys the three things `audit-log-browser.tsx` records: a narrowed
 *    view is a link you can paste, the back button walks the filters, and a
 *    reload keeps them.
 *  - **Reset is drawn always and inert when nothing is filtered.** The export
 *    draws it beside "All ratings" and "All courses", i.e. in exactly the
 *    state where it has nothing to do, so hiding it would contradict the one
 *    frame there is; a button that silently did nothing is what this codebase
 *    refuses everywhere else. It says why on itself instead — the treatment
 *    `user-row-actions.tsx` gives a control with nowhere to go.
 *  - **Progress is tracked per control**, not per page: `busy` is a
 *    `{ kind, id }` descriptor rather than one bare `useTransition()` flag, so
 *    replying to one review does not spin every other card's Report. The rule
 *    `courses-list.tsx` states and `promotions-board.tsx` follows — and the
 *    mistake most likely to survive a typecheck, a lint and a build, since
 *    none of them can see it.
 *  - **One dialog instance each, not one per card.** Which review it is
 *    editing is state, the arrangement `curriculum-board.tsx`' delete dialog
 *    uses; four mounted textareas would be four pieces of state to keep clear.
 *  - **Both writes call `router.refresh()` as well as revalidating.** The
 *    actions name `/dashboard/instructor` as a *layout*, which is what moves
 *    the manage page's Reviews badge — but it does not re-render *this* page
 *    in place, so without the refresh a posted reply left the card still
 *    offering **Reply** until the next navigation. Verified in the browser
 *    before and after; it is the same fix `publish-toggle.tsx` and the
 *    editor's Coupons step both record for this route group, and it is
 *    invisible to a typecheck, a lint and a build.
 */
function ReviewsBoard({ page }: { page: ReviewsPage }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isPending, startTransition] = React.useTransition()
  const [working, startWorking] = React.useTransition()
  const [busy, setBusy] = React.useState<{
    kind: "reply" | "report"
    id: string
  } | null>(null)
  const [replyTo, setReplyTo] = React.useState<string | null>(null)
  const [reportOf, setReportOf] = React.useState<string | null>(null)

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

  const replyRow = page.rows.find((row) => row.id === replyTo) ?? null

  function submitReply(body: string) {
    if (!replyTo) return
    const id = replyTo
    setBusy({ kind: "reply", id })
    startWorking(async () => {
      const result = await replyToReview(id, body)
      setBusy(null)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (!result.ok) return
      setReplyTo(null)
      router.refresh()
    })
  }

  function submitReport({ reason, note }: { reason: string; note: string }) {
    if (!reportOf) return
    const id = reportOf
    setBusy({ kind: "report", id })
    startWorking(async () => {
      const result = await reportReview(id, reason, note)
      setBusy(null)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (!result.ok) return
      setReportOf(null)
      router.refresh()
    })
  }

  // Off the **page size**, not `rows.length`: the last page is short, so
  // multiplying by what it happens to hold made page 2 of 8 read "4–6".
  const from = page.total === 0 ? 0 : (page.page - 1) * REVIEWS_PAGE_SIZE + 1
  const to = from === 0 ? 0 : from + page.rows.length - 1
  const filtered = isReviewsFiltered(page.query)

  return (
    <>
      {/* Filter row -------------------------------------------------------- */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {/* `aria-pressed:hover:` rather than a plain `hover:`: both are single
            attribute selectors, so Tailwind's variant order — not source
            order — would decide which wins and could wash the dark pill out.
            The note `enrolled-courses-section.tsx` records. */}
        <ToggleGroup
          value={[page.query.tab]}
          onValueChange={(next: string[]) => {
            const chosen = next[0] as ReviewsTab | undefined
            if (!chosen || chosen === page.query.tab) return
            push({ tab: chosen === "all" ? null : chosen })
          }}
          aria-label="Filter reviews by rating"
          className={cn(CONTROL, "gap-0 rounded-lg bg-track p-1")}
        >
          {reviewsTabs.map((tab) => (
            <ToggleGroupItem
              key={tab.value}
              value={tab.value}
              size="lg"
              className="gap-1.5 rounded-md px-4 text-muted-foreground aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
            >
              {tab.label}
              {/* `fill-current` rather than `fill-star`: the glyph is grey in
                  an unselected pill and white in the dark one, which is what
                  the export draws — so it follows the pill's own ink instead
                  of carrying a colour of its own. */}
              {tab.star ? <StarIcon className="size-3 fill-current" /> : null}
              {tab.after}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <CourseFilter
            courses={page.courses}
            value={page.query.courseId}
            onValueChange={(courseId) => push({ course: courseId })}
            label={reviewsCopy.allCourses}
            className={cn(CONTROL, "w-[146px] data-[size=default]:h-[42px]")}
          />
          <Button
            type="button"
            disabled={!filtered}
            title={filtered ? undefined : reviewsCopy.resetUnavailable}
            onClick={() => push({ tab: null, course: null })}
            className={cn(CONTROL, "px-5")}
          >
            {reviewsCopy.reset}
          </Button>
        </div>
      </div>

      {/* List -------------------------------------------------------------- */}
      {page.total === 0 ? (
        <Empty className="mt-4 rounded-xl bg-card py-16 ring-1 ring-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StarIcon />
            </EmptyMedia>
            <EmptyTitle>
              {filtered ? reviewsCopy.noMatches : reviewsCopy.empty.title}
            </EmptyTitle>
            {filtered ? null : (
              <EmptyDescription>
                {reviewsCopy.empty.description}
              </EmptyDescription>
            )}
          </EmptyHeader>
        </Empty>
      ) : (
        <div
          className={cn("mt-4 flex flex-col gap-4", isPending && "opacity-60")}
        >
          {page.rows.map((row) => (
            <ReviewCard
              key={row.id}
              row={row}
              busy={working && busy?.id === row.id ? busy.kind : null}
              onReply={() => setReplyTo(row.id)}
              onReport={() => setReportOf(row.id)}
            />
          ))}
        </div>
      )}

      {/* Footer ------------------------------------------------------------ */}
      {page.total > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[13px] text-muted-foreground">
            {reviewsCopy.showing(from, to, page.total)}
          </p>
          {page.pageCount > 1 ? (
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent className="gap-2">
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
                {Array.from(
                  { length: Math.min(page.pageCount, 6) },
                  (_, index) => (
                    <PaginationItem key={index}>
                      {/* `bg-primary!` is the one case `!` is necessary here:
                          `isActive` makes `PaginationLink` use the outline
                          variant, whose `dark:bg-input/30` is a wrapped
                          selector that outranks a plain override regardless of
                          source order — the dark-mode trap
                          `browse-courses.tsx` records. */}
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
                  )
                )}
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
          ) : null}
        </div>
      ) : null}

      <ReplyDialog
        open={replyTo !== null}
        onOpenChange={(next) => {
          if (!next) setReplyTo(null)
        }}
        authorName={replyRow?.authorName ?? ""}
        pending={working && busy?.kind === "reply"}
        onSubmit={submitReply}
      />

      <ReportReviewDialog
        open={reportOf !== null}
        onOpenChange={(next) => {
          if (!next) setReportOf(null)
        }}
        pending={working && busy?.kind === "report"}
        onSubmit={submitReport}
      />
    </>
  )
}

export { ReviewsBoard }
