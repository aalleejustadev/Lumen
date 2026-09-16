"use client"

import Link from "next/link"
import {
  BookOpenTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  FileQuestionIcon,
  GripVerticalIcon,
  PencilLineIcon,
  PlayIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { EditableText } from "@/components/dashboard/instructor/courses/edit/editable-text"
import { RowButton } from "@/components/dashboard/instructor/courses/edit/row-button"
import {
  curriculumCopy,
  editorArticleHref,
  editorQuizHref,
  lessonKindTone,
  type LessonKind,
} from "@/lib/config/course-editor"
import type { EditorLesson } from "@/lib/instructor-course-edit"
import { cn } from "@/lib/utils"

const KIND_ICON = {
  VIDEO: PlayIcon,
  ARTICLE: BookOpenTextIcon,
  QUIZ: FileQuestionIcon,
} as const

/**
 * One lesson, from `create-course-page__curriculum.png`.
 *
 * Measured off that export at DPR 2: a **56px** row filled with `--background`
 * on a white card — the trick `settings-controls.ts` records, where the page
 * colour is what separates a control from the card it sits on — `rounded-lg`,
 * a drag handle, the "1.1" index, a 34px tinted type tile, the title, then a
 * type pill, the meta, and the row's own controls at the trailing edge.
 *
 * Three things about what it draws:
 *
 *  - **The trailing slot is the type's own.** Video and article rows carry the
 *    free-**Preview** switch; a quiz carries **Edit quiz** instead, which is
 *    what the export draws and what `updateLesson` enforces server-side — a
 *    quiz is never a free sample of the course.
 *  - **Every row carries the way into its own content**, and it is the one
 *    control on the row that never hides: **Upload video** opens
 *    `lesson-video-dialog.tsx`, **Edit article** and **Edit quiz** go to their
 *    editors. Below 1400px the label collapses to its icon (with the label
 *    kept for assistive tech and as a `title`), because the row is already
 *    measured to the pixel and a title squeezed to nothing is worse than a
 *    glyph. A video row that has one swaps to a green tick and "Edit video".
 *  - **A quiz's question count is not editable**: it is the number of
 *    questions written in the quiz editor, which sets it on save. A count
 *    typed by hand could only disagree with the quiz behind it. A video's
 *    and an article's lengths stay editable, but are overwritten by the
 *    upload and by saving the article, which know the real figure.
 *  - **The meta is editable and the export's is not.** "04:12" cannot be
 *    stored — `CourseLesson.durationMinutes` is an `Int` — so the row writes
 *    minutes, and it writes them through the same borderless field the title
 *    uses, because a length nobody can set leaves every new lesson at zero and
 *    the course's own "N hours" wrong. See `curriculumCopy.meta`.
 */
function LessonRow({
  lesson,
  index,
  sectionIndex,
  first,
  last,
  courseSlug,
  onRename,
  onMeta,
  onPreview,
  onVideo,
  onMove,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  dragging,
  settling,
}: {
  lesson: EditorLesson
  index: number
  sectionIndex: number
  first: boolean
  last: boolean
  courseSlug: string
  onRename: (title: string) => Promise<boolean>
  onMeta: (value: number | null) => Promise<boolean>
  onPreview: (next: boolean) => void
  /** Opens the video dialog for this row. */
  onVideo: () => void
  onMove: (to: number) => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: () => void
  onDrop: () => void
  dragging: boolean
  /** A row the server has not written yet — its id addresses no lesson, so the
   *  inline fields stay read-only for the moment it takes to settle. */
  settling: boolean
}) {
  const tone = lessonKindTone[lesson.kind]
  const Icon = KIND_ICON[lesson.kind]
  const isQuiz = lesson.kind === "QUIZ"
  const metaValue = isQuiz ? lesson.questionsCount : lesson.durationMinutes

  return (
    <li
      // **`onDragStart` belongs on the element that carries `draggable`, not
      // on the handle inside it.** `dragstart` fires on the drag source and
      // bubbles *up*; a handler on the grip therefore never ran, which is why
      // the first pass drew a handle that did nothing.
      onDragStart={(event) => {
        event.stopPropagation()
        // Firefox refuses to start a drag without payload, and `effectAllowed`
        // is what makes the cursor say "move" rather than "copy".
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", lesson.id)
        onDragStart()
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        onDragOver()
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onDrop()
      }}
      // `draggable` is disarmed here, not only armed on the handle: a row left
      // draggable after one drag swallows text selection in its own inline
      // fields for the rest of the session.
      onDragEnd={(event) => {
        event.currentTarget.draggable = false
        onDrop()
      }}
      className={cn(
        "flex h-14 items-center gap-3 rounded-lg bg-background px-3 transition-opacity",
        dragging && "opacity-40"
      )}
    >
      <DragHandle disabled={settling} />

      <span className="w-8 shrink-0 text-[13px] text-subtle-foreground tabular-nums">
        {sectionIndex + 1}.{index + 1}
      </span>

      <span
        className={cn(
          "grid size-[34px] shrink-0 place-items-center rounded-lg",
          tone.tile
        )}
      >
        <Icon className="size-[18px]" />
      </span>

      <span className="min-w-0 flex-1">
        <EditableText
          value={lesson.title}
          onCommit={onRename}
          disabled={settling}
          ariaLabel="Lesson title"
          placeholder={curriculumCopy.lessonTitlePlaceholder}
          className="text-[15px]"
        />
      </span>

      <span
        className={cn(
          "hidden h-[22px] shrink-0 items-center rounded-full px-2.5 text-[12px] font-medium sm:inline-flex",
          tone.pill
        )}
      >
        {tone.label}
      </span>

      <span className="hidden w-[104px] shrink-0 md:block">
        {isQuiz ? (
          <span className="block px-1.5 py-1 text-right text-[13px] text-muted-foreground tabular-nums">
            {curriculumCopy.meta.QUIZ(metaValue)}
          </span>
        ) : (
          <EditableText
            value={metaValue === null ? "" : String(metaValue)}
            onCommit={(next) => {
              const trimmed = next.trim()
              if (trimmed === "") return onMeta(null)
              const parsed = Number.parseInt(trimmed, 10)
              return Number.isNaN(parsed) ? false : onMeta(parsed)
            }}
            disabled={settling}
            inputMode="numeric"
            ariaLabel={isQuiz ? "Questions" : "Length in minutes"}
            placeholder={curriculumCopy.meta[lesson.kind](null)}
            className="text-right text-[13px] text-muted-foreground tabular-nums"
          />
        )}
      </span>

      {lesson.kind === "VIDEO" ? (
        <ContentButton
          label={
            lesson.video ? curriculumCopy.editVideo : curriculumCopy.uploadVideo
          }
          icon={
            lesson.video ? (
              <CircleCheckIcon className="size-3.5 text-success" />
            ) : (
              <UploadIcon className="size-3.5" />
            )
          }
          settling={settling}
          onClick={onVideo}
        />
      ) : (
        <ContentButton
          label={isQuiz ? curriculumCopy.editQuiz : curriculumCopy.editArticle}
          icon={
            isQuiz ? (
              <FileQuestionIcon className="size-3.5" />
            ) : lesson.hasArticle ? (
              <CircleCheckIcon className="size-3.5 text-success" />
            ) : (
              <PencilLineIcon className="size-3.5" />
            )
          }
          settling={settling}
          href={
            isQuiz
              ? editorQuizHref(courseSlug, lesson.id)
              : editorArticleHref(courseSlug, lesson.id)
          }
        />
      )}

      {isQuiz ? null : (
        <span className="hidden shrink-0 items-center gap-2 lg:inline-flex">
          <span className="text-[13px] text-muted-foreground">
            {curriculumCopy.preview}
          </span>
          <Switch
            checked={lesson.isPreview}
            disabled={settling}
            onCheckedChange={onPreview}
            aria-label={`${curriculumCopy.preview} — ${lesson.title}`}
          />
        </span>
      )}

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
          label={curriculumCopy.removeLesson}
          disabled={settling}
          onClick={onDelete}
          destructive
        >
          <Trash2Icon className="size-4" />
        </RowButton>
      </span>
    </li>
  )
}

/**
 * The row's way into its content — a link to an editor, or a button that opens
 * the video dialog. Drawn at the export's "Edit quiz" size (32px, 13px, the
 * row's own hairline) so the three kinds line up down the column.
 *
 * **A row that is still settling renders it disabled**, not as a link: its id
 * is a placeholder until the server answers, and an editor opened on it would
 * be a 404.
 */
function ContentButton({
  label,
  icon,
  settling,
  href,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  settling: boolean
  href?: string
  onClick?: () => void
}) {
  const className = cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-card px-2 text-[13px] font-medium whitespace-nowrap ring-1 ring-border transition-colors outline-none min-[1400px]:px-2.5",
    "hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50",
    settling && "cursor-not-allowed opacity-60 hover:bg-card"
  )
  const content = (
    <>
      {icon}
      <span className="sr-only min-[1400px]:not-sr-only">{label}</span>
    </>
  )

  if (settling) {
    return (
      <button
        type="button"
        disabled
        title={curriculumCopy.settling}
        className={className}
      >
        {content}
      </button>
    )
  }

  return href ? (
    <Link href={href} title={label} className={className}>
      {content}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(className, "cursor-pointer")}
    >
      {content}
    </button>
  )
}

/**
 * The grip. **All it does is arm `draggable` on the row above it** — the drag
 * itself is handled there, because `dragstart` fires on the drag source and
 * bubbles up, so a handler here would never run.
 *
 * Arming on pointer-down rather than leaving the row permanently draggable is
 * what keeps text selection working inside the row's own inline fields; the
 * row disarms it again on `dragend`. Reordering from the keyboard is the pair
 * of arrows beside it, which is why the export draws both.
 */
function DragHandle({ disabled }: { disabled: boolean }) {
  return (
    <span
      aria-hidden
      onPointerDown={(event) => {
        if (disabled) return
        const row = event.currentTarget.closest("li, [data-section]")
        if (row instanceof HTMLElement) row.draggable = true
      }}
      className={cn(
        "shrink-0 text-subtle-foreground",
        disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
      )}
    >
      <GripVerticalIcon className="size-4" />
    </span>
  )
}

export { LessonRow, DragHandle }
export type { LessonKind }
