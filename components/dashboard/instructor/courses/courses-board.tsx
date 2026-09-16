"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { BookOpenTextIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MyCourseRow } from "@/components/dashboard/instructor/courses/my-course-row"
import {
  COURSES_PAGE_SIZE,
  isMyCoursesFiltered,
  myCoursesCopy,
  myCoursesTabs,
} from "@/lib/config/instructor-courses"
import type {
  InstructorCoursesPage,
  MyCoursesTab,
} from "@/lib/instructor-courses"
import { cn } from "@/lib/utils"

/**
 * `/dashboard/instructor/courses`, from
 * `ui-design/light/dashboard/instructor/my-courses-page.png` — the title row
 * with **Create Course**, the four KPI cards, the tabs opposite the search
 * field, the stack of course rows, and the footer.
 *
 * Measured off that export at DPR 2 and verified against the render: the
 * instructor shell's usual 32px page inset, a header block *pixel-identical*
 * to `coupons-page__main.png`'s (so it is that page's, not a second
 * measurement), a four-up KPI row of `CountCard`s on a 16px gap, then a
 * **42px** segmented track (`--track`, `p-1`) opposite a **220 x 42** search
 * field, then 126px rows on a 16px gap, and a 36px pager 20px below them.
 *
 * It is one client component because the export puts **Create Course** in the
 * title's row, so the header is client either way — the reason
 * `categories-list.tsx` and `coupons-board.tsx` are shaped like this. The four
 * KPI cards are a Server Component passed in as `children`, so a row of markup
 * and its four icons never reach the bundle, the arrangement
 * `community-page.tsx` records.
 *
 * Three things decide how it behaves:
 *
 *  - **The tabs and the search write to the URL; nothing else does.** Both
 *    change *which rows exist*, which happens in SQL, so a narrowed view is a
 *    link you can paste and the back button walks it — the split
 *    `users-table.tsx` makes between its filters and its Columns menu. The
 *    search is debounced so a five-letter query is one round trip, and it
 *    resets from the URL by **adjusting state during render** rather than in
 *    an effect, React's own pattern for "a prop changed, reset some state"
 *    (keying the component on the query would throw focus away mid-typing).
 *  - **Create Course is disabled**, because `/dashboard/instructor/courses/new`
 *    is not a built route. The flag is read off `instructorNav` on the server
 *    and passed down, so this button and every row's primary button light up
 *    together the day that row flips to `built: true` — the Help Center's
 *    arrangement for its own "Open Discussions".
 *  - **The pager draws only once there is a second page.** The export's own
 *    footer has two, so it looks exactly as drawn; a lone "1" under a list
 *    that fits on one screen is furniture.
 */

/** How long typing settles before the URL changes. */
const SEARCH_DEBOUNCE_MS = 300

/** Both controls in the filter row measure 42px in the export, and they have
 *  to match each other before they match the app's 40px button baseline. */
const CONTROL = "h-[42px]"

function CoursesBoard({
  page,
  authoringBuilt,
  children,
}: {
  page: InstructorCoursesPage
  /** Whether the course authoring flow exists yet — see the component note. */
  authoringBuilt: boolean
  /** The four KPI cards, rendered on the server. */
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()

  const [value, setValue] = React.useState(page.query.query)
  const [lastQuery, setLastQuery] = React.useState(page.query.query)
  if (page.query.query !== lastQuery) {
    setLastQuery(page.query.query)
    setValue(page.query.query)
  }

  const push = React.useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams)
      for (const [key, next] of Object.entries(changes)) {
        if (next === null || next === "") params.delete(key)
        else params.set(key, next)
      }
      // Any filter change invalidates the page number — page 2 of Drafts is
      // rarely page 2 of All.
      params.delete("page")
      const search = params.toString()
      startTransition(() => {
        router.replace(search ? `${pathname}?${search}` : pathname, {
          scroll: false,
        })
      })
    },
    [pathname, router, searchParams]
  )

  // Skipped when the field already agrees with the URL, which stops the effect
  // firing a redundant navigation right after one lands.
  React.useEffect(() => {
    if (value === page.query.query) return
    const timer = setTimeout(
      () => push({ q: value || null }),
      SEARCH_DEBOUNCE_MS
    )
    return () => clearTimeout(timer)
  }, [value, page.query.query, push])

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

  // Off the **page size**, not `rows.length`: the last page is short, so
  // multiplying by what it happens to hold made page 2 of 10 read "4–6".
  const from = page.total === 0 ? 0 : (page.page - 1) * COURSES_PAGE_SIZE + 1
  const to = from === 0 ? 0 : from + page.rows.length - 1
  const filtered = isMyCoursesFiltered(page.query)

  return (
    <>
      {/* Header ---------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* `font-bold` explicitly: `globals.css` sets every `h1` to 800 and
              the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
          <h1 className="text-[32px] leading-none font-bold">
            {myCoursesCopy.title}
          </h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {myCoursesCopy.description}
          </p>
        </div>

        <Button
          type="button"
          disabled={!authoringBuilt}
          title={
            authoringBuilt ? undefined : myCoursesCopy.authoringUnavailable
          }
          className="h-10 shrink-0 gap-2 px-4"
        >
          <PlusIcon className="size-4" />
          {myCoursesCopy.createCourse}
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
            const chosen = next[0] as MyCoursesTab | undefined
            if (!chosen || chosen === page.query.tab) return
            push({ tab: chosen === "all" ? null : chosen })
          }}
          aria-label="Filter courses by status"
          className={cn(CONTROL, "gap-1.5 rounded-lg bg-track p-1")}
        >
          {/* `h-[34px]` on the item, not the `lg` variant's `h-9`:
              `ToggleGroup` is `items-center` rather than `items-stretch`, so
              an item sizes itself, and a 36px one would overflow the track's
              34px content box by a pixel top and bottom. */}
          {myCoursesTabs.map((tab) => (
            <ToggleGroupItem
              key={tab.value}
              value={tab.value}
              size="lg"
              className="h-[34px] rounded-md px-4 text-[14px] text-muted-foreground aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
            >
              {tab.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="relative ml-auto">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle-foreground" />
          {/* `bg-card` here, not the Users table's `bg-background`: that field
              sits *inside* a white card and borrows the page colour to
              separate the two, where this one sits on the page itself and the
              export fills it white. The `dark:` twin is spelled out because
              `Input` carries `dark:bg-input/30`, a `:is(.dark *)`-wrapped
              selector a plain override loses to — repeating the variant is
              what lets tailwind-merge drop the generated one, the trap
              `settings-controls.ts` documents at length. */}
          <Input
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={myCoursesCopy.searchPlaceholder}
            aria-label={myCoursesCopy.searchPlaceholder}
            className={cn(
              CONTROL,
              "w-full rounded-lg bg-card pr-10 pl-[42px] text-[14px] sm:w-[220px] md:text-[14px] dark:bg-card"
            )}
          />
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            {isPending ? (
              <Spinner className="size-4 text-subtle-foreground" />
            ) : value ? (
              <button
                type="button"
                onClick={() => {
                  setValue("")
                  push({ q: null })
                }}
                aria-label="Clear search"
                className="grid size-5 cursor-pointer place-items-center rounded-full text-subtle-foreground transition-colors hover:bg-hover hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Rows ------------------------------------------------------------ */}
      {page.total === 0 && !filtered ? (
        <Card className="mt-4 p-0 ring-border [--card-spacing:0px]">
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpenTextIcon />
              </EmptyMedia>
              <EmptyTitle>{myCoursesCopy.empty.title}</EmptyTitle>
              <EmptyDescription>
                {myCoursesCopy.empty.description}
              </EmptyDescription>
            </EmptyHeader>
            <Button
              type="button"
              disabled={!authoringBuilt}
              title={
                authoringBuilt ? undefined : myCoursesCopy.authoringUnavailable
              }
              className="h-10 gap-2 px-4"
            >
              <PlusIcon className="size-4" />
              {myCoursesCopy.createCourse}
            </Button>
          </Empty>
        </Card>
      ) : (
        <div
          className={cn(
            "mt-4 flex flex-col gap-4",
            isPending && "opacity-60 transition-opacity"
          )}
        >
          {page.rows.length === 0 ? (
            <Card className="p-0 ring-border [--card-spacing:0px]">
              <p className="px-5 py-10 text-center text-[14px] text-muted-foreground">
                {myCoursesCopy.noMatches}
              </p>
            </Card>
          ) : (
            page.rows.map((course) => (
              <MyCourseRow key={course.id} course={course} />
            ))
          )}
        </div>
      )}

      {/* Footer ---------------------------------------------------------- */}
      {page.total > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[13px] text-muted-foreground">
            {myCoursesCopy.showing(from, to, page.total)}
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
                {Array.from({ length: page.pageCount }, (_, index) => (
                  <PaginationItem key={index}>
                    {/* `bg-primary!` is the one case `!` is necessary here:
                        `isActive` makes `PaginationLink` use the outline
                        variant, whose `dark:bg-input/30` is a wrapped selector
                        that outranks a plain override regardless of source
                        order — the dark-mode trap `browse-courses.tsx` records. */}
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
          ) : null}
        </div>
      ) : null}
    </>
  )
}

export { CoursesBoard }
