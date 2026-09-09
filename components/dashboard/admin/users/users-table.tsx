"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { toast } from "@/components/ui/toast"
import { UserRowActions } from "@/components/dashboard/admin/users/user-row-actions"
import { UsersToolbar } from "@/components/dashboard/admin/users/users-toolbar"
import {
  adminUsersCopy,
  isUsersFiltered,
  showingLine,
  toggleableColumns,
  USERS_PAGE_SIZE,
  userPlanLabels,
  userRoleBadge,
  userStatusBadge,
  type ToggleableColumn,
} from "@/lib/config/admin-users"
import { setUserStatus } from "@/lib/actions/admin-users"
import type { UsersPage, UsersQuery, UserRow } from "@/lib/admin/users"
import { initialsOf } from "@/lib/user"
import { cn } from "@/lib/utils"

/** One table row with its country already spelled out — see the composer. */
export type UsersTableRow = UserRow & { countryLabel: string | null }

const headClass = "h-10.5 px-5 text-[13px] font-normal text-muted-foreground"
const cellClass = "h-[61px] px-5"
/** A pill: 13px on a 22px box, which is what the export's Role and Status draw. */
const pillClass =
  "inline-flex rounded-full px-2.5 py-0.5 text-[13px] font-medium"

/**
 * The header checkbox's third state — some rows on this page selected, not all.
 *
 * Base UI puts `data-indeterminate` on the root and `aria-checked="mixed"` on
 * it, which is the right semantics, but the generated `Checkbox` only knows how
 * to draw a tick: a half-selected page rendered as a fully ticked box, which
 * says the opposite of what is true. The tick is hidden and a dash drawn in its
 * place.
 *
 * The dash is a `::before`, not a `::after`: the generated root already uses
 * `after:-inset-x-3 after:-inset-y-2` as an invisible hit-target expansion, and
 * borrowing that pseudo-element would shrink the checkbox's click area to the
 * 16px box. Styled from here rather than in `components/ui/checkbox.tsx`, which
 * the shadcn CLI would overwrite.
 */
const INDETERMINATE = cn(
  "data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground",
  "[&_[data-slot=checkbox-indicator][data-indeterminate]]:hidden",
  "data-indeterminate:before:absolute data-indeterminate:before:h-[1.5px] data-indeterminate:before:w-2",
  "data-indeterminate:before:rounded-full data-indeterminate:before:bg-current data-indeterminate:before:content-['']"
)

/** Everything visible to start with, derived so a new column can't be missed. */
const ALL_COLUMNS = Object.fromEntries(
  toggleableColumns.map((column) => [column.key, true])
) as Record<ToggleableColumn, boolean>

/**
 * The card from `ui-design/light/dashboard/admin/users-page__admin.png`: the
 * toolbar, the table, and — below the card — the "Showing 1–8 of 18 users"
 * line beside the pager.
 *
 * Measured off that export at DPR 2: a zero-padding card whose rows are flush
 * to its edges and divided by hairlines, a 42px header row and 61px body rows,
 * 20px cell padding, a 36px avatar 12px from a 15px/600 name, and 22px pills.
 * The divider under the header is `--border` where the row dividers are the
 * lighter `--border-subtle`, which is what stops eight rows reading as a grid.
 *
 * It is **one client component** rather than several because three pieces of
 * state belong to all of them: the pending flag the toolbar raises and the
 * table dims on, the visible-column set the toolbar toggles and the table
 * draws from, and the selection the checkbox column holds and the bulk bar
 * acts on. The composer above is a Server Component and cannot hold any of
 * them.
 *
 * **The checkboxes do something.** The export draws them and draws no bulk
 * bar, but a checkbox column that only ever ticks is worse than no checkbox
 * column — the same call `course-feedback-dialog.tsx` makes about its star row
 * — so selecting rows reveals a bar with the one bulk operation the schema
 * actually supports. It is the same `setUserStatus` the row menu calls, over
 * several ids instead of one.
 *
 * Paging is plain `<Link>`s: the page number belongs in the URL like the
 * filters, and links give prefetching and the app's navigation bar for free.
 */
function UsersTable({
  rows,
  page,
  query,
}: {
  rows: UsersTableRow[]
  page: UsersPage
  query: UsersQuery
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [navigating, setNavigating] = React.useState(false)
  const [columns, setColumns] =
    React.useState<Record<ToggleableColumn, boolean>>(ALL_COLUMNS)
  const [selected, setSelected] = React.useState<string[]>([])
  const [saving, startSaving] = React.useTransition()

  // A selection is only meaningful for rows that are on screen: the filter or
  // the page can change under it, and acting on an id the admin can no longer
  // see is not what ticking a box meant. Narrowing during render is the same
  // "a prop changed, reset some state" pattern the toolbar's search field uses.
  const ids = React.useMemo(() => rows.map((row) => row.id), [rows])
  const visible = selected.filter((id) => ids.includes(id))
  if (visible.length !== selected.length) setSelected(visible)

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

  function run(userIds: string[], status: "ACTIVE" | "SUSPENDED") {
    startSaving(async () => {
      const result = await setUserStatus(userIds, status)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) setSelected([])
    })
  }

  const allChecked = rows.length > 0 && visible.length === rows.length
  const pending = navigating || saving
  const filtered = isUsersFiltered(query)

  return (
    <>
      {/* Zero-padding card with flush rows, the shape `top-courses-card.tsx`
          and the audit log's table use — the export's dividers run the full
          width, so the cells own the inset rather than the card. */}
      <Card className="mt-6 gap-0 overflow-hidden ring-border [--card-spacing:0px]">
        <UsersToolbar
          query={query}
          counts={page.counts}
          columns={columns}
          onColumnsChange={setColumns}
          pending={pending}
          onPendingChange={setNavigating}
        />

        {visible.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-border bg-soft px-5 py-3">
            <p className="text-[13px] font-medium">{visible.length} selected</p>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => run(visible, "ACTIVE")}
                className="h-9 bg-card shadow-sm"
              >
                {adminUsersCopy.bulkReactivate}
              </Button>
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() => run(visible, "SUSPENDED")}
                className="h-9"
              >
                {adminUsersCopy.bulkSuspend}
              </Button>
              <Button
                variant="ghost"
                disabled={saving}
                onClick={() => setSelected([])}
                className="h-9"
              >
                {adminUsersCopy.bulkClear}
              </Button>
            </div>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border-t border-border px-6 py-20 text-center">
            <p className="text-base font-bold">{adminUsersCopy.emptyTitle}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {adminUsersCopy.emptyDescription}
            </p>
            {filtered ? (
              <Button
                variant="outline"
                nativeButton={false}
                className="mt-1 h-9 bg-card shadow-sm"
                render={<Link href={pathname} />}
              >
                {adminUsersCopy.clearFilters}
              </Button>
            ) : null}
          </div>
        ) : (
          <div
            className={cn(
              "overflow-x-auto border-t border-border",
              // The rows stay on screen and dim while the next set is fetched,
              // rather than the table blanking between filters.
              pending && "pointer-events-none opacity-60 transition-opacity"
            )}
          >
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(headClass, "w-[3%]")}>
                    <Checkbox
                      checked={allChecked}
                      indeterminate={visible.length > 0 && !allChecked}
                      onCheckedChange={(checked) =>
                        setSelected(checked === true ? ids : [])
                      }
                      aria-label={adminUsersCopy.selectAllLabel}
                      className={INDETERMINATE}
                    />
                  </TableHead>
                  <TableHead className={cn(headClass, "w-[20%]")}>
                    Name
                  </TableHead>
                  {columns.role ? (
                    <TableHead className={cn(headClass, "w-[13%]")}>
                      Role
                    </TableHead>
                  ) : null}
                  {columns.plan ? (
                    <TableHead className={cn(headClass, "w-[11%]")}>
                      Plan
                    </TableHead>
                  ) : null}
                  {columns.email ? (
                    <TableHead className={cn(headClass, "w-[20%]")}>
                      Email
                    </TableHead>
                  ) : null}
                  {columns.country ? (
                    <TableHead className={cn(headClass, "w-[13%]")}>
                      Country
                    </TableHead>
                  ) : null}
                  <TableHead className={cn(headClass, "w-[14%]")}>
                    Status
                  </TableHead>
                  {/* No label: the export's last column is the `⋯` alone. */}
                  <TableHead className={cn(headClass, "w-[4%]")}>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => {
                  const role = userRoleBadge(row.role)
                  const status = userStatusBadge(row.status)
                  const checked = visible.includes(row.id)

                  return (
                    <TableRow
                      key={row.id}
                      data-state={checked ? "selected" : undefined}
                      // Two overrides on the generated row. `--border-subtle`
                      // because the export draws the header's rule at full
                      // strength and the row dividers a step lighter; and
                      // `bg-soft` for the selected tint, because the generated
                      // `data-[state=selected]:bg-muted` resolves to `--hover`
                      // — the same fill the neutral **Student** pill uses, so
                      // selecting a learner made their role pill disappear.
                      className="border-border-subtle data-[state=selected]:bg-soft"
                    >
                      <TableCell className={cellClass}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) =>
                            setSelected((current) =>
                              next === true
                                ? [...current, row.id]
                                : current.filter((id) => id !== row.id)
                            )
                          }
                          aria-label={adminUsersCopy.selectRowLabel(row.name)}
                        />
                      </TableCell>

                      <TableCell className={cellClass}>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarImage
                              src={row.image ?? undefined}
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                            <AvatarFallback className="bg-hover text-[11px] font-semibold text-foreground">
                              {initialsOf(row.name, row.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-[15px] font-semibold">
                            {row.name}
                          </span>
                        </div>
                      </TableCell>

                      {columns.role ? (
                        <TableCell className={cellClass}>
                          <span className={cn(pillClass, role.className)}>
                            {role.label}
                          </span>
                        </TableCell>
                      ) : null}

                      {columns.plan ? (
                        <TableCell className={cn(cellClass, "text-[15px]")}>
                          {userPlanLabels[row.plan]}
                        </TableCell>
                      ) : null}

                      {columns.email ? (
                        <TableCell
                          className={cn(
                            cellClass,
                            "text-[15px] text-muted-foreground"
                          )}
                        >
                          {row.email}
                        </TableCell>
                      ) : null}

                      {columns.country ? (
                        <TableCell
                          className={cn(
                            cellClass,
                            "text-[15px] text-muted-foreground"
                          )}
                        >
                          {row.countryLabel ?? "—"}
                        </TableCell>
                      ) : null}

                      <TableCell className={cellClass}>
                        <span className={cn(pillClass, status.className)}>
                          {status.label}
                        </span>
                      </TableCell>

                      <TableCell className={cn(cellClass, "text-right")}>
                        <UserRowActions
                          user={row}
                          pending={saving}
                          onSetStatus={(next) => run([row.id], next)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13px] text-muted-foreground">
          {showingLine({
            page: page.page,
            total: page.total,
            rows: rows.length,
            pageSize: USERS_PAGE_SIZE,
          })}
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
                      // `!` forces these: `isActive` makes `PaginationLink`
                      // use the "outline" Button variant, whose
                      // `dark:bg-input/30` — a `:is(.dark *)`-wrapped selector
                      // — outranks a plain `bg-primary` on specificity in dark
                      // mode regardless of source order. Same trap
                      // `browse-courses.tsx` and the audit log document.
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

/**
 * First, last, and the current page's neighbours, with `null` for an elided
 * run. The `user` table pages into the thousands, so the browse catalog's
 * "every number" pager would run off the card. Same helper the audit log's
 * table uses; kept per-table rather than shared because a pager's shape is a
 * property of the table it sits under, not a vocabulary.
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

export { UsersTable }
