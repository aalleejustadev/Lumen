"use client"

import {
  BookOpenTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileQuestionIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import {
  DragHandle,
  LessonRow,
} from "@/components/dashboard/instructor/courses/edit/lesson-row"
import { EditableText } from "@/components/dashboard/instructor/courses/edit/editable-text"
import { RowButton } from "@/components/dashboard/instructor/courses/edit/row-button"
import {
  curriculumCopy,
  LESSON_KINDS,
  type LessonKind,
} from "@/lib/config/course-editor"
import type { EditorSection } from "@/lib/instructor-course-edit"
import { cn } from "@/lib/utils"

const ADD_ICON = {
  VIDEO: PlayIcon,
  ARTICLE: BookOpenTextIcon,
  QUIZ: FileQuestionIcon,
} as const

/**
 * One section, from `create-course-page__curriculum.png`: a white card holding
 * a header row, its lesson rows, and the three "add a lesson" buttons.
 *
 * Measured off that export at DPR 2: a `rounded-xl` card on 18px padding, a
 * header of a drag handle, a **"Section N" pill** (`--hover`, 13px), the
 * editable title at 18px/700, then the lesson count and the row's own
 * controls; lesson rows on a 10px gap beneath it, and a footer of three 40px
 * outline buttons on a 10px gap.
 *
 * **The "Section N" pill is a position, not a name.** It is rendered from the
 * card's index rather than stored, so reordering renumbers the whole list for
 * free and no column can drift out of step with the order beside it — the
 * reading `seedCourseQuestions` records about `CourseLesson.order` being
 * 0-based and the label being `order + 1`.
 */
function SectionCard({
  section,
  index,
  first,
  last,
  settling,
  isTemp,
  courseSlug,
  onRename,
  onDelete,
  onMove,
  onAddLesson,
  onLessonRename,
  onLessonMeta,
  onLessonPreview,
  onLessonVideo,
  onLessonMove,
  onLessonDelete,
  drag,
}: {
  courseSlug: string
  section: EditorSection
  index: number
  first: boolean
  last: boolean
  /** This section has not been written yet — see `curriculum-board.tsx`. */
  settling: boolean
  /** Whether a lesson id is still a placeholder. */
  isTemp: (id: string) => boolean
  onRename: (title: string) => Promise<boolean>
  onDelete: () => void
  onMove: (to: number) => void
  onAddLesson: (kind: LessonKind) => void
  onLessonRename: (lessonId: string, title: string) => Promise<boolean>
  onLessonMeta: (lessonId: string, value: number | null) => Promise<boolean>
  onLessonPreview: (lessonId: string, next: boolean) => void
  onLessonVideo: (lessonId: string) => void
  onLessonMove: (lessonId: string, to: number) => void
  onLessonDelete: (lessonId: string) => void
  drag: {
    sectionDragging: boolean
    lessonDragging: string | null
    onSectionDragStart: () => void
    onSectionDragOver: () => void
    onSectionDrop: () => void
    onLessonDragStart: (lessonId: string) => void
    onLessonDragOver: (lessonId: string) => void
    onLessonDrop: () => void
  }
}) {
  return (
    <Card
      data-section=""
      // `dragstart` bubbles, so a lesson's own drag would otherwise reach this
      // card and start a *section* drag on top of it — `stopPropagation` in
      // the lesson row is half of that, and this handler firing only for its
      // own element is the other.
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", section.id)
        drag.onSectionDragStart()
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        drag.onSectionDragOver()
      }}
      onDrop={(event) => {
        event.preventDefault()
        drag.onSectionDrop()
      }}
      // Disarmed here for `lesson-row.tsx`' reason. It also fires for a lesson
      // drag bubbling out of this card, which is harmless: the board's handler
      // returns early when no section is in flight.
      onDragEnd={(event) => {
        event.currentTarget.draggable = false
        drag.onSectionDrop()
      }}
      className={cn(
        "gap-0 p-4.5 ring-border transition-opacity",
        drag.sectionDragging && "opacity-40"
      )}
    >
      <div className="flex items-center gap-3">
        <DragHandle disabled={settling} />
        <span className="inline-flex h-[26px] shrink-0 items-center rounded-md bg-hover px-2.5 text-[13px] font-medium text-muted-foreground">
          {curriculumCopy.sectionLabel(index)}
        </span>
        <span className="min-w-0 flex-1">
          <EditableText
            value={section.title}
            onCommit={onRename}
            disabled={settling}
            ariaLabel="Section title"
            placeholder={curriculumCopy.sectionTitlePlaceholder}
            className="text-[18px] font-bold"
          />
        </span>
        <span className="hidden shrink-0 text-[14px] text-muted-foreground sm:block">
          {curriculumCopy.lessonCount(section.lessons.length)}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <RowButton
            label={curriculumCopy.moveUp}
            disabled={first}
            onClick={() => onMove(index - 1)}
          >
            <ChevronUpIcon className="size-4" />
          </RowButton>
          <RowButton
            label={curriculumCopy.moveDown}
            disabled={last}
            onClick={() => onMove(index + 1)}
          >
            <ChevronDownIcon className="size-4" />
          </RowButton>
          <RowButton
            label={curriculumCopy.removeSection}
            disabled={settling}
            onClick={onDelete}
            destructive
          >
            <Trash2Icon className="size-4" />
          </RowButton>
        </span>
      </div>

      {section.lessons.length > 0 ? (
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {section.lessons.map((lesson, lessonIndex) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              index={lessonIndex}
              sectionIndex={index}
              first={lessonIndex === 0}
              last={lessonIndex === section.lessons.length - 1}
              settling={isTemp(lesson.id)}
              dragging={drag.lessonDragging === lesson.id}
              onRename={(title) => onLessonRename(lesson.id, title)}
              onMeta={(value) => onLessonMeta(lesson.id, value)}
              courseSlug={courseSlug}
              onPreview={(next) => onLessonPreview(lesson.id, next)}
              onVideo={() => onLessonVideo(lesson.id)}
              onMove={(to) => onLessonMove(lesson.id, to)}
              onDelete={() => onLessonDelete(lesson.id)}
              onDragStart={() => drag.onLessonDragStart(lesson.id)}
              onDragOver={() => drag.onLessonDragOver(lesson.id)}
              onDrop={drag.onLessonDrop}
            />
          ))}
        </ul>
      ) : null}

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        {LESSON_KINDS.map((kind) => {
          const Icon = ADD_ICON[kind]
          return (
            <button
              key={kind}
              type="button"
              disabled={settling}
              onClick={() => onAddLesson(kind)}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-card px-3.5 text-[14px] font-medium ring-1 ring-border transition-colors outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon className="size-4" />
              {curriculumCopy.addLesson[kind]}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

export { SectionCard }
