import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { CourseCompletionCard } from "@/components/dashboard/learning/course/course-completion-card"
import { CourseInstructorBar } from "@/components/dashboard/learning/course/course-instructor-bar"
import { CourseTabs } from "@/components/dashboard/learning/course/course-tabs"
import { CourseVideoPlayer } from "@/components/dashboard/learning/course/course-video-player"
import { StudyProgressCard } from "@/components/dashboard/learning/course/study-progress-card"
import type { CoursePlayerCourse } from "@/lib/config/course-player"
import type { learningReturnLink } from "@/lib/course-return"

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
 *
 * **The back link is a prop, not a constant.** This page has two kinds of
 * visitor — a student who bought the course, and an instructor who pressed
 * *Preview as student* on its manage page — and the route resolves which,
 * because only the server can check that an instructor really owns the course
 * before offering a link into their own shell. See `lib/course-return.ts`.
 */
function CoursePage({
  course,
  backLink,
  via,
}: {
  course: CoursePlayerCourse
  backLink: ReturnType<typeof learningReturnLink>
  /** The origin, carried through to the quiz rows so the chain survives one
   *  level down — see `learningCourseHref`. */
  via?: string
}) {
  const currentLesson =
    course.sections
      .flatMap((section) => section.lessons)
      .find((lesson) => lesson.state === "current")?.title ?? course.title

  return (
    <div>
      <Link
        href={backLink.href}
        className="flex w-fit items-center gap-2.5 text-[15px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4.5" />
        {backLink.label}
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
            via={via}
          />
        </div>
      </div>
    </div>
  )
}

export { CoursePage }
