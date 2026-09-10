"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  CheckIcon,
  LayoutGridIcon,
  ListIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { toast } from "@/components/ui/toast"
import { NotificationRow } from "@/components/dashboard/admin/notifications/notification-row"
import {
  markAllNotificationsRead,
  resolveNotificationAction,
  setNotificationRead,
} from "@/lib/actions/admin-notification-feed"
import {
  ALL_TYPES_ICON,
  adminFeedCategories,
  adminFeedCopy,
  adminFeedStatuses,
} from "@/lib/config/admin-notification-feed"
import type { AdminFeedPage } from "@/lib/admin/notification-feed"
import { cn } from "@/lib/utils"

/**
 * `/dashboard/admin/notifications`, built to
 * `ui-design/light/dashboard/instructor/notifications-page.png`.
 *
 * **The UI is that export, followed as drawn**, at the user's instruction —
 * the title with its unread pill, Mark All as Read beside a gear button, the
 * search field with a status select and a view toggle, the CATEGORIES card,
 * the flush list and the "Showing N of M" footer. Only the *content* is the
 * admin's: the categories are the console's work queues rather than a
 * learner's courses and certificates. See `lib/config/admin-notification-feed.ts`.
 *
 * Measured off that export at DPR 2 and verified against the render: a
 * **1000px content column, centred** (this page is capped rather than
 * full-width, like the settings pages and unlike the rest of the console), a
 * 216px categories card, a 22px gutter and a 762px list card, 40px header
 * buttons, a 48px search row, 40px category rows and flush list rows — see
 * `notification-row.tsx` for those.
 *
 * It is **one client component** because the search, the category card, the
 * status select and the list all share one navigation transition, and because
 * the view toggle is local state the others have to render around. What they
 * do *not* share is a progress flag — see `busy`.
 *
 * **Search, category and status write to the URL; the view toggle does not.**
 * The first three change which rows exist, which happens in SQL, so they have
 * to reach the server — and a narrowed feed then becomes a link you can paste
 * into a thread. The view only changes how the rows you already have are
 * drawn, so it is `useState`. That is exactly the split `users-table.tsx`
 * makes between its filters and its Columns menu.
 *
 * **The grid is the invented half of the export's own switch.** The export
 * draws the button and only ever shows the list, so the other view had to be
 * decided rather than copied; it borrows the row's own content in a bordered
 * card, two up, rather than inventing a second notification language — the
 * position `wishlist-page.tsx` was in with its own view switch.
 */

const CONTROL = "h-12 rounded-xl"

/** Which one control is mid-flight — see `busy` in the component. */
type RowBusy = "open" | "accept" | "decline" | "toggle" | null
type Busy =
  | { kind: "markAll" }
  | { kind: "open" | "accept" | "decline" | "toggle"; id: string }
  | null

function NotificationsFeed({ feed }: { feed: AdminFeedPage }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()
  const [, startSaving] = React.useTransition()
  const [view, setView] = React.useState<"list" | "grid">("list")

  /**
   * *What* is in flight, not merely that something is.
   *
   * A single flag off `useTransition()` was the first cut and was wrong in a
   * way you could see: opening one notification spun the Accept button on
   * every row that had one, because they all read the same boolean. Only the
   * control that was actually pressed should show progress — the rule
   * `courses-list.tsx` spells out and `promotions-board.tsx` follows.
   */
  const [busy, setBusy] = React.useState<Busy>(null)

  // Controlled locally so typing stays instant, with the URL catching up on a
  // debounce. `feed.query.search` wins on mount and whenever a navigation
  // changes it from outside (the back button, a cleared filter), which is
  // what `lastSearch` notices. Adjusting state *during render* is React's own
  // pattern for "a prop changed, reset some state" and the one the hooks lint
  // rule accepts; keying the component would throw focus away mid-typing.
  const [search, setSearch] = React.useState(feed.query.search)
  const [lastSearch, setLastSearch] = React.useState(feed.query.search)
  if (feed.query.search !== lastSearch) {
    setLastSearch(feed.query.search)
    setSearch(feed.query.search)
  }

  const push = React.useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams)
      for (const [key, next] of Object.entries(changes)) {
        if (next === null || next === "") params.delete(key)
        else params.set(key, next)
      }
      // Any filter change invalidates the page number — page 3 of everything
      // is rarely page 3 of one category.
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

  // Debounced, so a five-letter search is one query rather than five. Skipped
  // when the field already agrees with the URL, which stops a redundant
  // navigation firing right after one lands.
  React.useEffect(() => {
    if (search === feed.query.search) return
    const timer = setTimeout(() => push({ q: search || null }), 300)
    return () => clearTimeout(timer)
  }, [search, feed.query.search, push])

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
    action: () => Promise<{ ok: boolean; message: string }>
  ) {
    setBusy(what)
    startSaving(async () => {
      const result = await action()
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      setBusy(null)
    })
  }

  /** Which of this row's own controls, if any, is mid-flight. */
  function rowBusy(id: string): RowBusy {
    return busy && busy.kind !== "markAll" && busy.id === id ? busy.kind : null
  }

  const filtered =
    feed.query.category !== null ||
    feed.query.status !== "all" ||
    feed.query.search !== ""

  const from = (feed.page - 1) * feed.rows.length

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      {/* Header ---------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {/* `font-bold` explicitly: `globals.css` sets every `h1` to 800
                and the dashboard exports draw 700 — the note `CLAUDE.md`
                gives. */}
            <h1 className="text-[32px] leading-none font-bold">
              {adminFeedCopy.title}
            </h1>
            {feed.unread > 0 ? (
              <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-[13px] font-semibold text-primary-foreground">
                {adminFeedCopy.unread(feed.unread)}
              </span>
            ) : null}
          </div>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {adminFeedCopy.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button
            type="button"
            loading={busy?.kind === "markAll"}
            disabled={feed.unread === 0}
            onClick={() => run({ kind: "markAll" }, markAllNotificationsRead)}
            className="h-10 gap-2 px-4"
          >
            <CheckIcon className="size-4" />
            {adminFeedCopy.markAllRead}
          </Button>
          {/* The export's gear. It goes to the admin's own notification
              *preferences* — the only thing a settings affordance on a feed
              can sensibly mean. */}
          <Button
            variant="outline"
            size="icon"
            nativeButton={false}
            aria-label={adminFeedCopy.settings}
            className="size-10 bg-card shadow-sm"
            render={<Link href="/dashboard/admin/settings/notifications" />}
          >
            <SettingsIcon className="size-4.5" />
          </Button>
        </div>
      </div>

      {/* Toolbar --------------------------------------------------------- */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-subtle-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={adminFeedCopy.searchPlaceholder}
            aria-label={adminFeedCopy.searchPlaceholder}
            // This field sits on the page rather than inside a card, so the
            // export fills it white — the reading the audit log's own search
            // settled. The `dark:` twin is spelled out because `Input` carries
            // `dark:bg-input/30`, which a plain override loses to on
            // specificity; repeating the variant is what lets tailwind-merge
            // drop the generated one (`settings-controls.ts` documents it).
            className={cn(
              CONTROL,
              "w-full bg-card pl-11 text-[15px] md:text-[15px] dark:bg-card"
            )}
          />
        </div>

        <NativeSelect
          value={feed.query.status}
          onChange={(event) =>
            push({
              status: event.target.value === "all" ? null : event.target.value,
            })
          }
          aria-label="Filter by read state"
          className={cn(
            "[&_select]:h-12 [&_select]:rounded-xl [&_select]:border-border [&_select]:bg-card! [&_select]:pr-9 [&_select]:pl-4 [&_select]:text-[15px]",
            "[&_[data-slot=native-select-icon]]:right-3.5"
          )}
        >
          {adminFeedStatuses.map((status) => (
            <NativeSelectOption key={status.value} value={status.value}>
              {status.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-pressed={view === "grid"}
          aria-label={
            view === "list" ? adminFeedCopy.gridView : adminFeedCopy.listView
          }
          onClick={() => setView(view === "list" ? "grid" : "list")}
          className={cn(CONTROL, "size-12 bg-card shadow-sm")}
        >
          {view === "list" ? (
            <LayoutGridIcon className="size-4.5" />
          ) : (
            <ListIcon className="size-4.5" />
          )}
        </Button>
      </div>

      {/* Body ------------------------------------------------------------ */}
      <div className="mt-6 grid grid-cols-1 gap-[22px] lg:grid-cols-[216px_minmax(0,1fr)]">
        <Card className="h-fit [--card-spacing:--spacing(2.5)] lg:self-start">
          <div className="flex flex-col gap-1">
            <p className="px-3.5 pt-1 pb-2 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {adminFeedCopy.categoriesHeading}
            </p>

            <CategoryRow
              label={adminFeedCopy.allTypes}
              icon={ALL_TYPES_ICON}
              count={feed.unread}
              active={feed.query.category === null}
              disabled={isPending}
              onSelect={() => push({ cat: null })}
            />
            {adminFeedCategories.map((category) => (
              <CategoryRow
                key={category.value}
                label={category.label}
                icon={category.icon}
                count={
                  feed.counts.find((entry) => entry.value === category.value)
                    ?.count ?? 0
                }
                active={feed.query.category === category.value}
                disabled={isPending}
                onSelect={() => push({ cat: category.value })}
              />
            ))}
          </div>
        </Card>

        <div className="min-w-0">
          {feed.rows.length === 0 ? (
            <Card className="items-center gap-3 px-6 py-20 text-center ring-border">
              <p className="text-base font-bold">
                {filtered
                  ? adminFeedCopy.filteredEmptyTitle
                  : adminFeedCopy.emptyTitle}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {filtered
                  ? adminFeedCopy.filteredEmptyDescription
                  : adminFeedCopy.emptyDescription}
              </p>
            </Card>
          ) : view === "list" ? (
            // One card whose rows are flush and hairline-divided, which is
            // what the export draws — not a stack of cards with gaps.
            <Card className="overflow-hidden [--card-spacing:0px]">
              <div className="divide-y divide-border-subtle">
                {feed.rows.map((row) => (
                  <NotificationRow
                    key={row.id}
                    row={row}
                    busy={rowBusy(row.id)}
                    onOpen={(id) =>
                      run({ kind: "open", id }, () =>
                        setNotificationRead(id, true)
                      )
                    }
                    onToggleRead={(id, read) =>
                      run({ kind: "toggle", id }, () =>
                        setNotificationRead(id, read)
                      )
                    }
                    onResolve={(id, accept) =>
                      run({ kind: accept ? "accept" : "decline", id }, () =>
                        resolveNotificationAction(id, accept)
                      )
                    }
                  />
                ))}
              </div>
            </Card>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {feed.rows.map((row) => (
                <NotificationRow
                  key={row.id}
                  row={row}
                  variant="grid"
                  busy={rowBusy(row.id)}
                  onOpen={(id) =>
                    run({ kind: "open", id }, () =>
                      setNotificationRead(id, true)
                    )
                  }
                  onToggleRead={(id, read) =>
                    run({ kind: "toggle", id }, () =>
                      setNotificationRead(id, read)
                    )
                  }
                  onResolve={(id, accept) =>
                    run({ kind: accept ? "accept" : "decline", id }, () =>
                      resolveNotificationAction(id, accept)
                    )
                  }
                />
              ))}
            </div>
          )}

          {feed.rows.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-[13px] text-muted-foreground">
                {adminFeedCopy.showing(from + feed.rows.length, feed.total)}
              </p>
              {feed.pageCount > 1 ? (
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={hrefFor(feed.page - 1)}
                        className={cn(
                          "bg-card",
                          feed.page <= 1 && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                    {Array.from(
                      { length: feed.pageCount },
                      (_, index) => index + 1
                    ).map((entry) => (
                      <PaginationItem key={entry}>
                        <PaginationLink
                          href={hrefFor(entry)}
                          isActive={entry === feed.page}
                          // `!` forces these: `isActive` uses the outline
                          // Button variant, whose `dark:bg-input/30` outranks
                          // a plain `bg-primary` on specificity in dark mode.
                          className={cn(
                            entry === feed.page
                              ? "border-transparent! bg-primary! text-primary-foreground! hover:bg-primary/80! hover:text-white!"
                              : "bg-card"
                          )}
                        >
                          {entry}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href={hrefFor(feed.page + 1)}
                        className={cn(
                          "bg-card",
                          feed.page >= feed.pageCount &&
                            "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * One row of the CATEGORIES card — 40px, the settings nav's own height, with
 * the export's dark count badge at the trailing edge.
 *
 * The active row is tinted **and carries a 2px `--foreground` left edge**,
 * which is the one thing this card does that `settings-nav.tsx`' does not;
 * measured off the export, where the stroke follows the row's own radius.
 * A row with nothing unread draws no badge at all, exactly as the export's
 * Billing row does — a "0" beside a category is noise.
 */
function CategoryRow({
  label,
  icon: Icon,
  count,
  active,
  disabled,
  onSelect,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  count: number
  active: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex h-10 w-full cursor-pointer items-center gap-3 border-l-2 px-3 text-left text-sm font-medium transition-colors",
        active ? "bg-hover" : "border-transparent hover:bg-hover"
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{label}</span>
      {count > 0 ? (
        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground tabular-nums">
          {count}
        </span>
      ) : null}
    </button>
  )
}

export { NotificationsFeed }
