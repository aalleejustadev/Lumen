"use client"

import * as React from "react"
import Link from "next/link"
import { HeartIcon, MessageCircleIcon, PinIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import {
  authorRoleBadge,
  discussionsCopy,
  discussionsHref,
  type DiscussionAudience,
} from "@/lib/config/discussions"
import type { DiscussionRow } from "@/lib/discussions"
import { cn } from "@/lib/utils"

/**
 * One thread, from both Discussions exports — they draw the identical card, so
 * this is one component and the audience only decides whether the trailing
 * `⋯` menu is there at all.
 *
 * Measured off the exports at DPR 2: a **148px** card on 22px padding with a
 * 12px gap to the next, a 43px avatar 16px from a 15px/600 name, then the
 * author's role pill, a pin marker and the relative age on that same line; an
 * 18px/700 title, a 15px muted body, and 13px tag chips on `--hover`. The
 * right-hand column stacks the reply count over the like count over the menu,
 * right-aligned.
 *
 * Three things decide what it does:
 *
 *  - **The heart is real and optimistic.** `DiscussionLike` is the truth and
 *    `Discussion.likeCount` its cache, so the button guesses, then settles on
 *    whatever the action reports rather than assuming its guess was right —
 *    the shape `toggleWishlist` set.
 *  - **The reply count is not a button.** There is no thread view yet, so a
 *    control that opened nothing is the promise every unbuilt sidebar row
 *    refuses to make; it renders as the figure it is. Point the card at
 *    `/dashboard/discussions/[id]` when that page lands.
 *  - **"Pinned" appears twice on purpose** — as the marker beside the age and
 *    as the first chip — because the export draws it in both places.
 */

function DiscussionCard({
  audience,
  row,
  canModerate,
  busy,
  onToggleLike,
  onTogglePin,
}: {
  audience: DiscussionAudience
  row: DiscussionRow
  /** Instructor shell only: draws the trailing `⋯` menu. */
  canModerate: boolean
  busy: "like" | "pin" | null
  onToggleLike: () => void
  onTogglePin: () => void
}) {
  const role = authorRoleBadge(row.author.role)
  const chips = [
    ...(row.isPinned ? [discussionsCopy.pinned] : []),
    row.topicName,
    ...row.tags,
  ]

  return (
    <Card className="gap-0 p-5.5 ring-border">
      <div className="flex gap-4">
        {/* Default size with a plain `size-[43px]`: `data-[size=lg]` is an
            attribute selector that beats an unprefixed override regardless of
            source order — the trap `instructor-card.tsx` found. */}
        <Avatar className="size-[43px] shrink-0">
          <AvatarImage src={row.author.image ?? undefined} alt="" />
          <AvatarFallback className="text-[13px]">
            {row.author.initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[15px] font-bold text-foreground">
              {row.author.name}
            </span>
            <span
              className={cn(
                "inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-medium",
                role.className
              )}
            >
              {role.label}
            </span>
            {row.isPinned ? (
              <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
                <PinIcon className="size-3.5" />
                {discussionsCopy.pinned}
              </span>
            ) : null}
            <span className="text-[13px] text-muted-foreground">
              · {row.age}
            </span>
          </div>

          <h2 className="mt-1.5 text-[18px] leading-snug font-bold">
            {/* The title is the way into the thread. The reply count beside it
                deliberately is not a second link to the same place — one
                affordance per destination. */}
            <Link
              href={`${discussionsHref[audience]}/${row.id}`}
              className="text-foreground hover:underline"
            >
              {row.title}
            </Link>
          </h2>
          <p className="mt-2 line-clamp-2 text-[15px] text-muted-foreground">
            {row.body}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map((chip, index) => (
              <span
                key={`${chip}-${index}`}
                className="inline-flex h-[22px] items-center rounded-full bg-hover px-2.5 text-[13px] text-muted-foreground"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Right column — counts over the menu, right-aligned. */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="flex items-center gap-2 text-[14px] text-muted-foreground tabular-nums">
            <MessageCircleIcon className="size-4" />
            {row.replyCount}
          </span>

          <Button
            type="button"
            variant="ghost"
            onClick={onToggleLike}
            disabled={busy === "like"}
            aria-pressed={row.liked}
            aria-label={row.liked ? "Remove like" : "Like this discussion"}
            className="h-auto gap-2 p-0 text-[14px] font-normal text-muted-foreground tabular-nums hover:bg-transparent hover:text-foreground"
          >
            {busy === "like" ? (
              <Spinner className="size-4" />
            ) : (
              <HeartIcon
                className={cn(
                  "size-4",
                  row.liked && "fill-current text-destructive"
                )}
              />
            )}
            {row.likeCount}
          </Button>

          {canModerate ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Discussion actions"
                    className="size-9 rounded-lg bg-card shadow-sm"
                  />
                }
              >
                {busy === "pin" ? <Spinner /> : <span aria-hidden>···</span>}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={onTogglePin}
                  className="cursor-pointer"
                >
                  <PinIcon />
                  {row.isPinned ? "Unpin thread" : "Pin to top"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

export { DiscussionCard }
