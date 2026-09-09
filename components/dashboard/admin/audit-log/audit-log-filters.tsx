"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon, XIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { adminAuditCopy, auditTabs } from "@/lib/config/admin-audit"
import type { AuditPage, AuditTab } from "@/lib/admin/audit-log"

/** How long typing settles before the URL changes. */
const SEARCH_DEBOUNCE_MS = 300

/**
 * The tab row and the search field, from
 * `ui-design/light/dashboard/admin/audit-log-page__admin.png`.
 *
 * **Both controls write to the URL, not to local state.** The filtering itself
 * happens in SQL (`lib/admin/audit-log.ts`), so the query string is the only
 * place the two halves can meet — and it buys three things a `useState` filter
 * cannot: every view is a link someone can paste into an incident thread, the
 * back button walks the filters, and a reload keeps them.
 *
 * `useTransition` is what makes that feel like a filter rather than a page
 * load: the current rows stay on screen and dim while the next set is fetched,
 * instead of the table blanking. The spinner in the field is the same pending
 * flag.
 *
 * The segmented control is `my-learning.tsx`'s, including its
 * `aria-pressed:hover:` note — both are single attribute selectors, so a bare
 * `hover:bg-*` would trade places with `aria-pressed:bg-*` depending on
 * Tailwind's variant order and wash the dark pill out on hover.
 */
function AuditLogFilters({
  tab,
  query,
  counts,
  pending,
  onPendingChange,
}: {
  tab: AuditTab
  query: string
  counts: AuditPage["counts"]
  pending: boolean
  onPendingChange: (pending: boolean) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()

  // The field is controlled locally so typing stays instant, and the URL
  // catches up on a debounce. `query` is the source of truth on mount and
  // whenever a navigation (back button, "Clear filters") changes it from
  // outside — which is what `lastQuery` notices.
  //
  // Adjusting state *during render* rather than in an effect is React's own
  // pattern for "a prop changed, reset some state": an effect would run after
  // the browser had already painted the stale value, and it is the cascading
  // setState the hooks lint rule rejects. Keying the component on `query`
  // would work too, and would throw away focus mid-typing.
  const [value, setValue] = React.useState(query)
  const [lastQuery, setLastQuery] = React.useState(query)
  if (query !== lastQuery) {
    setLastQuery(query)
    setValue(query)
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
      // Any filter change invalidates the page number — page 4 of "all" is
      // rarely page 4 of "Security".
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

  // Debounced, so a five-letter search is one query rather than five. The
  // timer is skipped when the field already agrees with the URL, which is what
  // stops the effect firing a redundant navigation right after one lands.
  React.useEffect(() => {
    if (value === query) return
    const timer = setTimeout(
      () => push({ q: value || null }),
      SEARCH_DEBOUNCE_MS
    )
    return () => clearTimeout(timer)
  }, [value, query, push])

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <ToggleGroup
        value={[tab]}
        onValueChange={(next: string[]) => {
          const chosen = next[0]
          if (!chosen || chosen === tab) return
          push({ tab: chosen === "all" ? null : chosen })
        }}
        aria-label="Filter audit entries by category"
        className="gap-0 rounded-lg bg-track p-1"
      >
        {auditTabs.map((entry) => (
          <ToggleGroupItem
            key={entry.value}
            value={entry.value}
            size="lg"
            className="gap-2 rounded-md px-4 text-muted-foreground aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
          >
            {entry.label}
            {/* The export draws no counts, but the tabs are doing real work
                here — knowing a category is empty before opening it is the
                whole point of a filter row on a log. */}
            <span className="text-subtle-foreground tabular-nums group-aria-pressed/toggle:text-primary-foreground/70">
              {counts[entry.value]}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" />
        <Input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={adminAuditCopy.searchPlaceholder}
          aria-label={adminAuditCopy.searchPlaceholder}
          className="h-10 w-[280px] rounded-lg bg-card pr-10 pl-10 text-sm sm:w-[320px]"
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
    </div>
  )
}

export { AuditLogFilters }
