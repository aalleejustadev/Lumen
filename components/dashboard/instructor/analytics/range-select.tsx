"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ANALYTICS_DEFAULT_RANGE,
  analyticsCopy,
  analyticsRanges,
  type AnalyticsRange,
} from "@/lib/config/instructor-analytics"
import { cn } from "@/lib/utils"

/**
 * The date range in the header's top-right corner, from
 * `ui-design/light/dashboard/instructor/analytics-page.png` — measured at
 * DPR 2 as a **155 x 42** white control on the page ground, its right edge
 * flush with the content column.
 *
 * **It writes to the URL**, because it changes which rows every figure on the
 * page is counted from and that happens in SQL — the split `users-table.tsx`
 * makes between its filters and its Columns menu, and it buys the three things
 * `audit-log-browser.tsx` records: a narrowed view is a link you can paste,
 * the back button walks it, and a reload keeps it. `parseAnalyticsQuery` is
 * the gate on the way back in.
 *
 * The default never reaches the URL, so `/analytics` and `/analytics?range=30d`
 * are the same page rather than two.
 *
 * **This is the only client component in the page's header**, which is why it
 * is its own file: the `h1`, the lead and all four KPI tiles stay on the
 * server, and the bundle is one select.
 *
 * `SelectValue` takes the render-function form. Bare, Base UI prints the raw
 * *value* — the trigger would read "30d" rather than "Last 30 days" — which is
 * the trap `CLAUDE.md` records shipping in four places before anyone noticed.
 */
function RangeSelect({ value }: { value: AnalyticsRange }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = React.useTransition()

  function change(next: AnalyticsRange) {
    const params = new URLSearchParams(searchParams)
    if (next === ANALYTICS_DEFAULT_RANGE) params.delete("range")
    else params.set("range", next)
    const query = params.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    })
  }

  return (
    <Select
      value={value}
      onValueChange={(next: string | null) => {
        if (next) change(next as AnalyticsRange)
      }}
    >
      {/* `data-[size=default]:h-[42px]` repeats the variant for the reason
          every other trigger in this app records: `SelectTrigger`'s own
          `data-[size=default]:h-8` is an attribute selector a plain height
          loses to on specificity. */}
      <SelectTrigger
        aria-label={analyticsCopy.rangeLabel}
        className={cn(
          "h-[42px] w-[155px] gap-2 rounded-lg bg-card shadow-sm",
          "data-[size=default]:h-[42px]"
        )}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <SelectValue>
          {(current: string) =>
            analyticsRanges.find((range) => range.value === current)?.label ??
            analyticsRanges[1]!.label
          }
        </SelectValue>
      </SelectTrigger>
      {/* Below the trigger rather than over it, the call
          `course-filter.tsx` documents: Base UI's default aligns the selected
          item on top of the trigger, which here would cover the page title. */}
      <SelectContent align="end" alignItemWithTrigger={false}>
        {analyticsRanges.map((range) => (
          <SelectItem key={range.value} value={range.value}>
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { RangeSelect }
