"use client"

import * as React from "react"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { InstructorCourseCard } from "@/components/dashboard/instructors/instructor-course-card"
import type { BrowseCourse } from "@/lib/config/browse-courses"
import { cn } from "@/lib/utils"

const COURSES_PER_PAGE = 4

/** "Courses by {name}", from `instructor-page__part2.png` — the "Showing
 *  X–Y of Z courses" line appears twice in the export (once under the
 *  heading, once beside the pagination), so it's rendered twice here too. */
function InstructorCoursesSection({
  firstName,
  courses,
}: {
  firstName: string
  courses: Omit<BrowseCourse, "icon">[]
}) {
  const [page, setPage] = React.useState(1)
  const pageCount = Math.max(1, Math.ceil(courses.length / COURSES_PER_PAGE))
  const safePage = Math.min(page, pageCount)
  const start = (safePage - 1) * COURSES_PER_PAGE
  const visible = courses.slice(start, start + COURSES_PER_PAGE)
  const rangeLabel = `Showing ${start + 1}–${Math.min(start + COURSES_PER_PAGE, courses.length)} of ${courses.length} courses`

  return (
    <div>
      <h2 className="text-xl">Courses by {firstName}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{rangeLabel}</p>

      <div className="mt-5 grid gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((course) => (
          <InstructorCourseCard key={course.slug} course={course} />
        ))}
      </div>

      {pageCount > 1 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
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
                      // `!` forces these: `isActive` makes `PaginationLink`
                      // use the "outline" Button variant, whose
                      // `dark:bg-input/30` — a `:is(.dark *)`-wrapped
                      // selector — outranks a plain `bg-primary` on
                      // specificity in dark mode regardless of source
                      // order, the same trap `size-14` hit on `Avatar`.
                      className={cn(
                        pageNumber === safePage
                          ? "border-transparent! bg-primary! text-primary-foreground! hover:bg-primary/80!"
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

export { InstructorCoursesSection }
