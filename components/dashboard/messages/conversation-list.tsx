"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon } from "lucide-react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { messagesCopy } from "@/lib/config/messages"
import type { ConversationSummary } from "@/lib/messages"
import { cn } from "@/lib/utils"

/**
 * The left column of both Messages exports — the search band over the
 * conversation rows.
 *
 * Measured off `ui-design/light/dashboard/instructor/messages-page.png` at
 * DPR 2, and identical in the learner's: a **320px** column against the card's
 * own hairline, a **72px** search band on 16px sides closed by a `--border`
 * rule, then **72px** rows divided by `--border-subtle` — including one below
 * the last row, which is drawn. A row is a 44px avatar, a 12px gap, a 15px
 * name over a 14px muted preview, and a right-hand stack of a 12px age on the
 * name's line and a 20px unread pill on the preview's.
 *
 * **The selected row is `--hover`**, sampled exactly off the learner export
 * (#efefec), so it follows dark mode rather than carrying the literal fill.
 *
 * The search writes to the URL and the rows are links, for the reason
 * `notifications-feed.tsx` gives about its own filters: both change *which
 * rows exist*, which happens in SQL, so they have to reach the server — and an
 * open thread then becomes a link you can paste into a ticket. Only the field's
 * own text is local, so typing stays instant while the URL catches up on a
 * debounce.
 */

function ConversationList({
  conversations,
  activeId,
  search,
}: {
  conversations: ConversationSummary[]
  activeId: string | null
  search: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = React.useTransition()

  // Adjusting state *during render* when the URL changes from outside (the
  // back button, a cleared search) — React's own pattern for "a prop changed,
  // reset some state" and the one the hooks lint rule accepts. Keying the
  // component would throw focus away mid-typing.
  const [value, setValue] = React.useState(search)
  const [lastSearch, setLastSearch] = React.useState(search)
  if (search !== lastSearch) {
    setLastSearch(search)
    setValue(search)
  }

  React.useEffect(() => {
    if (value === search) return
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      if (value) params.set("q", value)
      else params.delete("q")
      // The open thread rarely survives a narrowed list, and the read falls
      // back to the newest match anyway — so the selection is dropped rather
      // than left pointing at a row the search just hid.
      params.delete("c")
      const query = params.toString()
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        })
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [value, search, pathname, router, searchParams])

  function hrefFor(id: string) {
    const params = new URLSearchParams(searchParams)
    params.set("c", id)
    return `${pathname}?${params.toString()}`
  }

  return (
    <div className="flex h-[220px] w-full shrink-0 flex-col border-b border-border md:h-auto md:min-h-0 md:w-80 md:border-r md:border-b-0">
      {/* Search band — 72px, 16px sides, closed by a --border rule. */}
      <div className="flex h-18 shrink-0 items-center border-b border-border px-4">
        <div className="relative w-full">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle-foreground" />
          <Input
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={messagesCopy.searchPlaceholder}
            aria-label={messagesCopy.searchPlaceholder}
            // `dark:bg-background` and `md:text-[14px]` repeat variants `Input`
            // already carries (`dark:bg-input/30`, `md:text-sm`): a plain
            // override loses to a wrapped selector on specificity, and
            // repeating the variant is what lets tailwind-merge drop the
            // generated class. The trap `settings-controls.ts` records.
            className="h-10 rounded-lg bg-background pl-10 text-[14px] md:text-[14px] dark:bg-background"
          />
        </div>
      </div>

      {/* Rows ------------------------------------------------------------ */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-4 py-6 text-[14px] text-muted-foreground">
            {messagesCopy.noMatches}
          </p>
        ) : (
          conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={hrefFor(conversation.id)}
              scroll={false}
              aria-current={conversation.id === activeId ? "true" : undefined}
              className={cn(
                "flex h-18 items-center gap-3 border-b border-border-subtle px-4 transition-colors",
                conversation.id === activeId ? "bg-hover" : "hover:bg-hover/60"
              )}
            >
              {/* Default size with a plain `size-11`: `data-[size=lg]` is an
                  attribute selector that beats an unprefixed override
                  regardless of source order — the trap `instructor-card.tsx`
                  found. */}
              <Avatar className="size-11">
                <AvatarImage
                  src={conversation.counterpart.image ?? undefined}
                  alt=""
                />
                <AvatarFallback className="text-[13px]">
                  {conversation.counterpart.initials}
                </AvatarFallback>
                {conversation.counterpart.online ? (
                  <AvatarBadge
                    title={messagesCopy.presence}
                    className="bg-success ring-card group-data-[size=default]/avatar:size-2"
                  />
                ) : null}
              </Avatar>

              {/* `min-w-0` on the wrapper *and* on each row: a grid item's
                  default `min-width: auto` sizes it to its content, so
                  without the inner one a long preview refuses to truncate and
                  pushes the age and the unread pill out of the column. */}
              <div className="grid min-w-0 flex-1 gap-0.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
                    {conversation.counterpart.name}
                  </span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">
                    {conversation.age}
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-[14px] text-muted-foreground">
                    {conversation.preview}
                  </span>
                  {conversation.unread > 0 ? (
                    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                      {conversation.unread > 9 ? "9+" : conversation.unread}
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="sr-only">
                {conversation.courseTitle ?? ""}
                {conversation.unread > 0
                  ? ` · ${conversation.unread} unread`
                  : ""}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export { ConversationList }
