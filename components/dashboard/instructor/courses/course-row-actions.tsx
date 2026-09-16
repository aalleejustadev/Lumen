"use client"

import Link from "next/link"
import {
  EllipsisIcon,
  ExternalLinkIcon,
  MessageCircleQuestionMarkIcon,
  TicketPercentIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { courseRowMenu } from "@/lib/config/instructor-courses"
import type { MyCourseRow } from "@/lib/instructor-courses"

/**
 * The `⋯` at the end of each row. The export draws the button and never draws
 * it open, so its contents are chosen rather than copied — and the rule they
 * are chosen by is that **every item goes somewhere that exists today**, which
 * is the same rule that leaves the row's own primary button disabled.
 *
 *  - **View sale page** is `/dashboard/courses/[slug]`, the page a student
 *    would see. It is drawn *disabled* with the reason for a course that has
 *    never been published, because that route resolves a published course; the
 *    treatment `user-row-actions.tsx` gives "View profile" for a learner, and
 *    for its reason — dropping the item instead would make the menu change
 *    shape row to row for no cause the reader can see.
 *  - **Questions about this course** and **Coupons for this course** are the
 *    two built instructor surfaces that already take a `?course=` filter, so
 *    they are one click rather than a page and a dropdown. Both parse that id
 *    against the caller's own courses (`parseQuestionsQuery`,
 *    `parseCouponsQuery`), so a link built here can only ever narrow what
 *    those pages would have shown anyway.
 *
 * There is deliberately no **Edit** item: it would be a second copy of the
 * disabled primary button standing right beside it.
 */
function CourseRowActions({ course }: { course: MyCourseRow }) {
  const published = course.status === "PUBLISHED"

  return (
    <DropdownMenu>
      {/* 38px square with the export's own hairline and, measured, no shadow
          — unlike the white card-on-card buttons the sale page lifts. */}
      <DropdownMenuTrigger
        aria-label={`${courseRowMenu.label} ${course.title}`}
        className="grid size-[38px] shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground ring-1 ring-border transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <EllipsisIcon className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        {published ? (
          <DropdownMenuItem
            render={<Link href={`/dashboard/courses/${course.slug}`} />}
            className="cursor-pointer p-2"
          >
            <ExternalLinkIcon />
            {courseRowMenu.viewSalePage}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled
            title={courseRowMenu.viewSalePageUnavailable}
            className="p-2"
          >
            <ExternalLinkIcon />
            {courseRowMenu.viewSalePage}
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          render={
            <Link href={`/dashboard/instructor/qa?course=${course.id}`} />
          }
          className="cursor-pointer p-2"
        >
          <MessageCircleQuestionMarkIcon />
          {courseRowMenu.questions}
        </DropdownMenuItem>

        <DropdownMenuItem
          render={
            <Link href={`/dashboard/instructor/coupons?course=${course.id}`} />
          }
          className="cursor-pointer p-2"
        >
          <TicketPercentIcon />
          {courseRowMenu.coupons}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { CourseRowActions }
