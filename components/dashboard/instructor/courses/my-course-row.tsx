"use client"

import {
  BookOpenTextIcon,
  ReceiptTextIcon,
  StarIcon,
  UsersRoundIcon,
} from "lucide-react"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CourseArt } from "@/components/dashboard/course-art"
import { CourseRowActions } from "@/components/dashboard/instructor/courses/course-row-actions"
import {
  formatCount,
  formatMoneyWhole,
  formatRating,
} from "@/components/dashboard/instructor/courses/courses-format"
import { courseStatusBadge } from "@/lib/config/course-status"
import { editorStepHref, FIRST_STEP } from "@/lib/config/course-editor"
import { hasBeenLive, myCoursesCopy } from "@/lib/config/instructor-courses"
import type { MyCourseRow as MyCourseRowData } from "@/lib/instructor-courses"
import { cn } from "@/lib/utils"

/**
 * One course row, from `my-courses-page.png`.
 *
 * Measured off that export at DPR 2: a **126px** card on 16px padding — so the
 * **150 x 92** thumbnail, not the type, sets the height — 18px from the art to
 * a 17px/700 title, a 20px status pill 12px past it, then a 14px meta line and
 * (on a course that is not live) a 7px progress bar, the three rows on a 12px
 * gap and the whole block vertically centred. The trailing cluster is an 85 x
 * 38 primary button 10px from a 38px `⋯` square.
 *
 * Cards stack on a **16px** gap even though the export measures 14px between
 * their hairlines: `Card`'s hairline is a `ring`, which paints outside the
 * layout box, so a 16px gap reads as 14 — the trap `wishlist-row.tsx`
 * documents from the other direction.
 *
 * Three things about what it draws:
 *
 *  - **A meta chip appears only when it has something to say.** That is what
 *    reproduces the export's two shapes without a status test: a course that
 *    has never been live has no students, no rating and no revenue, so its
 *    line collapses to the lesson count and the updated stamp exactly as
 *    drawn. See `lib/instructor-courses.ts`.
 *  - **The progress bar is the other half of that**, and it *is* status-led:
 *    the export draws it on the Draft and In-review rows and not on the
 *    Published ones, at 100% as readily as at 45%, so it is "has this course
 *    ever been live" rather than "is it finished". `hasBeenLive` is the one
 *    test both halves read.
 *  - **The primary button is two different controls wearing one slot**, and
 *    both are links now. On a course that has been live it is **Manage**, to
 *    `/dashboard/instructor/courses/[slug]` — the page `manage-course.png`
 *    draws. On one that has not it is **Continue editing**, to that course's
 *    editor, which is the surface the two `create-course-page` exports draw;
 *    it was inert until that landed. `hasBeenLive` is the one test that
 *    decides which, the same call the manage page's own read makes before it
 *    will render at all. The `⋯` beside it carries the destinations that do
 *    not depend on either.
 */
function MyCourseRow({ course }: { course: MyCourseRowData }) {
  const badge = courseStatusBadge(course.status)
  const live = hasBeenLive(course.status)

  return (
    <Card className="flex-row items-center gap-[18px] p-4 ring-border">
      <CourseArt
        thumbnailUrl={course.thumbnailUrl}
        categorySlug={course.categorySlug}
        categoryAccent={course.categoryAccent}
        className="h-23 w-[150px] shrink-0 overflow-hidden rounded-lg"
        iconClassName="size-8"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {/* `font-bold` explicitly, for the reason `CLAUDE.md` gives: the
              base rule sets card titles heavier than the dashboard exports
              draw them. */}
          <h2 className="truncate text-[17px] leading-tight font-bold">
            {course.title}
          </h2>
          <span
            className={cn(
              "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[12px] font-medium",
              badge.className
            )}
          >
            {badge.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-muted-foreground">
          <MetaChip icon={BookOpenTextIcon}>
            <span className="font-medium tabular-nums">
              {formatCount(course.lessonCount)}
            </span>
            <span>{course.lessonCount === 1 ? "lesson" : "lessons"}</span>
          </MetaChip>

          {course.students !== null ? (
            <MetaChip icon={UsersRoundIcon}>
              <span className="font-medium tabular-nums">
                {formatCount(course.students)}
              </span>
            </MetaChip>
          ) : null}

          {course.rating !== null ? (
            <MetaChip icon={StarIcon} iconClassName="fill-star text-star">
              <span className="font-medium tabular-nums">
                {formatRating(course.rating)}
              </span>
            </MetaChip>
          ) : null}

          {course.revenueCents !== null ? (
            <MetaChip icon={ReceiptTextIcon}>
              <span className="font-medium tabular-nums">
                {formatMoneyWhole(course.revenueCents)}
              </span>
            </MetaChip>
          ) : null}

          {/* `--subtle-foreground`, sampled off the export at #a1a1aa — a step
              lighter than the chips beside it, which is what makes the line
              read as "facts, then when". */}
          <span className="text-subtle-foreground">{course.updated}</span>
        </div>

        {course.builtPercent !== null ? (
          <div className="flex w-full max-w-[340px] items-center gap-3">
            <span
              role="presentation"
              className="h-[7px] min-w-0 flex-1 overflow-hidden rounded-full bg-track"
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${course.builtPercent}%` }}
              />
            </span>
            <span className="shrink-0 text-[13px] whitespace-nowrap text-muted-foreground tabular-nums">
              {myCoursesCopy.built(course.builtPercent)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {live ? (
          <Button
            nativeButton={false}
            render={
              <Link href={`/dashboard/instructor/courses/${course.slug}`} />
            }
            className="h-[38px] px-4 text-[14px]"
          >
            {myCoursesCopy.manage}
          </Button>
        ) : (
          <Button
            nativeButton={false}
            render={<Link href={editorStepHref(course.slug, FIRST_STEP)} />}
            className="h-[38px] px-4 text-[14px]"
          >
            {myCoursesCopy.continueEditing}
          </Button>
        )}
        <CourseRowActions course={course} />
      </div>
    </Card>
  )
}

/** Icon + value, on the 6px inner gap the export draws — which is wider than a
 *  space, so "25" and "lessons" are two elements rather than one string. */
function MetaChip({
  icon: Icon,
  iconClassName,
  children,
}: {
  icon: typeof BookOpenTextIcon
  iconClassName?: string
  children: React.ReactNode
}) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <Icon className={cn("size-3.5 shrink-0", iconClassName)} />
      {children}
    </span>
  )
}

export { MyCourseRow }
