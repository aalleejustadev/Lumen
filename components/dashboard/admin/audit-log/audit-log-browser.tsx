"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ChevronDownIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AuditLogFilters } from "@/components/dashboard/admin/audit-log/audit-log-filters"
import { adminAuditCopy, auditTargetTypeLabels } from "@/lib/config/admin-audit"
import type { AuditPage, AuditTab } from "@/lib/admin/audit-log"
import { initialsOf } from "@/lib/user"
import { cn } from "@/lib/utils"

/**
 * One table row, already formatted. The composer builds these on the server —
 * see `audit-format.ts` for why the relative timestamp in particular must not
 * be computed in the browser.
 */
export type AuditRow = {
  id: string
  actorName: string
  actorImage: string | null
  roleLabel: string
  roleClass: string
  action: string
  target: string | null
  targetType: string | null
  categoryLabel: string
  categoryClass: string
  when: string
  exact: string
  ip: string | null
  userAgent: string | null
}

const headClass = "h-13 px-5 text-[13px] font-normal text-muted-foreground"

/**
 * The filter row, the table and the pager — the interactive half of
 * `/dashboard/admin/audit-log`.
 *
 * It is one client component rather than three because the pending flag
 * belongs to all of them: the filters raise it, the table dims on it, and the
 * composer above is a Server Component and so cannot hold it.
 *
 * Rows expand in place. That is the affordance the export has no room to draw
 * and a log most needs — the columns carry who/what/when, and the panel
 * underneath carries the things you only want when you are actually
 * investigating: the exact instant behind "2 days ago", what kind of thing the
 * target was, and the user agent. A row is a real `<button>`-shaped control
 * (keyboard reachable, `aria-expanded`), not a `div` with an `onClick`.
 *
 * Paging is plain `<Link>`s rather than a transition: the page number belongs
 * in the URL like the filters, and links give prefetching and the app's own
 * navigation bar for free.
 */
function AuditLogBrowser({
  rows,
  page,
  tab,
  query,
}: {
  rows: AuditRow[]
  page: AuditPage
  tab: AuditTab
  query: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, setPending] = React.useState(false)
  const [expanded, setExpanded] = React.useState<string | null>(null)

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

  const filtered = tab !== "all" || query !== ""

  return (
    <>
      <div className="mt-6">
        <AuditLogFilters
          tab={tab}
          query={query}
          counts={page.counts}
          pending={pending}
          onPendingChange={setPending}
        />
      </div>

      {/* Zero-padding card with flush rows divided by hairlines, the shape
          `top-courses-card.tsx` uses — the export's dividers run the full
          width of the card, so the cells own the inset rather than the card. */}
      <Card
        className={cn(
          "mt-4 gap-0 overflow-hidden ring-border [--card-spacing:0px]",
          // The rows stay on screen and dim while the next set is fetched,
          // rather than the table blanking between filters.
          pending && "pointer-events-none opacity-60 transition-opacity"
        )}
      >
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <p className="text-base font-bold">{adminAuditCopy.emptyTitle}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {adminAuditCopy.emptyDescription}
            </p>
            {filtered ? (
              <Button
                variant="outline"
                nativeButton={false}
                className="mt-1 h-9 bg-card shadow-sm"
                render={<Link href={pathname} />}
              >
                {adminAuditCopy.clearFilters}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(headClass, "w-[21%]")}>
                    Member
                  </TableHead>
                  <TableHead className={cn(headClass, "w-[22%]")}>
                    Action
                  </TableHead>
                  <TableHead className={cn(headClass, "w-[22%]")}>
                    Target
                  </TableHead>
                  <TableHead className={cn(headClass, "w-[12%]")}>
                    Category
                  </TableHead>
                  <TableHead className={cn(headClass, "w-[12%]")}>
                    When
                  </TableHead>
                  <TableHead className={headClass}>IP address</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => {
                  const open = expanded === row.id
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow
                        role="button"
                        tabIndex={0}
                        aria-expanded={open}
                        onClick={() => setExpanded(open ? null : row.id)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return
                          event.preventDefault()
                          setExpanded(open ? null : row.id)
                        }}
                        className={cn(
                          "cursor-pointer outline-none focus-visible:bg-hover",
                          open && "bg-hover hover:bg-hover"
                        )}
                      >
                        <TableCell className="h-[68px] px-5">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9">
                              <AvatarImage
                                src={row.actorImage ?? undefined}
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                              <AvatarFallback className="bg-hover text-[11px] font-semibold text-foreground">
                                {initialsOf(row.actorName, "")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-col items-start gap-1">
                              <span className="truncate text-[15px] font-semibold">
                                {row.actorName}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                  row.roleClass
                                )}
                              >
                                {row.roleLabel}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="h-[68px] px-5 text-[15px]">
                          {row.action}
                        </TableCell>

                        <TableCell className="h-[68px] px-5 text-[15px] text-muted-foreground">
                          {row.target ?? "—"}
                        </TableCell>

                        <TableCell className="h-[68px] px-5">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-[13px] font-medium",
                              row.categoryClass
                            )}
                          >
                            {row.categoryLabel}
                          </span>
                        </TableCell>

                        <TableCell
                          title={row.exact}
                          className="h-[68px] px-5 text-[15px] text-muted-foreground"
                        >
                          {row.when}
                        </TableCell>

                        <TableCell className="h-[68px] px-5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[15px] text-subtle-foreground tabular-nums">
                              {row.ip ?? "—"}
                            </span>
                            {/* No column of its own: the export has six and
                                this is only a hint that the row opens. */}
                            <ChevronDownIcon
                              aria-hidden
                              className={cn(
                                "size-4 shrink-0 text-subtle-foreground transition-transform",
                                open && "rotate-180"
                              )}
                            />
                          </div>
                        </TableCell>
                      </TableRow>

                      {open ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="bg-soft px-5 py-4">
                            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                              <Detail label="Exact time" value={row.exact} />
                              <Detail
                                label="Target type"
                                value={
                                  row.targetType
                                    ? (auditTargetTypeLabels[row.targetType] ??
                                      row.targetType)
                                    : null
                                }
                              />
                              <Detail label="IP address" value={row.ip} />
                              <Detail
                                label="Device"
                                value={row.userAgent}
                                className="lg:col-span-1"
                              />
                            </dl>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13px] text-muted-foreground">
          {adminAuditCopy.retentionNote}
        </p>

        {page.pageCount > 1 ? (
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={hrefFor(page.page - 1)}
                  className={cn(
                    "bg-card",
                    page.page <= 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
              {pageWindow(page.page, page.pageCount).map((entry, index) =>
                entry === null ? (
                  <PaginationItem key={`gap-${index}`}>
                    <span className="px-2 text-sm text-muted-foreground">
                      …
                    </span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={entry}>
                    <PaginationLink
                      href={hrefFor(entry)}
                      isActive={entry === page.page}
                      // `!` forces these: `isActive` makes `PaginationLink` use
                      // the "outline" Button variant, whose `dark:bg-input/30`
                      // — a `:is(.dark *)`-wrapped selector — outranks a plain
                      // `bg-primary` on specificity in dark mode regardless of
                      // source order. Same trap as `browse-courses.tsx`.
                      className={cn(
                        entry === page.page
                          ? "border-transparent! bg-primary! text-primary-foreground! hover:bg-primary/80! hover:text-white!"
                          : "bg-card"
                      )}
                    >
                      {entry}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  href={hrefFor(page.page + 1)}
                  className={cn(
                    "bg-card",
                    page.page >= page.pageCount &&
                      "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </div>
    </>
  )
}

function Detail({
  label,
  value,
  className,
}: {
  label: string
  value: string | null
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-semibold text-subtle-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-[13px] break-words text-foreground">
        {value ?? "—"}
      </dd>
    </div>
  )
}

/**
 * First, last, and the current page's neighbours, with `null` standing in for
 * an elided run. The log pages into the dozens, so the browse catalog's "every
 * number" pager would run off the card.
 */
function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...pages]
    .filter((entry) => entry >= 1 && entry <= total)
    .sort((a, b) => a - b)

  const out: (number | null)[] = []
  let previous = 0
  for (const entry of sorted) {
    if (previous && entry - previous > 1) out.push(null)
    out.push(entry)
    previous = entry
  }
  return out
}

export { AuditLogBrowser }
