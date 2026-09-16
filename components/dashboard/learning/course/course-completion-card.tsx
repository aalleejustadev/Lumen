"use client"

import * as React from "react"
import Link from "next/link"
import {
  BarChart3Icon,
  BookOpenTextIcon,
  CheckIcon,
  ChevronRightIcon,
  FileQuestionIcon,
  LockIcon,
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

  const Icon =
    lesson.type === "quiz"
      ? FileQuestionIcon
      : lesson.type === "article"
        ? BookOpenTextIcon
        : PlayIcon
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
  via,
  selected,
  showPreviewTag,
}: {
  lesson: PlayerLesson
  courseSlug: string
  via?: string
  /** The lesson on screen, on a database course. */
  selected: boolean
  /** Whether to mark free-preview rows — only for a viewer who is not
   *  enrolled, for whom "Preview" is the difference between a row they can
   *  open and one they cannot. */
  showPreviewTag: boolean
}) {
  const className = cn(
    "flex items-center gap-3.5 px-4 py-3",
    // One row carries the tint and the rest sit on the card, so the section
    // headers above them read as the tinted layer. On a database course that
    // row is the lesson on screen; on a catalog course, which has no lesson
    // to open, it is the lesson in progress, as the export draws.
    (lesson.id ? selected : lesson.state === "current") ? "bg-soft" : "bg-card"
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
      {showPreviewTag && lesson.preview && !lesson.locked ? (
        <span className="shrink-0 text-sm font-medium text-info">Preview</span>
      ) : null}
      {lesson.locked ? (
        <LockIcon className="size-4 shrink-0 text-muted-foreground" />
      ) : lesson.id || lesson.quizSlug ? (
        <ChevronRightIcon className="size-4.5 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  )

  // A database lesson opens on this page, locked or not — a locked one shows
  // why, which beats a row that silently does nothing. `scroll={false}` keeps
  // the syllabus where it is; the lesson appears at the top of the column.
  if (lesson.id) {
    return (
      <Link
        href={`/dashboard/learning/${courseSlug}?lesson=${lesson.id}${via ? `&via=${via}` : ""}`}
        aria-current={selected ? "true" : undefined}
        scroll={false}
        className={cn(className, !selected && "hover:bg-hover")}
      >
        {body}
      </Link>
    )
  }

  // Catalog lessons have no content; only their quizzes open anywhere.
  if (!lesson.quizSlug) return <div className={className}>{body}</div>

  return (
    <Link
      href={`/dashboard/learning/${courseSlug}/quiz/${lesson.quizSlug}${via ? `?via=${via}` : ""}`}
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
  via,
  selectedLessonId,
  showPreviewTags = false,
}: {
  sections: PlayerSection[]
  courseSlug: string
  /** The lesson on screen, on a database course. */
  selectedLessonId?: string
  showPreviewTags?: boolean
  /** Where the visitor came from, carried onto the quiz rows so an instructor
   *  previewing does not lose that fact by opening one — see
   *  `lib/course-return.ts`. */
  via?: string
}) {
  const totals = courseTotals(sections)
  // Opens on the section holding the lesson on screen, or failing that the
  // lesson in progress, or the first. Sections are keyed by position rather
  // than title: two can share a title ("Untitled section") in a course being
  // built.
  const holding = (match: (lesson: PlayerLesson) => boolean) =>
    sections.findIndex((section) => section.lessons.some(match))
  const selectedIndex = selectedLessonId
    ? holding((lesson) => lesson.id === selectedLessonId)
    : -1
  const currentIndex = holding((lesson) => lesson.state === "current")
  const initial =
    selectedIndex !== -1 ? selectedIndex : Math.max(0, currentIndex)

  // **Controlled**, because the lesson on screen changes without this card
  // remounting (a row is a same-page link), and an uncontrolled Accordion's
  // default cannot move after mount — Base UI warns that it tried. Each newly
  // selected lesson's section is *added* to what is open, adjusted during
  // render, so a section the learner opened by hand is never snapped shut.
  const [open, setOpen] = React.useState<string[]>([`section-${initial}`])
  const [seenLesson, setSeenLesson] = React.useState(selectedLessonId)
  if (selectedLessonId !== seenLesson) {
    setSeenLesson(selectedLessonId)
    const key = `section-${selectedIndex}`
    if (selectedIndex !== -1 && !open.includes(key)) setOpen([...open, key])
  }

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
        value={open}
        onValueChange={(next) => setOpen(next as string[])}
        className="mt-5 divide-y divide-border-subtle overflow-hidden rounded-xl ring-1 ring-border"
      >
        {sections.map((section, index) => {
          const { total, done } = sectionProgress(section)

          return (
            <AccordionItem
              key={`section-${index}`}
              value={`section-${index}`}
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
                {section.lessons.map((lesson, lessonIndex) => (
                  <LessonRow
                    // Not the title alone: two new lessons can share one.
                    key={lesson.id ?? `${lessonIndex}-${lesson.title}`}
                    lesson={lesson}
                    courseSlug={courseSlug}
                    via={via}
                    selected={
                      lesson.id !== undefined && lesson.id === selectedLessonId
                    }
                    showPreviewTag={showPreviewTags}
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
