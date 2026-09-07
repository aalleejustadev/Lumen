"use client"

import * as React from "react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
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
import { EnrolledCourseCard } from "@/components/dashboard/learning/enrolled-course-card"
import {
  LEARNING_PER_PAGE,
  learningTabs,
  type LearningTabValue,
} from "@/lib/config/my-learning"
import { cn } from "@/lib/utils"

/**
 * The In Progress / Completed switch and the grid under it, from
 * `my-learning-page.png`. The one client component on the page — the stat row
 * and the heading above it stay server-rendered.
 *
 * The switch is a segmented control rather than the catalog's row of separate
 * pills: one `bg-track` container on `p-1`, with the selected item as the
 * dark pill inside it. Each tab carries its own count, taken from the same
 * lists the stat row counts, so the two can't disagree.
 */
function EnrolledCoursesSection() {
  const [tab, setTab] = React.useState<LearningTabValue>("in-progress")
  const [page, setPage] = React.useState(1)

  const courses =
    learningTabs.find((entry) => entry.value === tab)?.courses ?? []

  // Switching tabs can leave the current page out of range (9 completed
  // courses paginate further than 5 in-progress ones) — snap back rather
  // than render an empty grid.
  const pageCount = Math.max(1, Math.ceil(courses.length / LEARNING_PER_PAGE))
  const safePage = Math.min(page, pageCount)
  const start = (safePage - 1) * LEARNING_PER_PAGE
  const visible = courses.slice(start, start + LEARNING_PER_PAGE)

  return (
    <div>
      <ToggleGroup
        value={[tab]}
        onValueChange={(value: string[]) => {
          // Clicking the selected segment would otherwise clear the value and
          // leave neither tab active — keep the current one instead.
          setTab((current) => (value[0] as LearningTabValue) ?? current)
          setPage(1)
        }}
        aria-label="Filter enrolled courses"
        className="gap-0 rounded-lg bg-track p-1"
      >
        {learningTabs.map((entry) => (
          <ToggleGroupItem
            key={entry.value}
            value={entry.value}
            size="lg"
            // `aria-pressed:hover:` rather than a plain `hover:` for the
            // selected segment: both are single attribute selectors, so a
            // bare `hover:bg-*` would trade places with `aria-pressed:bg-*`
            // depending on Tailwind's variant order and wash the dark pill
            // out on hover. Doubling the selector settles it on specificity.
            className="gap-2 rounded-md px-4 text-muted-foreground aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
          >
            {entry.label}
            <span className="text-subtle-foreground tabular-nums group-aria-pressed/toggle:text-primary-foreground/70">
              {entry.courses.length}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {visible.length > 0 ? (
        <div className="mt-6 grid gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((course) => (
            <EnrolledCourseCard key={course.slug} course={course} />
          ))}
        </div>
      ) : (
        <Empty className="mt-6 border">
          <EmptyHeader>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>
              Courses you enrol in show up here so you can pick up where you
              left off.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {courses.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {start + 1}–
            {Math.min(start + LEARNING_PER_PAGE, courses.length)} of{" "}
            {courses.length} courses
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
                      // `!` forces these, same as `browse-courses.tsx`:
                      // `isActive` switches `PaginationLink` to the "outline"
                      // Button variant, whose `dark:bg-input/30` — a
                      // `:is(.dark *)`-wrapped selector — outranks a plain
                      // `bg-primary` on specificity in dark mode regardless
                      // of source order.
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

export { EnrolledCoursesSection }
