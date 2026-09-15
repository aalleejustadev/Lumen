"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { InfoIcon, MegaphoneIcon, PlusIcon } from "lucide-react"

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "@/components/ui/toast"
import { DiscussionCard } from "@/components/dashboard/discussions/discussion-card"
import { ModerationBanner } from "@/components/dashboard/discussions/moderation-banner"
import { NewDiscussionDialog } from "@/components/dashboard/discussions/new-discussion-dialog"
import {
  createDiscussion,
  setDiscussionPinned,
  toggleDiscussionLike,
  type NewDiscussionInput,
} from "@/lib/actions/discussions"
import {
  DISCUSSIONS_PAGE_SIZE,
  discussionScopes,
  discussionsCopy,
  discussionsLead,
  emptyDiscussions,
  reportedScope,
  instructorActions,
  learnerNote,
  type DiscussionAudience,
  type DiscussionScope,
} from "@/lib/config/discussions"
import type { DiscussionsPage } from "@/lib/discussions"
import { cn } from "@/lib/utils"

/**
 * The Discussions surface, shared by **both** modes — the learner's
 * `/dashboard/discussions` and the instructor's
 * `/dashboard/instructor/discussions` are this component with a different
 * `audience`, the arrangement the notification feed and the inbox already
 * have. Built to the two `discussions-page.png` exports, which draw the same
 * feed and differ only in what you may do with it.
 *
 * Measured off them at DPR 2: the shells' usual page inset, a four-up 72px
 * stat row on a 14px gap (instructor only), a 68.5px moderation strip, a row
 * of 34.5px rounded-full topic pills opposite a 37px All/Mine/Unanswered
 * switch, then 148px cards on a 12px gap, and the footer's
 * "Showing 1–5 of 10 discussions" beside the pager.
 *
 * It is one client component because the header's two buttons open the dialog
 * that the topic pills, the switch and every row's menu render around — and
 * because the pills and the switch write to the URL. The stat row is a Server
 * Component passed in as `children`, so its markup and icons stay off the
 * bundle.
 *
 * Four things decide how it behaves:
 *
 *  - **The pills and the switch write to the URL; nothing else does.** Both
 *    change which rows exist, which happens in SQL, so a narrowed feed is a
 *    link you can paste and the back button walks it — the split
 *    `users-table.tsx` makes between its filters and its Columns menu.
 *  - **The learner gets no switch.** All / Mine / Unanswered is about threads
 *    you are answering; the learner export draws a note in that corner
 *    instead, saying replies are their half of it.
 *  - **Progress is tracked per control** — `busy` is a `{ kind, id }`
 *    descriptor, so liking one thread does not spin every other row's heart.
 *    The rule `courses-list.tsx` states and `promotions-board.tsx` follows.
 *  - **The heart is optimistic and settles on the server's answer**, rather
 *    than assuming its guess was right — the shape `toggleWishlist` set.
 */

type Busy = { kind: "like" | "pin"; id: string } | { kind: "post" } | null

function DiscussionsBoard({
  audience,
  page,
  children,
}: {
  audience: DiscussionAudience
  page: DiscussionsPage
  /** The instructor's four stat cards, rendered on the server. */
  children?: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()
  const [, startSaving] = React.useTransition()
  const [busy, setBusy] = React.useState<Busy>(null)
  const [dialog, setDialog] = React.useState<
    { open: false } | { open: true; announce: boolean }
  >({ open: false })

  const instructor = audience === "INSTRUCTOR"

  /**
   * Hearts the reader has moved since this render — the row's own `liked` and
   * `likeCount` are the server's, so an optimistic click is held here and
   * dropped the moment fresh rows arrive.
   */
  const [optimistic, setOptimistic] = React.useState<Record<string, boolean>>(
    {}
  )
  const rowKey = page.rows.map((row) => `${row.id}:${row.liked}`).join(",")
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
      // Any filter change invalidates the page number — page 2 of one topic is
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

  function run(
    what: NonNullable<Busy>,
    action: () => Promise<{ ok: boolean; message: string }>,
    quiet = false
  ) {
    setBusy(what)
    startSaving(async () => {
      const result = await action()
      if (!result.ok || !quiet) {
        toast.add({
          title: result.message,
          type: result.ok ? "success" : "error",
        })
      }
      setBusy(null)
      if (result.ok && what.kind === "post") setDialog({ open: false })
    })
  }

  function like(id: string, liked: boolean) {
    setOptimistic((current) => ({ ...current, [id]: !liked }))
    run({ kind: "like", id }, () => toggleDiscussionLike(audience, id), true)
  }

  function post(input: NewDiscussionInput) {
    run({ kind: "post" }, () => createDiscussion(audience, input))
  }

  const from =
    page.total === 0 ? 0 : (page.page - 1) * DISCUSSIONS_PAGE_SIZE + 1
  const to = from === 0 ? 0 : from + page.rows.length - 1
  const filtered = page.query.topic !== null || page.query.scope !== "all"
  const empty = emptyDiscussions[audience]

  return (
    <>
      {/* Header ---------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* `font-bold` explicitly: `globals.css` sets every `h1` to 800 and
              the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
          <h1 className="text-[32px] leading-none font-bold">
            {discussionsCopy.title}
          </h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {discussionsLead[audience]}
          </p>
        </div>

        {instructor ? (
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialog({ open: true, announce: true })}
              className="h-10 gap-2 bg-card px-4 shadow-sm"
            >
              <MegaphoneIcon className="size-4" />
              {instructorActions.announce}
            </Button>
            <Button
              type="button"
              onClick={() => setDialog({ open: true, announce: false })}
              className="h-10 gap-2 px-4"
            >
              <PlusIcon className="size-4" />
              {instructorActions.newDiscussion}
            </Button>
          </div>
        ) : (
          /* The learner export's note, where the instructor has two buttons. */
          <p className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-[14px] text-muted-foreground shadow-sm">
            <InfoIcon className="size-4" />
            {learnerNote}
          </p>
        )}
      </div>

      {instructor && children ? (
        <div className="mt-6 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {children}
        </div>
      ) : null}

      {/* Only when there is something in it — see `ModerationBanner`. */}
      {instructor && page.stats && page.stats.needsModeration > 0 ? (
        <ModerationBanner
          count={page.stats.needsModeration}
          onReview={() => push({ scope: "reported" })}
        />
      ) : null}

      {/* Filters --------------------------------------------------------- */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <TopicPill
            active={page.query.topic === null}
            onClick={() => push({ topic: null })}
          >
            {discussionsCopy.allTopics}
          </TopicPill>
          {/* Empty topics are dropped: a pill that can only ever return
              nothing is the dead affordance every unbuilt sidebar row refuses.
              The one currently selected stays, so a link to it still reads
              back the filter it applied. The dialog keeps the full list. */}
          {page.topics
            .filter(
              (topic) =>
                topic.threadCount > 0 || page.query.topic === topic.slug
            )
            .map((topic) => (
              <TopicPill
                key={topic.id}
                active={page.query.topic === topic.slug}
                onClick={() => push({ topic: topic.slug })}
              >
                {topic.name}
              </TopicPill>
            ))}
        </div>

        {instructor ? (
          <div className="ml-auto">
            {/* `aria-pressed:hover:` rather than a plain `hover:`: both are
                single attribute selectors, so Tailwind's variant order — not
                source order — would decide which wins. The note
                `enrolled-courses-section.tsx` records. */}
            <ToggleGroup
              value={[page.query.scope]}
              onValueChange={(next: string[]) => {
                const chosen = next[0] as DiscussionScope | undefined
                if (!chosen || chosen === page.query.scope) return
                push({ scope: chosen === "all" ? null : chosen })
              }}
              aria-label="Filter discussions"
              className="h-[37px] gap-0 rounded-lg bg-track p-1"
            >
              {[
                ...discussionScopes,
                // The export draws three. The fourth is added only when there
                // is something reported, or when it is the filter currently
                // applied — otherwise the switch is exactly as drawn. See
                // `reportedScope`.
                ...((page.stats && page.stats.needsModeration > 0) ||
                page.query.scope === "reported"
                  ? [reportedScope]
                  : []),
              ].map((scope) => (
                <ToggleGroupItem
                  key={scope.value}
                  value={scope.value}
                  className="rounded-md px-3.5 text-[14px] text-muted-foreground aria-pressed:bg-card aria-pressed:font-semibold aria-pressed:text-foreground aria-pressed:shadow-sm aria-pressed:hover:bg-card"
                >
                  {scope.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        ) : null}
      </div>

      {/* List ------------------------------------------------------------ */}
      {page.total === 0 ? (
        <Empty className="mt-4 rounded-xl border border-border bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InfoIcon />
            </EmptyMedia>
            <EmptyTitle>
              {filtered ? discussionsCopy.noMatches : empty.title}
            </EmptyTitle>
            {filtered ? null : (
              <EmptyDescription>{empty.description}</EmptyDescription>
            )}
          </EmptyHeader>
        </Empty>
      ) : (
        <div
          className={cn("mt-4 flex flex-col gap-3", isPending && "opacity-60")}
        >
          {page.rows.map((row) => {
            const liked = optimistic[row.id] ?? row.liked
            const drift =
              optimistic[row.id] === undefined
                ? 0
                : optimistic[row.id]
                  ? row.liked
                    ? 0
                    : 1
                  : row.liked
                    ? -1
                    : 0
            return (
              <DiscussionCard
                key={row.id}
                audience={audience}
                row={{
                  ...row,
                  liked,
                  likeCount: Math.max(0, row.likeCount + drift),
                }}
                canModerate={instructor && page.canModerate}
                busy={
                  busy && busy.kind !== "post" && busy.id === row.id
                    ? busy.kind
                    : null
                }
                onToggleLike={() => like(row.id, liked)}
                onTogglePin={() =>
                  run({ kind: "pin", id: row.id }, () =>
                    setDiscussionPinned(audience, row.id, !row.isPinned)
                  )
                }
              />
            )
          })}
        </div>
      )}

      {/* Footer ---------------------------------------------------------- */}
      {page.total > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[13px] text-muted-foreground">
            {discussionsCopy.showing(from, to, page.total)}
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
                      order — the dark-mode trap `browse-courses.tsx` records. */}
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

      {instructor ? (
        <NewDiscussionDialog
          open={dialog.open}
          onOpenChange={(next) =>
            setDialog(next ? { open: true, announce: false } : { open: false })
          }
          topics={page.topics}
          announce={dialog.open ? dialog.announce : false}
          pending={busy?.kind === "post"}
          onSubmit={post}
        />
      ) : null}
    </>
  )
}

/** The export's rounded-full topic chips: 34.5px, white on a `--border`
 *  hairline, and the selected one solid `--primary`. */
function TopicPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-[35px] cursor-pointer items-center rounded-full px-4 text-[14px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-foreground hover:bg-hover"
      )}
    >
      {children}
    </button>
  )
}

export { DiscussionsBoard }
