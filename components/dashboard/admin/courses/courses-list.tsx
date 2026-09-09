"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CheckIcon } from "lucide-react"

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
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CourseArt } from "@/components/dashboard/admin/courses/course-art"
import { RequestChangesDialog } from "@/components/dashboard/admin/courses/request-changes-dialog"
import {
  approveCourse,
  requestCourseChanges,
} from "@/lib/actions/admin-courses"
import {
  adminCoursesCopy,
  awaitsDecision,
  COURSES_PAGE_SIZE,
  courseStatusBadge,
  courseTabs,
  isCoursesFiltered,
} from "@/lib/config/admin-courses"
import type { CoursesPage, CoursesQuery, CoursesTab } from "@/lib/admin/courses"
import { cn } from "@/lib/utils"

/** One row, with its "Submitted 2 days ago" already written — see the composer. */
export type CourseListRow = {
  id: string
  slug: string
  title: string
  status: CoursesPage["rows"][number]["status"]
  instructorName: string
  lessonCount: number
  submittedLabel: string | null
  thumbnailUrl: string | null
  categorySlug: string
  categoryAccent: string
}

/**
 * The list from `ui-design/light/dashboard/admin/courses-page__admin.png`:
 * one card per course on a 20px gap, and — added over the export — the filter
 * row above and the pager below.
 *
 * Measured off that export at DPR 2: full content width, 102px cards on 14px
 * padding, a 120 x 74 thumbnail 16px from an 18px/700 title, a 22px status
 * pill beside it, and a 15px meta line. Actions are right-aligned 40px buttons
 * on a 10px gap. The export draws them at 38px; the app's control baseline is
 * 40, which `CLAUDE.md` says wins over the literal measurement.
 *
 * **Only an `IN_REVIEW` row carries Approve and Request changes.** Every other
 * status gets View alone, exactly as drawn — a decision has already been made,
 * and the way to revisit it is to open the course.
 *
 * It is one client component because the pending flag belongs to the filter
 * row, the cards and the dialog at once, and because the dialog needs to know
 * which row opened it. The composer above is a Server Component and can hold
 * none of that.
 */
function CoursesList({
  rows,
  page,
  query,
}: {
  rows: CourseListRow[]
  page: CoursesPage
  query: CoursesQuery
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()
  const [saving, startSaving] = React.useTransition()
  // Which row's dialog is open. The id rather than a boolean, so the dialog
  // can name the course and the instructor in its own sentence.
  const [requesting, setRequesting] = React.useState<CourseListRow | null>(null)

  const pending = isPending || saving

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

  function selectTab(next: CoursesTab) {
    const params = new URLSearchParams(searchParams)
    if (next === "all") params.delete("tab")
    else params.set("tab", next)
    // A tab change invalidates the page number — page 3 of "All" is rarely
    // page 3 of "In review".
    params.delete("page")
    const search = params.toString()
    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      })
    })
  }

  function approve(row: CourseListRow) {
    startSaving(async () => {
      const result = await approveCourse(row.id)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
    })
  }

  function sendBack(input: { reasons: string[]; note: string }) {
    const row = requesting
    if (!row) return
    startSaving(async () => {
      const result = await requestCourseChanges(row.id, input)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) setRequesting(null)
    })
  }

  const from = (page.page - 1) * COURSES_PAGE_SIZE + 1

  return (
    <>
      {/* The segmented control is `my-learning.tsx`'s, including its
          `aria-pressed:hover:` note — both are single attribute selectors, so
          a bare `hover:bg-*` would trade places with `aria-pressed:bg-*`
          depending on Tailwind's variant order and wash the dark pill out. */}
      <ToggleGroup
        value={[query.tab]}
        onValueChange={(next: string[]) => {
          const chosen = next[0] as CoursesTab | undefined
          if (!chosen || chosen === query.tab) return
          selectTab(chosen)
        }}
        aria-label="Filter courses by status"
        className="mt-6 h-10 w-fit gap-0 rounded-lg bg-track p-1"
      >
        {courseTabs.map((tab) => (
          <ToggleGroupItem
            key={tab.value}
            value={tab.value}
            size="lg"
            className="gap-2 rounded-md px-4 text-muted-foreground aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
          >
            {tab.label}
            <span className="text-subtle-foreground tabular-nums group-aria-pressed/toggle:text-primary-foreground/70">
              {page.counts[tab.value]}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {rows.length === 0 ? (
        <Card className="mt-5 items-center gap-3 px-6 py-20 text-center ring-border">
          <p className="text-base font-bold">{adminCoursesCopy.emptyTitle}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {adminCoursesCopy.emptyDescription}
          </p>
          {isCoursesFiltered(query) ? (
            <Button
              variant="outline"
              nativeButton={false}
              className="mt-1 h-9 bg-card shadow-sm"
              render={<Link href={pathname} />}
            >
              {adminCoursesCopy.clearFilters}
            </Button>
          ) : null}
        </Card>
      ) : (
        <div
          className={cn(
            "mt-5 flex flex-col gap-5",
            // The rows stay on screen and dim while the next set is fetched,
            // rather than the list blanking between filters.
            pending && "pointer-events-none opacity-60 transition-opacity"
          )}
        >
          {rows.map((row) => {
            const badge = courseStatusBadge(row.status)
            const decidable = awaitsDecision(row.status)

            return (
              <Card
                key={row.id}
                className="flex-row items-center gap-4 p-3.5 ring-border"
              >
                <CourseArt
                  thumbnailUrl={row.thumbnailUrl}
                  categorySlug={row.categorySlug}
                  categoryAccent={row.categoryAccent}
                  className="h-[74px] w-[120px] rounded-lg"
                  iconClassName="size-7"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="truncate text-lg font-bold">{row.title}</h2>
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-medium",
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <p className="mt-2 flex flex-wrap items-center gap-x-4 text-[15px] text-muted-foreground">
                    <span>{row.instructorName}</span>
                    <span>
                      {row.lessonCount}{" "}
                      {row.lessonCount === 1 ? "lesson" : "lessons"}
                    </span>
                    {row.submittedLabel ? (
                      <span className="text-subtle-foreground">
                        {row.submittedLabel}
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  {decidable ? (
                    <>
                      <Button
                        disabled={saving}
                        onClick={() => approve(row)}
                        className="h-10 gap-2 px-4"
                      >
                        <CheckIcon className="size-4" />
                        {adminCoursesCopy.approve}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={saving}
                        onClick={() => setRequesting(row)}
                        className="h-10 bg-card px-4 shadow-sm"
                      >
                        {adminCoursesCopy.requestChanges}
                      </Button>
                    </>
                  ) : null}
                  <Button
                    variant="outline"
                    nativeButton={false}
                    className="h-10 bg-card px-4 shadow-sm"
                    render={
                      <Link href={`/dashboard/admin/courses/${row.slug}`} />
                    }
                  >
                    {adminCoursesCopy.view}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13px] text-muted-foreground">
          {page.total === 0
            ? adminCoursesCopy.emptyTitle
            : adminCoursesCopy.showing(
                from,
                from + rows.length - 1,
                page.total
              )}
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
              {Array.from({ length: page.pageCount }, (_, index) => index + 1)
                .filter(
                  (entry) =>
                    entry === 1 ||
                    entry === page.pageCount ||
                    Math.abs(entry - page.page) <= 1
                )
                .flatMap((entry, index, list) =>
                  index > 0 && entry - list[index - 1]! > 1
                    ? [null, entry]
                    : [entry]
                )
                .map((entry, index) =>
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
                        // `dark:bg-input/30` — a `:is(.dark *)`-wrapped
                        // selector — outranks a plain `bg-primary` on
                        // specificity in dark mode regardless of source order.
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

      <RequestChangesDialog
        open={requesting !== null}
        onOpenChange={(open) => {
          if (!open) setRequesting(null)
        }}
        courseTitle={requesting?.title ?? ""}
        instructorName={requesting?.instructorName ?? ""}
        pending={saving}
        onSubmit={sendBack}
      />
    </>
  )
}

export { CoursesList }
