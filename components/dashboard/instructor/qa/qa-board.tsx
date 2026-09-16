"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { MessageCircleQuestionMarkIcon } from "lucide-react"

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "@/components/ui/toast"
import { CourseFilter } from "@/components/dashboard/instructor/course-filter"
import { QuestionCard } from "@/components/dashboard/instructor/qa/question-card"
import { toggleQuestionVote } from "@/lib/actions/qa"
import {
  QUESTIONS_PAGE_SIZE,
  qaCopy,
  qaTabs,
  type QaTab,
} from "@/lib/config/qa"
import type { QuestionsPage } from "@/lib/qa"
import { cn } from "@/lib/utils"

/**
 * `/dashboard/instructor/qa`, from
 * `ui-design/light/dashboard/instructor/Q&A-page.png` — the title with its
 * lead and the course filter, a three-segment switch, the question cards, and
 * the footer.
 *
 * Measured at DPR 2: the shell's usual page inset, a **42px** segmented track
 * (`--track`, `p-1`, the dark pill inside) opposite a 44px course filter, then
 * 125px cards on a 12px gap, and "Showing 1–3 of 5 questions" beside the
 * pager.
 *
 * **The tabs and the course filter write to the URL; nothing else does.** Both
 * change which rows exist, which happens in SQL, so a narrowed list is a link
 * you can paste — the split `users-table.tsx` makes between its filters and
 * its Columns menu.
 *
 * Progress is tracked **per control**: `busy` is the id of the one vote in
 * flight, so voting on one question does not spin every other arrow. The rule
 * `courses-list.tsx` states.
 */
function QaBoard({ page }: { page: QuestionsPage }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()
  const [, startSaving] = React.useTransition()
  const [busy, setBusy] = React.useState<string | null>(null)

  /** Votes moved since this render; dropped when fresh rows arrive. */
  const [optimistic, setOptimistic] = React.useState<Record<string, boolean>>(
    {}
  )
  const rowKey = page.rows
    .map((row) => `${row.id}:${row.voted}:${row.voteCount}`)
    .join(",")
  const [lastRowKey, setLastRowKey] = React.useState(rowKey)
  if (rowKey !== lastRowKey) {
    setLastRowKey(rowKey)
    setOptimistic({})
  }

  const push = React.useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams)
      for (const [key, next] of Object.entries(changes)) {
        if (next === null || next === "") params.delete(key)
        else params.set(key, next)
      }
      // Any filter change invalidates the page number.
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

  function vote(id: string, voted: boolean) {
    setOptimistic((current) => ({ ...current, [id]: !voted }))
    setBusy(id)
    startSaving(async () => {
      const result = await toggleQuestionVote(id)
      if (!result.ok) toast.add({ title: result.message, type: "error" })
      setBusy(null)
    })
  }

  const from = page.total === 0 ? 0 : (page.page - 1) * QUESTIONS_PAGE_SIZE + 1
  const to = from === 0 ? 0 : from + page.rows.length - 1
  const filtered = page.query.tab !== "all" || page.query.courseId !== null

  return (
    <>
      {/* Header ---------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* `font-bold` explicitly: `globals.css` sets every `h1` to 800 and
              the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
          <h1 className="text-[32px] leading-none font-bold">{qaCopy.title}</h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {qaCopy.description}
          </p>
        </div>

        <CourseFilter
          courses={page.courses}
          value={page.query.courseId}
          onValueChange={(courseId) => push({ course: courseId })}
          label={qaCopy.allCourses}
          className="h-11 w-[190px] shrink-0 data-[size=default]:h-11"
        />
      </div>

      {/* Tabs ------------------------------------------------------------ */}
      {/* `aria-pressed:hover:` rather than a plain `hover:`: both are single
          attribute selectors, so Tailwind's variant order — not source order —
          would decide which wins. The note
          `enrolled-courses-section.tsx` records. */}
      <ToggleGroup
        value={[page.query.tab]}
        onValueChange={(next: string[]) => {
          const chosen = next[0] as QaTab | undefined
          if (!chosen || chosen === page.query.tab) return
          push({ tab: chosen === "all" ? null : chosen })
        }}
        aria-label="Filter questions"
        className="mt-6 h-[42px] w-fit gap-0 rounded-lg bg-track p-1"
      >
        {qaTabs.map((tab) => (
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

      {/* List ------------------------------------------------------------ */}
      {page.total === 0 ? (
        <Empty className="mt-4 rounded-xl border border-border bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageCircleQuestionMarkIcon />
            </EmptyMedia>
            <EmptyTitle>
              {filtered ? qaCopy.noMatches : qaCopy.empty.title}
            </EmptyTitle>
            {filtered ? null : (
              <EmptyDescription>{qaCopy.empty.description}</EmptyDescription>
            )}
          </EmptyHeader>
        </Empty>
      ) : (
        <div
          className={cn("mt-4 flex flex-col gap-3", isPending && "opacity-60")}
        >
          {page.rows.map((row) => {
            const voted = optimistic[row.id] ?? row.voted
            const drift =
              optimistic[row.id] === undefined
                ? 0
                : optimistic[row.id]
                  ? row.voted
                    ? 0
                    : 1
                  : row.voted
                    ? -1
                    : 0
            return (
              <QuestionCard
                key={row.id}
                row={{
                  ...row,
                  voted,
                  voteCount: Math.max(0, row.voteCount + drift),
                }}
                voting={busy === row.id}
                onVote={() => vote(row.id, voted)}
              />
            )
          })}
        </div>
      )}

      {/* Footer ---------------------------------------------------------- */}
      {page.total > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[13px] text-muted-foreground">
            {qaCopy.showing(from, to, page.total)}
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
              {Array.from({ length: Math.min(page.pageCount, 6) }, (_, i) => (
                <PaginationItem key={i}>
                  {/* `bg-primary!` is the one case `!` is necessary here:
                      `isActive` makes `PaginationLink` use the outline
                      variant, whose `dark:bg-input/30` is a wrapped selector
                      that outranks a plain override regardless of source
                      order — the trap `browse-courses.tsx` records. */}
                  <PaginationLink
                    href={hrefFor(i + 1)}
                    isActive={i + 1 === page.page}
                    className={cn(
                      "size-9",
                      i + 1 === page.page &&
                        "bg-primary! text-primary-foreground!"
                    )}
                  >
                    {i + 1}
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
    </>
  )
}

export { QaBoard }
