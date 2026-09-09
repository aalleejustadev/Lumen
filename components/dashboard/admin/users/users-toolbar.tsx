"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowUpDownIcon, Columns3Icon, SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  adminUsersCopy,
  planFilterOptions,
  statusFilterOptions,
  toggleableColumns,
  userTabs,
  type ToggleableColumn,
} from "@/lib/config/admin-users"
import type {
  UserPlan,
  UsersPage,
  UsersQuery,
  UsersTab,
} from "@/lib/admin/users"
import { cn } from "@/lib/utils"

/** How long typing settles before the URL changes. */
const SEARCH_DEBOUNCE_MS = 300

/** Every control on the toolbar is 40px, which is the app's control baseline. */
const CONTROL = "h-10"

/**
 * The row above the table in
 * `ui-design/light/dashboard/admin/users-page__admin.png`: a 320px search
 * field, the five-segment tab control, and Filters / Columns pushed to the
 * right edge. Measured at DPR 2 — the band is `px-5 py-4` inside the card, so
 * every control lands on 40px with 16px of air above and below.
 *
 * **The search, the tabs and Filters all write to the URL**; only Columns does
 * not. That split is the whole design: the first three change *which rows
 * exist*, which happens in SQL (`lib/admin/users.ts`) and so has to reach the
 * server, and putting them in the query string makes a narrowed view a link
 * somebody can paste into a thread. Columns changes which cells of the rows
 * you already have are drawn — nothing to fetch, nobody else's business — so
 * it is local state and stays out of the URL.
 *
 * `useTransition` is what keeps that feeling like a filter rather than a page
 * load: the rows on screen stay and dim while the next set is fetched. The
 * spinner in the field is the same pending flag.
 */
function UsersToolbar({
  query,
  counts,
  columns,
  onColumnsChange,
  pending,
  onPendingChange,
}: {
  query: UsersQuery
  counts: UsersPage["counts"]
  columns: Record<ToggleableColumn, boolean>
  onColumnsChange: (columns: Record<ToggleableColumn, boolean>) => void
  pending: boolean
  onPendingChange: (pending: boolean) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()

  // The field is controlled locally so typing stays instant and the URL
  // catches up on a debounce. `query.query` wins on mount and whenever a
  // navigation changes it from outside (the back button, "Clear filters"),
  // which is what `lastQuery` notices.
  //
  // Adjusting state *during render* rather than in an effect is React's own
  // pattern for "a prop changed, reset some state" — the one the hooks lint
  // rule accepts. Keying the component on the query would work and would throw
  // focus away mid-typing. Same call `audit-log-filters.tsx` makes.
  const [value, setValue] = React.useState(query.query)
  const [lastQuery, setLastQuery] = React.useState(query.query)
  if (query.query !== lastQuery) {
    setLastQuery(query.query)
    setValue(query.query)
  }

  React.useEffect(
    () => onPendingChange(isPending),
    [isPending, onPendingChange]
  )

  const push = React.useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams)
      for (const [key, next] of Object.entries(changes)) {
        if (next === null || next === "") params.delete(key)
        else params.set(key, next)
      }
      // Any filter change invalidates the page number — page 4 of "All users"
      // is rarely page 4 of "Admins".
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

  // Debounced, so a five-letter search is one query rather than five. Skipped
  // when the field already agrees with the URL, which stops the effect firing
  // a redundant navigation right after one lands.
  React.useEffect(() => {
    if (value === query.query) return
    const timer = setTimeout(
      () => push({ q: value || null }),
      SEARCH_DEBOUNCE_MS
    )
    return () => clearTimeout(timer)
  }, [value, query.query, push])

  function toggleStatus(status: string, checked: boolean) {
    const next = checked
      ? [...query.statuses, status]
      : query.statuses.filter((entry) => entry !== status)
    // Comma-separated rather than a repeated key: it reads better in a pasted
    // link, and `parseUsersQuery` accepts both.
    push({ status: next.length > 0 ? next.join(",") : null })
  }

  const activeFilters = query.statuses.length + (query.plan ? 1 : 0)

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle-foreground" />
        <Input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={adminUsersCopy.searchPlaceholder}
          aria-label={adminUsersCopy.searchPlaceholder}
          // `bg-background` and its repeated `dark:` twin: this field sits
          // *inside* the white card, so the export fills it with the page
          // colour to separate the two — the audit log's search is on the page
          // itself and is white for the same reason. The variant is spelled
          // twice because `Input` carries `dark:bg-input/30`, a
          // `:is(.dark *)`-wrapped selector a plain override loses to;
          // repeating it is what lets tailwind-merge drop the generated one.
          // `settings-controls.ts` documents the trap at length.
          className={cn(
            CONTROL,
            "w-full rounded-lg bg-background pr-10 pl-10 text-sm sm:w-[320px] dark:bg-background"
          )}
        />
        <div className="absolute top-1/2 right-2.5 -translate-y-1/2">
          {pending || isPending ? (
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

      {/* The segmented control is `my-learning.tsx`'s, including its
          `aria-pressed:hover:` note — both are single attribute selectors, so
          a bare `hover:bg-*` would trade places with `aria-pressed:bg-*`
          depending on Tailwind's variant order and wash the dark pill out. */}
      <ToggleGroup
        value={[query.tab]}
        onValueChange={(next: string[]) => {
          const chosen = next[0] as UsersTab | undefined
          if (!chosen || chosen === query.tab) return
          push({ tab: chosen === "all" ? null : chosen })
        }}
        aria-label="Filter accounts by role"
        className={cn(CONTROL, "gap-0 rounded-lg bg-track p-1")}
      >
        {userTabs.map((tab) => (
          <ToggleGroupItem
            key={tab.value}
            value={tab.value}
            size="lg"
            className="gap-2 rounded-md px-4 text-muted-foreground aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
          >
            {tab.label}
            {/* The export draws no counts. They are added for the reason the
                audit log's are: knowing a tab is empty before opening it is
                the point of having the tabs. */}
            <span className="text-subtle-foreground tabular-nums group-aria-pressed/toggle:text-primary-foreground/70">
              {counts[tab.value]}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="ml-auto flex items-center gap-4">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className={cn(CONTROL, "gap-2 bg-card px-4 shadow-sm")}
              />
            }
          >
            <ArrowUpDownIcon className="size-4" />
            {adminUsersCopy.filtersLabel}
            {activeFilters > 0 ? (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums">
                {activeFilters}
              </span>
            ) : null}
          </PopoverTrigger>

          <PopoverContent align="end" className="w-64 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold">
                {adminUsersCopy.filtersHeading}
              </p>
              {activeFilters > 0 ? (
                <button
                  type="button"
                  onClick={() => push({ status: null, plan: null })}
                  className="cursor-pointer text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {adminUsersCopy.resetFilters}
                </button>
              ) : null}
            </div>

            <p className="mt-4 text-[11px] font-semibold text-subtle-foreground uppercase">
              {adminUsersCopy.statusHeading}
            </p>
            <div className="mt-2 flex flex-col gap-2.5">
              {statusFilterOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2.5 text-sm"
                >
                  <Checkbox
                    checked={query.statuses.includes(option.value)}
                    onCheckedChange={(checked) =>
                      toggleStatus(option.value, checked === true)
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>

            <p className="mt-5 text-[11px] font-semibold text-subtle-foreground uppercase">
              {adminUsersCopy.planHeading}
            </p>
            <RadioGroup
              value={query.plan ?? "any"}
              onValueChange={(next) =>
                push({ plan: next === "any" ? null : (next as UserPlan) })
              }
              className="mt-2 flex flex-col gap-2.5"
            >
              {planFilterOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2.5 text-sm"
                >
                  <RadioGroupItem value={option.value} />
                  {option.label}
                </label>
              ))}
            </RadioGroup>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className={cn(CONTROL, "gap-2 bg-card px-4 shadow-sm")}
              />
            }
          >
            <Columns3Icon className="size-4" />
            {adminUsersCopy.columnsLabel}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {/* A `DropdownMenuLabel` throws (`MenuGroupContext is missing`)
                unless it sits inside a group, even one holding a single item —
                the trap `dashboard-sidebar.tsx` documents. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {adminUsersCopy.columnsHeading}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {toggleableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={columns[column.key]}
                  onCheckedChange={(checked) =>
                    onColumnsChange({ ...columns, [column.key]: checked })
                  }
                  className="cursor-pointer"
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export { UsersToolbar }
