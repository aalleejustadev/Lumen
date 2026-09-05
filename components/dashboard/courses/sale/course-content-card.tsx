"use client"

import {
  BarChart3Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileQuestionIcon,
  FileTextIcon,
  PlayIcon,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card } from "@/components/ui/card"
import type { CourseLesson, CourseSection } from "@/lib/config/course-details"

const lessonIcons: Record<CourseLesson["type"], typeof PlayIcon> = {
  video: PlayIcon,
  article: FileTextIcon,
  quiz: FileQuestionIcon,
  practice: BarChart3Icon,
}

function LessonRow({ lesson }: { lesson: CourseLesson }) {
  const Icon = lessonIcons[lesson.type]

  return (
    <div className="flex items-center justify-between gap-3 bg-card py-2.5 pr-4 pl-10 text-sm hover:bg-hover">
      <span className="flex items-center gap-3">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        {lesson.title}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {lesson.preview ? (
          <span className="text-sm font-medium text-info">Preview</span>
        ) : null}
        <span className="text-muted-foreground tabular-nums">
          {lesson.type === "quiz"
            ? `${lesson.questions} questions`
            : `${lesson.minutes} min`}
        </span>
      </span>
    </div>
  )
}

/**
 * The accordion from `course-sale-page-part-1.png`. Every section *header*
 * carries the `bg-soft` tint — open or closed, it's unconditional on
 * `AccordionTrigger` — while the lesson rows underneath an open section stay
 * white with hairline dividers between them (`divide-y` on the content
 * wrapper). Adjacent closed headers sit flush with no divider between them —
 * same color, so there's nothing to draw. The chevron sits before the title
 * rather than trailing, so the built-in one (always trailing) is hidden and
 * redrawn as a regular child instead, reusing the same
 * `group-aria-expanded/accordion-trigger:` swap it uses internally.
 */
function CourseContentCard({
  sections,
  contentSummary,
}: {
  sections: CourseSection[]
  contentSummary: string
}) {
  return (
    <Card className="gap-0 p-6.5 ring-border">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">Course content</h2>
        <p className="text-sm text-muted-foreground">{contentSummary}</p>
      </div>

      <Accordion
        multiple
        defaultValue={sections[0] ? [sections[0].title] : []}
        className="mt-5 overflow-hidden rounded-lg"
      >
        {sections.map((section) => (
          <AccordionItem
            key={section.title}
            value={section.title}
            className="border-none"
          >
            <AccordionTrigger className="rounded-none bg-soft px-4 py-3.5 hover:no-underline **:data-[slot=accordion-trigger-icon]:hidden">
              <span className="flex items-center gap-2.5">
                <ChevronDownIcon className="size-4 text-muted-foreground group-aria-expanded/accordion-trigger:hidden" />
                <ChevronUpIcon className="hidden size-4 text-muted-foreground group-aria-expanded/accordion-trigger:inline" />
                <span className="font-semibold">{section.title}</span>
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {section.lessonsLabel} · {section.durationLabel}
              </span>
            </AccordionTrigger>
            <AccordionContent className="divide-y divide-border-subtle p-0">
              {section.lessons.map((lesson, index) => (
                <LessonRow key={`${lesson.title}-${index}`} lesson={lesson} />
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  )
}

export { CourseContentCard }
