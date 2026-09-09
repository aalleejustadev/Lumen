import Link from "next/link"
import {
  ArrowLeftIcon,
  CheckIcon,
  FileQuestionIcon,
  PlayIcon,
  XIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { CourseArt } from "@/components/dashboard/admin/courses/course-art"
import { CourseReviewActions } from "@/components/dashboard/admin/courses/course-review-actions"
import {
  formatSubmittedAt,
  formatSubmittedExact,
} from "@/components/dashboard/admin/courses/courses-format"
import {
  awaitsDecision,
  changeReasonLabels,
  courseStatusBadge,
  courseViewCopy,
} from "@/lib/config/admin-courses"
import type { CourseReview } from "@/lib/admin/courses"
import type { ChangeReason } from "@/lib/generated/prisma/client"
import { cn } from "@/lib/utils"

/**
 * `/dashboard/admin/courses/[slug]`, from
 * `ui-design/light/dashboard/admin/course-view-page__admin.png` — where the
 * queue's **View** goes.
 *
 * Measured off that export at DPR 2: "Back to courses" above an **880px**
 * card, left aligned rather than centred or full width, whose 4:1 banner is
 * full-bleed and whose content sits on 26px padding. A 24px/700 title with the
 * status pill beside it, 16px/700 section headings, 48px checklist rows on a
 * 10px gap, 40px curriculum rows on an 8px gap, and 44px decision buttons.
 *
 * The card zeroes `--card-spacing` rather than reaching for `py-0 gap-0`,
 * because the banner is full-bleed and the content below owns its own padding
 * — the arrangement `settings-billing.tsx` documents, along with why a plain
 * override leaves both declarations standing.
 *
 * Three things the export could not draw, because it only draws one course:
 *
 *  - **The decision strip appears only for a course awaiting review.** The
 *    export's course is `In review`; a published or rejected one has nothing
 *    left to decide, and three live buttons on it would invite an admin to
 *    silently overwrite a colleague's decision. (`approveCourse` and friends
 *    refuse it server-side too — the buttons being hidden is not the guard.)
 *  - **A course that has been sent back or turned down shows why.** The note
 *    and the reasons are already stored on the submission and are the first
 *    thing anyone reopening the page wants; without them the page would forget
 *    its own history the moment a decision was made.
 *  - **Both lists have empty states.** A course with no submission has no
 *    checklist to show, and saying so is better than four blank rows.
 */
function CourseReviewPage({ course }: { course: CourseReview }) {
  const badge = courseStatusBadge(course.status)
  const submitted = formatSubmittedAt(course.submittedAt, course.generatedAt)

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <Link
        href="/dashboard/admin/courses"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {courseViewCopy.back}
      </Link>

      <Card className="mt-4 w-full max-w-[880px] gap-0 overflow-hidden ring-border [--card-spacing:0px]">
        <CourseArt
          thumbnailUrl={course.thumbnailUrl}
          categorySlug={course.categorySlug}
          categoryAccent={course.categoryAccent}
          className="aspect-[4/1] w-full"
          iconClassName="size-14"
        />

        <div className="p-6.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{course.title}</h1>
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
            <span>By {course.instructorName}</span>
            <span>
              {course.lessonCount}{" "}
              {course.lessonCount === 1 ? "lesson" : "lessons"}
            </span>
            {submitted ? (
              <span
                className="text-subtle-foreground"
                title={
                  course.submittedAt
                    ? formatSubmittedExact(course.submittedAt)
                    : undefined
                }
              >
                {submitted}
              </span>
            ) : null}
          </p>

          <LastDecision course={course} />

          <h2 className="mt-7 text-base font-bold">
            {courseViewCopy.checklistHeading}
          </h2>
          {course.checks.length === 0 ? (
            <p className="mt-3.5 text-[15px] text-muted-foreground">
              {courseViewCopy.checklistEmpty}
            </p>
          ) : (
            <ul className="mt-3.5 flex flex-col gap-2.5">
              {course.checks.map((check) => (
                <li
                  key={check.key}
                  className="flex h-12 items-center gap-3.5 rounded-lg bg-background px-3.5"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5.5 shrink-0 place-items-center rounded-full text-white",
                      check.passed ? "bg-success" : "bg-destructive"
                    )}
                  >
                    {check.passed ? (
                      <CheckIcon className="size-3.5 stroke-[3]" />
                    ) : (
                      <XIcon className="size-3.5 stroke-[3]" />
                    )}
                  </span>
                  <span className="text-[15px]">{check.label}</span>
                  <span className="sr-only">
                    {check.passed ? "Passed" : "Failed"}
                    {check.automated ? "" : " — checked by a reviewer"}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-7 text-base font-bold">
            {courseViewCopy.curriculumHeading}
          </h2>
          {course.curriculum.length === 0 ? (
            <p className="mt-3.5 text-[15px] text-muted-foreground">
              {courseViewCopy.curriculumEmpty}
            </p>
          ) : (
            <ul className="mt-3.5 flex flex-col gap-2">
              {course.curriculum.map((lesson) => {
                const Icon =
                  lesson.type === "QUIZ" ? FileQuestionIcon : PlayIcon
                return (
                  <li
                    key={lesson.id}
                    className="flex h-14 items-center gap-3.5 rounded-lg border border-border px-3.5"
                  >
                    <Icon
                      aria-hidden
                      className="size-4 shrink-0 text-subtle-foreground"
                    />
                    <span className="min-w-0 flex-1 truncate text-[15px]">
                      {lesson.title}
                    </span>
                    {/* A lesson carries a duration or a question count, never
                        both — `CourseLesson`'s own note — which is what picks
                        the trailing text. */}
                    <span className="shrink-0 text-[13px] text-subtle-foreground tabular-nums">
                      {lesson.questionsCount !== null
                        ? `${lesson.questionsCount} questions`
                        : lesson.durationMinutes !== null
                          ? `${lesson.durationMinutes} min`
                          : ""}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          {awaitsDecision(course.status) ? (
            <CourseReviewActions
              courseId={course.id}
              courseTitle={course.title}
              instructorName={course.instructorName}
            />
          ) : null}
        </div>
      </Card>
    </main>
  )
}

/**
 * Why a course was sent back or turned down. Nothing in the export draws it,
 * because the export's course is still in review — but the reasons and the
 * note are already on the submission, and a page that showed a "Needs changes"
 * pill without saying what needs changing would be asking the reader to go and
 * find out somewhere else.
 */
function LastDecision({ course }: { course: CourseReview }) {
  const decision = course.lastDecision
  if (!decision || decision.decision === "APPROVED") return null
  if (!decision.noteToInstructor && decision.changeReasons.length === 0) {
    return null
  }

  return (
    <div className="mt-5 rounded-xl border border-border bg-background p-4">
      <p className="text-[13px] font-semibold text-subtle-foreground uppercase">
        {courseViewCopy.decisionHeading} ·{" "}
        {courseViewCopy.decisionLabels[decision.decision] ?? decision.decision}
      </p>

      {decision.changeReasons.length > 0 ? (
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {decision.changeReasons.map((reason) => (
            <li
              key={reason}
              className="rounded-full bg-warning/10 px-2.5 py-0.5 text-[13px] font-medium text-warning"
            >
              {changeReasonLabels[reason as ChangeReason] ?? reason}
            </li>
          ))}
        </ul>
      ) : null}

      {decision.noteToInstructor ? (
        <p className="mt-2.5 text-[15px] leading-6">
          {decision.noteToInstructor}
        </p>
      ) : null}
    </div>
  )
}

export { CourseReviewPage }
