"use client"

import Link from "next/link"
import {
  BarChart3Icon,
  CheckIcon,
  ChevronRightIcon,
  FileQuestionIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card } from "@/components/ui/card"
import {
  courseTotals,
  sectionProgress,
  type PlayerLesson,
  type PlayerSection,
} from "@/lib/config/course-player"
import { cn } from "@/lib/utils"

/** The circle at the head of a lesson row. Its fill *is* the lesson state —
 *  done reads green, the lesson in progress reads as the dark "playing"
 *  marker, and everything ahead stays neutral. */
function LessonMarker({ lesson }: { lesson: PlayerLesson }) {
  if (lesson.state === "done") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
        <CheckIcon className="size-4.5" strokeWidth={2.5} />
      </span>
    )
  }

  if (lesson.state === "current") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <PauseIcon className="size-4 fill-current stroke-none" />
      </span>
    )
  }

  const Icon = lesson.type === "quiz" ? FileQuestionIcon : PlayIcon
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-track text-muted-foreground">
      <Icon
        className={cn(
          "size-4",
          lesson.type === "video" && "fill-current stroke-none"
        )}
      />
    </span>
  )
}

function LessonRow({
  lesson,
  courseSlug,
}: {
  lesson: PlayerLesson
  courseSlug: string
}) {
  const className = cn(
    "flex items-center gap-3.5 px-4 py-3",
    // The lesson in progress is the one row that carries the tint; the rest
    // sit on the card so the section headers above them read as the tinted
    // layer.
    lesson.state === "current" ? "bg-soft" : "bg-card"
  )

  const body = (
    <>
      <LessonMarker lesson={lesson} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-6">{lesson.title}</span>
        <span className="block text-sm leading-5 text-muted-foreground tabular-nums">
          {lesson.meta}
        </span>
      </span>
      {/* Quizzes are the one row type that opens somewhere of its own; every
          other row is inert until there's a lesson player to open. */}
      {lesson.quizSlug ? (
        <ChevronRightIcon className="size-4.5 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  )

  if (!lesson.quizSlug) return <div className={className}>{body}</div>

  return (
    <Link
      href={`/dashboard/learning/${courseSlug}/quiz/${lesson.quizSlug}`}
      className={cn(className, "hover:bg-hover")}
    >
      {body}
    </Link>
  )
}

/**
 * "Course Completion" from `course-page__part1.png` — the syllabus re-cut as
 * progress. Structurally the sale page's `course-content-card.tsx` with the
 * same "tint every section header, keep the lesson rows on the card" rule,
 * but each header carries the section's own done-count and a mini bar, and
 * each lesson carries a state marker instead of a duration and a preview tag.
 *
 * The whole accordion sits inside one `rounded-xl` hairline box, so the
 * closed headers stack as a single tinted block with dividers between them.
 * The chevron trails here (it leads on the sale page), so `AccordionTrigger`'s
 * built-in icon is kept rather than hidden and redrawn.
 */
function CourseCompletionCard({
  sections,
  courseSlug,
}: {
  sections: PlayerSection[]
  courseSlug: string
}) {
  const totals = courseTotals(sections)
  const openSection = sections.find((section) =>
    section.lessons.some((lesson) => lesson.state === "current")
  )

  return (
    <Card className="gap-0 p-6 ring-border">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">Course Completion</h2>
        <p className="text-sm text-muted-foreground">
          {totals.sections} sections · {totals.lessons} lessons
        </p>
      </div>

      <Accordion
        multiple
        // Opens on whichever section holds the lesson in progress, so the
        // student's place is visible without a click. Falls back to the first
        // section for a course that hasn't been started.
        defaultValue={[openSection?.title ?? sections[0]?.title ?? ""]}
        className="mt-5 divide-y divide-border-subtle overflow-hidden rounded-xl ring-1 ring-border"
      >
        {sections.map((section, index) => {
          const { total, done } = sectionProgress(section)

          return (
            <AccordionItem
              key={section.title}
              value={section.title}
              className="border-none"
            >
              <AccordionTrigger className="items-center gap-3.5 rounded-none bg-soft px-4 py-3 text-left hover:no-underline">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    // The open section is the one being worked through, so it
                    // gets the same dark "playing" marker its current lesson
                    // has; the rest read as inert.
                    "bg-card text-muted-foreground ring-1 ring-border group-aria-expanded/accordion-trigger:bg-primary group-aria-expanded/accordion-trigger:text-primary-foreground group-aria-expanded/accordion-trigger:ring-0"
                  )}
                >
                  <BarChart3Icon className="size-4 group-aria-expanded/accordion-trigger:hidden" />
                  <PlayIcon className="hidden size-4 fill-current stroke-none group-aria-expanded/accordion-trigger:block" />
                </span>

                <span className="min-w-0 flex-1">
                  {/* 500 / 600, not 600 / 700 — measured off the export.
                      These are row labels inside the accordion, a step below
                      the card title above them. */}
                  <span className="block text-[13px] leading-5 font-medium text-subtle-foreground">
                    Section {index + 1}
                  </span>
                  <span className="block text-[15px] leading-6 font-semibold">
                    {section.title}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-3 text-sm font-normal text-muted-foreground">
                  <span className="tabular-nums">
                    {total} lessons · {done} done
                  </span>
                  {/* A bare div rather than `Progress`: at 56x6 with no label
                      it is a decorative restatement of the count beside it,
                      which the sibling text already announces. */}
                  <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-track sm:block">
                    <span
                      className="block h-full rounded-full bg-bar-fill"
                      style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                    />
                  </span>
                </span>
              </AccordionTrigger>

              {/* `[&_a]:no-underline` undoes `AccordionContent`'s own
                  `[&_a]:underline`, which styles anchors in the panel as prose
                  links — right for a body-copy accordion, wrong here, where
                  the only anchor is a whole quiz row. A plain `no-underline`
                  on the row can't win: the generated rule is a descendant
                  selector and outranks it. */}
              <AccordionContent className="divide-y divide-border-subtle border-t border-border-subtle p-0 [&_a]:no-underline">
                {section.lessons.map((lesson) => (
                  <LessonRow
                    key={lesson.title}
                    lesson={lesson}
                    courseSlug={courseSlug}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </Card>
  )
}

export { CourseCompletionCard }
