import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { CourseCompletionCard } from "@/components/dashboard/learning/course/course-completion-card"
import { CourseInstructorBar } from "@/components/dashboard/learning/course/course-instructor-bar"
import { CourseTabs } from "@/components/dashboard/learning/course/course-tabs"
import { CourseVideoPlayer } from "@/components/dashboard/learning/course/course-video-player"
import { StudyProgressCard } from "@/components/dashboard/learning/course/study-progress-card"
import type { CoursePlayerCourse } from "@/lib/config/course-player"

/**
 * `/dashboard/learning/[slug]` — the enrolled course page, from
 * `course-page__part{1,2}.png`. This is where "Continue" on
 * `/dashboard/learning` lands; `/dashboard/courses/[slug]` is the sale page
 * for students who haven't bought yet.
 *
 * Two columns, measured off the export at DPR 2: an 892px left column (the
 * title, player, instructor strip and tabs) and a 576px right one (progress and
 * the completion accordion) with a 24px gutter — a much heavier sidebar than
 * the sale page's 348px purchase card, because the syllabus lives there
 * rather than in the main column. Below `xl` the right column pulls in, and
 * below `lg` the two stack.
 *
 * Neither column sticks: the export shows both scrolling together, and the
 * right column is tall enough here that pinning it would trap the syllabus
 * mid-scroll on shorter viewports.
 */
function CoursePage({ course }: { course: CoursePlayerCourse }) {
  const currentLesson =
    course.sections
      .flatMap((section) => section.lessons)
      .find((lesson) => lesson.state === "current")?.title ?? course.title

  return (
    <div>
      <Link
        href="/dashboard/learning"
        className="flex w-fit items-center gap-2.5 text-[15px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4.5" />
        Back to courses
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start xl:grid-cols-[minmax(0,1fr)_576px]">
        <div className="flex min-w-0 flex-col gap-4.5">
          {/* The title lives *inside* the left column, not above the grid:
              the export's right column starts level with it rather than
              below it, so hoisting the h1 out would push the whole sidebar
              down by its height. */}
          <h1 className="text-[32px] leading-tight font-bold">
            {course.title}
          </h1>
          <CourseVideoPlayer art={course.art} lessonTitle={currentLesson} />
          <CourseInstructorBar
            instructor={course.instructor}
            courseSlug={course.slug}
          />
          <CourseTabs course={course} />
        </div>

        <div className="flex flex-col gap-6">
          <StudyProgressCard
            progress={course.progress}
            encouragement={course.encouragement}
          />
          <CourseCompletionCard
            sections={course.sections}
            courseSlug={course.slug}
          />
        </div>
      </div>
    </div>
  )
}

export { CoursePage }
