"use client"

import * as React from "react"
import Link from "next/link"
import { HeartIcon, LayoutGridIcon, Rows3Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
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
import { AddAllToCartButton } from "@/components/dashboard/wishlist/wishlist-actions"
import type { WishlistEntry } from "@/components/dashboard/wishlist/wishlist-course"
import { WishlistRow } from "@/components/dashboard/wishlist/wishlist-row"
import { WishlistTile } from "@/components/dashboard/wishlist/wishlist-tile"
import { cn } from "@/lib/utils"

/**
 * The two layouts behind the header's switch. The export draws the list one
 * selected, so that's the default; `perPage` differs because "4 per page" is
 * the export's own list rhythm and would leave the 4-column grid showing a
 * single row before a page break.
 */
const wishlistViews = [
  { value: "list", label: "List view", icon: Rows3Icon, perPage: 4 },
  { value: "grid", label: "Grid view", icon: LayoutGridIcon, perPage: 8 },
] as const

type WishlistView = (typeof wishlistViews)[number]["value"]

/**
 * `/dashboard/wishlist`, from
 * `ui-design/light/dashboard/student/wishlist-page.png`. Measured off that
 * export at DPR 2: a full-width content column (no 920px cart-style centring),
 * a 26px/700 title over a 15px lead, 124px rows with 14px between their
 * visible edges, and a 44px view switch beside the 40px "Add all to cart" on
 * the same line as the heading. The rows are stacked on a 16px flex `gap`
 * rather than 14px: `Card`'s hairline is a `ring`, which paints outside the
 * layout box, so a 14px gap would read as 12px between the two hairlines.
 *
 * `"use client"` for the whole page rather than a server composer with a
 * client island, because the view switch sits *in* the header row next to the
 * heading — the same reason `browse-courses.tsx` is client all the way up.
 * That's what `wishlist-course.ts` is for: the rows are fed from the database
 * by the route, and `BrowseCourse.icon` is a function value that can't cross
 * the boundary, so it's stripped there and looked back up by category here.
 *
 * The export only draws a filled list; empty falls back to `Empty`, and the
 * header's controls go with it — there is no layout to switch and nothing to
 * add to a cart.
 */
function WishlistPage({
  entries,
  total,
}: {
  entries: WishlistEntry[]
  total: number
}) {
  const [view, setView] = React.useState<WishlistView>("list")
  const [page, setPage] = React.useState(1)

  const count = entries.length
  const perPage = (
    wishlistViews.find((option) => option.value === view) ?? wishlistViews[0]
  ).perPage

  // Switching to the grid triples the page size, and removing the last row of
  // a page empties it — either can leave `page` out of range, so clamp rather
  // than render nothing with pages left to click through.
  const pageCount = Math.max(1, Math.ceil(count / perPage))
  const safePage = Math.min(page, pageCount)
  const start = (safePage - 1) * perPage
  const visible = entries.slice(start, start + perPage)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {/* `font-bold` on purpose: `globals.css` sets every `h1` to 800, and
              the dashboard exports measure 700 — see the design note in
              CLAUDE.md. */}
          <h1 className="text-[26px] leading-none font-bold">Wishlist</h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {count === 0
              ? "Nothing saved yet"
              : `${count} course${count === 1 ? "" : "s"} saved · $${total.toFixed(2)} total if you enroll today`}
          </p>
        </div>

        {count > 0 ? (
          <div className="flex items-center gap-3">
            {/* 44px of `bg-track` around two 38px items on a 3px inset and a
                3px gap — measured off the export, which puts the same 10px
                radius on the container and on the selected pill rather than
                stepping the outer one up. */}
            <ToggleGroup
              spacing={0.75}
              value={[view]}
              onValueChange={(value: string[]) => {
                // Clicking the selected segment would otherwise clear the
                // value and leave neither layout active.
                setView((current) => (value[0] as WishlistView) ?? current)
                setPage(1)
              }}
              aria-label="Wishlist layout"
              className="bg-track p-[3px]"
            >
              {wishlistViews.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  aria-label={option.label}
                  // `aria-pressed:hover:bg-card` rather than a plain `hover:`,
                  // for the reason `enrolled-courses-section.tsx` spells out:
                  // both are single attribute selectors, so Tailwind's variant
                  // order — not source order — would decide which wins and the
                  // white pill could wash out under the pointer.
                  className="size-9.5 rounded-lg px-0 text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm aria-pressed:hover:bg-card"
                >
                  <option.icon className="size-4.5" />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <AddAllToCartButton />
          </div>
        ) : null}
      </div>

      {count === 0 ? (
        <Empty className="mt-6 rounded-xl border bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HeartIcon />
            </EmptyMedia>
            <EmptyTitle>No saved courses yet</EmptyTitle>
            <EmptyDescription>
              Tap the heart on any course and it will wait for you here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/courses" />}
            >
              Browse courses
            </Button>
          </EmptyContent>
        </Empty>
      ) : view === "list" ? (
        <div className="mt-6 flex flex-col gap-4">
          {visible.map((entry) => (
            <WishlistRow key={entry.id} course={entry.course} />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((entry) => (
            <WishlistTile key={entry.id} course={entry.course} />
          ))}
        </div>
      )}

      {count > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {start + 1}–{Math.min(start + perPage, count)} of {count}{" "}
            saved course{count === 1 ? "" : "s"}
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  className={cn(
                    "bg-card",
                    safePage <= 1 && "pointer-events-none opacity-50"
                  )}
                  onClick={(event) => {
                    event.preventDefault()
                    setPage((current) => Math.max(1, current - 1))
                  }}
                />
              </PaginationItem>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      isActive={pageNumber === safePage}
                      // `!` forces these, same as `browse-courses.tsx` and
                      // `enrolled-courses-section.tsx`: `isActive` switches
                      // `PaginationLink` to the "outline" Button variant,
                      // whose `dark:bg-input/30` — a `:is(.dark *)`-wrapped
                      // selector — outranks a plain `bg-primary` on
                      // specificity in dark mode regardless of source order.
                      className={cn(
                        pageNumber === safePage
                          ? "border-transparent! bg-primary! text-primary-foreground! hover:bg-primary/80! hover:text-white!"
                          : "bg-card"
                      )}
                      onClick={(event) => {
                        event.preventDefault()
                        setPage(pageNumber)
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  className={cn(
                    "bg-card",
                    safePage >= pageCount && "pointer-events-none opacity-50"
                  )}
                  onClick={(event) => {
                    event.preventDefault()
                    setPage((current) => Math.min(pageCount, current + 1))
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  )
}

export { WishlistPage }
