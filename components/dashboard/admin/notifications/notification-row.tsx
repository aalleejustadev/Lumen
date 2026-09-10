"use client"

import { MailIcon, MailOpenIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  adminFeedCategory,
  adminFeedCopy,
} from "@/lib/config/admin-notification-feed"
import type { FeedNotification } from "@/lib/admin/notification-feed"
import { cn } from "@/lib/utils"

/**
 * One row of `/dashboard/admin/notifications`, from
 * `ui-design/light/dashboard/instructor/notifications-page.png`.
 *
 * Measured off that export at DPR 2 and verified against the render: rows are
 * **flush and divided by hairlines** (no gap, no card of their own — the list
 * is one card and the rows are its contents, the arrangement
 * `top-courses-card.tsx` uses), 24px of side padding, a **42px** glyph tile
 * 14px from the text, a 15px/700 title over a 15px muted body on a 22px line,
 * and a right-hand cluster of a **22px** category pill and a 13px timestamp.
 * A row with one body line lands on 86px and one with two on 108px, which is
 * `py-5` doing the work rather than a fixed height — the body is the only
 * thing that varies and a fixed height would clip it.
 *
 * Four readings of the export:
 *
 *  - **Unread rows are tinted `--hover`, read rows are white.** Sampled: the
 *    export's tint is #efefec, which is that token exactly, so it follows
 *    dark mode rather than being a literal.
 *  - **The unread dot sits after the title, not before it.** It is a status
 *    marker on the row, so it is `aria-hidden` and the row's accessible name
 *    carries "unread" instead — a bare dot announces nothing.
 *  - **An actor replaces the glyph tile with their avatar.** That is what
 *    `Notification.actorId`'s own schema note describes, and it is how the
 *    export draws its one request row.
 *  - **The right cluster is top-aligned**, not centred: on a two-line row the
 *    export keeps the pill and the time level with the title.
 *
 * The Accept/Decline pair is only drawn while the action is PENDING; once
 * answered the row states the outcome instead. Dismissing the buttons and
 * leaving nothing would lose the decision on reload, which
 * `NotificationAction.state` exists to prevent.
 */
function NotificationRow({
  row,
  busy,
  onOpen,
  onToggleRead,
  onResolve,
  variant = "list",
}: {
  row: FeedNotification
  /**
   * Which of *this row's* controls is mid-flight, or `null`.
   *
   * Deliberately not a shared `pending` boolean: the feed holds one
   * transition for the whole page, so a plain flag here made opening any
   * notification spin the Accept button on every row that had one. The
   * caller narrows it to this row — see `rowBusy` in `notifications-feed.tsx`.
   */
  busy: "open" | "accept" | "decline" | "toggle" | null
  onOpen: (id: string) => void
  /** Flip the row's read state — the control in the trailing cluster. */
  onToggleRead: (id: string, read: boolean) => void
  onResolve: (id: string, accept: boolean) => void
  /** `grid` is the other half of the export's own view switch — see the feed. */
  variant?: "list" | "grid"
}) {
  const category = adminFeedCategory(row.category)
  const Icon = category.icon

  return (
    <div
      className={cn(
        "flex items-start gap-3.5 px-6 py-5 transition-colors",
        row.unread ? "bg-hover" : "bg-card",
        variant === "grid" && "h-full rounded-xl border px-5 py-4.5"
      )}
    >
      {row.actor ? (
        <Avatar className="size-10.5 shrink-0">
          <AvatarImage
            src={row.actor.image ?? undefined}
            alt=""
            referrerPolicy="no-referrer"
          />
          <AvatarFallback className="bg-hover text-xs font-semibold text-foreground">
            {row.actor.initials}
          </AvatarFallback>
        </Avatar>
      ) : (
        <span
          aria-hidden
          className={cn(
            "grid size-10.5 shrink-0 place-items-center rounded-xl",
            category.tile
          )}
        >
          <Icon className="size-5" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        {/* The whole title is the control that opens the row: a notification
            has no detail page yet, so "opening" it means marking it read.
            A real button rather than a click handler on the div, so it is
            reachable by keyboard and announces its own state. */}
        <button
          type="button"
          onClick={() => onOpen(row.id)}
          disabled={busy !== null || !row.unread}
          className="flex max-w-full cursor-pointer items-center gap-2 text-left disabled:cursor-default"
        >
          <span className="truncate text-[15px] leading-[22px] font-bold">
            {row.title}
          </span>
          {row.unread ? (
            <span
              aria-hidden
              className="size-1.75 shrink-0 rounded-full bg-accent-2"
            />
          ) : null}
          <span className="sr-only">
            {row.unread ? " — unread, mark as read" : " — read"}
          </span>
        </button>

        {row.body ? (
          <p className="mt-0.5 text-[15px] leading-[22px] text-muted-foreground">
            {row.body}
          </p>
        ) : null}

        {row.action?.state === "PENDING" ? (
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            {/* Each button spins only for its *own* answer, and the pair is
                disabled together while either is in flight — you cannot
                accept and decline the same request at once. */}
            <Button
              type="button"
              loading={busy === "accept"}
              disabled={busy !== null}
              onClick={() => onResolve(row.id, true)}
              className="h-9 px-5"
            >
              {adminFeedCopy.accept}
            </Button>
            <Button
              type="button"
              variant="outline"
              loading={busy === "decline"}
              disabled={busy !== null}
              onClick={() => onResolve(row.id, false)}
              className="h-9 bg-card px-5 shadow-sm"
            >
              {adminFeedCopy.decline}
            </Button>
          </div>
        ) : row.action ? (
          <p className="mt-2 text-[13px] font-semibold text-muted-foreground">
            {row.action.state === "ACCEPTED"
              ? adminFeedCopy.accepted
              : adminFeedCopy.declined}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          // `pt-0.5` sits the cluster optically level with the title's 22px
          // line rather than with the top of the text block, which is what
          // the export draws.
          "flex shrink-0 items-center gap-4 pt-0.5",
          variant === "grid" && "flex-col items-end gap-1.5"
        )}
      >
        <span
          className={cn(
            "inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium",
            category.pill
          )}
        >
          <span
            aria-hidden
            className={cn("size-1.5 rounded-full", category.dot)}
          />
          {category.label}
        </span>
        <span className="text-[13px] whitespace-nowrap text-muted-foreground">
          {row.age}
        </span>

        {/* Read/unread toggle. **The export draws no such control** — it is
            added at the user's request, and it is the one thing on this page
            that is not in the drawing. It earns its place: a feed whose
            unread count can only ever fall cannot be used as a worklist, and
            marking a row unread to come back to it is what every notification
            client offers. A quiet ghost icon at the trailing edge, so it
            costs the export's layout nothing.

            A native `title` rather than a `Tooltip`: `TooltipProvider` is
            mounted inside the two sidebars and nowhere else, so a Base UI
            tooltip out here in the page content would have no provider above
            it. `settings-nav.tsx` makes the same call for its own hint. The
            `aria-label` is what a screen reader reads; the icon alone does
            not say which way it flips. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          loading={busy === "toggle"}
          disabled={busy !== null}
          title={row.unread ? adminFeedCopy.markRead : adminFeedCopy.markUnread}
          aria-label={
            row.unread ? adminFeedCopy.markRead : adminFeedCopy.markUnread
          }
          // `row.unread`, **not** `!row.unread`. The argument is the state
          // the row should end up in, and an unread row is exactly the one
          // that becomes read — so the current flag already is the target.
          // Negating it (the first cut) inverted the control in both
          // directions, so the label and the action disagreed.
          onClick={() => onToggleRead(row.id, row.unread)}
          className="size-8 shrink-0 text-muted-foreground"
        >
          {row.unread ? (
            <MailOpenIcon className="size-4" />
          ) : (
            <MailIcon className="size-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

export { NotificationRow }
