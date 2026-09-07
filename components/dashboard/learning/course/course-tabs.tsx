"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CourseNotesTab } from "@/components/dashboard/learning/course/course-notes-tab"
import { CourseOverviewTab } from "@/components/dashboard/learning/course/course-overview-tab"
import { CourseQaTab } from "@/components/dashboard/learning/course/course-qa-tab"
import { CourseReviewsTab } from "@/components/dashboard/learning/course/course-reviews-tab"
import type { CoursePlayerCourse } from "@/lib/config/course-player"

/**
 * The Overview / Q&A / Reviews / Notes switch under the instructor strip,
 * from `course-page__part1.png` and the three tab exports.
 *
 * The list is a bigger, rounder version of the generated `TabsList` — the
 * default is a 32px `bg-muted` strip, the export draws a 44px `bg-track` one
 * with a white pill — so the sizing is overridden here rather than in
 * `components/ui/tabs.tsx`, which the shadcn CLI can overwrite.
 *
 * Overview alone renders without a card: the export puts it straight on the
 * page background while the other three sit on `bg-card` panels. That's the
 * distinction between the page's own body copy and a pane you switched to,
 * so the panels own their cards rather than this component wrapping them all.
 */
function CourseTabs({ course }: { course: CoursePlayerCourse }) {
  return (
    <Tabs defaultValue="overview" className="gap-5">
      {/* The two `!`s are load-bearing. `cn()`'s tailwind-merge settles the
          plain overrides below (`p-1` over `p-[3px]`, `rounded-lg` over
          `rounded-md`, `flex-none` over `flex-1`) by dropping the generated
          class outright — but only when both carry the same variant prefix.
          `TabsList`'s height is `group-data-horizontal/tabs:h-8` and
          `TabsTrigger`'s active fill is `dark:data-active:bg-input/30`; those
          survive the merge and then outrank a plain `h-11` /
          `data-active:bg-card` on specificity regardless of source order —
          the same trap `Avatar` and `PaginationLink` sprang elsewhere. */}
      <TabsList className="h-11! w-fit rounded-xl bg-track p-1">
        {[
          ["overview", "Overview"],
          ["qa", "Q&A"],
          ["reviews", "Reviews"],
          ["notes", "Notes"],
        ].map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value}
            // `flex-none`: the generated trigger is `flex-1`, which would size
            // all four pills to the widest label. The export sizes each to its
            // own.
            className="h-full flex-none rounded-lg px-4 text-[15px] font-medium data-active:bg-card! data-active:font-semibold"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview">
        <CourseOverviewTab about={course.about} />
      </TabsContent>

      <TabsContent value="qa">
        <CourseQaTab
          questions={course.questions}
          instructorFirstName={course.instructor.name.split(" ")[0] ?? "us"}
        />
      </TabsContent>

      <TabsContent value="reviews">
        <CourseReviewsTab
          rating={course.rating}
          reviewsCount={course.reviewsCount}
          reviews={course.reviews}
        />
      </TabsContent>

      <TabsContent value="notes">
        <CourseNotesTab notes={course.notes} />
      </TabsContent>
    </Tabs>
  )
}

export { CourseTabs }
