"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { toast } from "@/components/ui/toast"
import {
  DeleteCurriculumDialog,
  type DeleteTarget,
} from "@/components/dashboard/instructor/courses/edit/delete-curriculum-dialog"
import { LessonVideoDialog } from "@/components/dashboard/instructor/courses/edit/lesson-video-dialog"
import { SectionCard } from "@/components/dashboard/instructor/courses/edit/section-card"
import { curriculumCopy, type LessonKind } from "@/lib/config/course-editor"
import type { EditorLesson, EditorSection } from "@/lib/instructor-course-edit"
import {
  addLesson,
  addSection,
  deleteLesson,
  deleteSection,
  moveLesson,
  moveSection,
  renameSection,
  updateLesson,
} from "@/lib/actions/instructor-course-edit"

/**
 * The Curriculum step, from `create-course-page__curriculum.png` — the heading
 * and its summary line, **Add section**, and the stack of section cards.
 *
 * **Every edit is applied locally first and the server is told afterwards.**
 * Nothing here waits, nothing greys out and nothing spins: reordering a row,
 * adding a lesson and renaming one all land the instant they are asked for,
 * and the only way the server enters the picture is by refusing — in which
 * case the list snaps back to what it was and says why. That is the opposite
 * posture from `promotions-board.tsx`, which shows a pending state per
 * control, and it is deliberate for this surface: a curriculum is edited in
 * bursts of a dozen small changes, and a spinner on each one makes the whole
 * step feel like it is arguing.
 *
 * Four things make that safe:
 *
 *  - **`inFlight` gates the re-seed from the server.** The list is seeded from
 *    props and re-seeded when they change identity — the "adjust state during
 *    render" pattern `users-toolbar.tsx` records — but *only while nothing is
 *    in flight*. Without that guard a revalidation landing mid-edit would
 *    briefly redraw the old order underneath the instructor's hand.
 *  - **Only the writes that change something outside this page revalidate at
 *    all.** Reordering and renaming do not; see `revalidateEditor`.
 *  - **A new lesson is drawn immediately with a placeholder id**, and the real
 *    row replaces it when the server answers. Editing it in that window is
 *    refused rather than misdirected, because a placeholder id addresses no
 *    lesson — which is why `EditableText` is disabled on a row that is still
 *    settling.
 *  - **Reordering is a drag *and* a pair of arrows, and they are one action.**
 *    `moveSection`/`moveLesson` take a destination index rather than a
 *    direction so the two gestures cannot drift; the arrows are also the whole
 *    keyboard story, since native HTML5 drag has none. Moving a lesson
 *    **between** sections is not supported — see `moveLesson`.
 */
const TEMP_PREFIX = "pending:"

function CurriculumBoard({
  courseId,
  courseSlug,
  sections: serverSections,
}: {
  courseId: string
  courseSlug: string
  sections: EditorSection[]
}) {
  const [sections, setSections] = React.useState(serverSections)
  const [snapshot, setSnapshot] = React.useState(serverSections)
  const [inFlight, setInFlight] = React.useState(0)

  if (serverSections !== snapshot) {
    setSnapshot(serverSections)
    if (inFlight === 0) setSections(serverSections)
  }

  const [dragSection, setDragSection] = React.useState<string | null>(null)
  const [dragLesson, setDragLesson] = React.useState<string | null>(null)
  // The one thing on this step that stops and asks. See
  // `delete-curriculum-dialog.tsx` for why these two controls and no others.
  const [confirming, setConfirming] = React.useState<DeleteTarget | null>(null)
  // One video dialog for the whole board, like the delete dialog — keyed by
  // the lesson it was opened for and read back out of `sections`, so an upload
  // that lands updates the row and the dialog together.
  const [videoFor, setVideoFor] = React.useState<{
    sectionId: string
    lessonId: string
  } | null>(null)
  const videoLesson = videoFor
    ? sections
        .find((row) => row.id === videoFor.sectionId)
        ?.lessons.find((lesson) => lesson.id === videoFor.lessonId)
    : undefined

  const totals = {
    sections: sections.length,
    lessons: sections.reduce((sum, row) => sum + row.lessons.length, 0),
  }

  /**
   * Apply locally, then tell the server. On a refusal the whole list goes back
   * to what it was before the edit — a curriculum that showed a change the
   * database never took would be worse than the change not happening.
   */
  function mutate(
    next: EditorSection[],
    action: () => Promise<{ ok: boolean; message: string }>,
    onSettled?: (result: { ok: boolean; message: string }) => void
  ) {
    const previous = sections
    setSections(next)
    setInFlight((count) => count + 1)

    void action()
      .then((result) => {
        if (!result.ok) {
          setSections(previous)
          if (result.message !== "") {
            toast.add({ title: result.message, type: "error" })
          }
          return
        }
        if (result.message !== "") {
          toast.add({ title: result.message, type: "success" })
        }
        onSettled?.(result)
      })
      .catch(() => {
        setSections(previous)
        toast.add({ title: "That change didn't save.", type: "error" })
      })
      .finally(() => setInFlight((count) => count - 1))
  }

  /**
   * The inline fields need the verdict back, so these await rather than
   * running through `mutate` — `EditableText` puts the old value back when the
   * answer is false.
   *
   * **`saved` is why this toasts on success where `mutate` mostly does not.**
   * Every other edit on this step announces itself by changing the list, so
   * the screen is its own confirmation; a rename does not, because the new
   * text has been on screen since it was typed. `EditableText` only calls this
   * when the value actually moved, so tabbing across a row stays silent.
   */
  async function commit(
    next: EditorSection[],
    action: () => Promise<{ ok: boolean; message: string }>,
    saved: string
  ) {
    const previous = sections
    setSections(next)
    setInFlight((count) => count + 1)
    try {
      const result = await action()
      if (!result.ok) {
        setSections(previous)
        if (result.message !== "") {
          toast.add({ title: result.message, type: "error" })
        }
        return false
      }
      toast.add({ title: saved, type: "success" })
      return true
    } catch {
      // Without this the field would keep a value the database never took —
      // the one thing `EditableText`'s own note forbids.
      setSections(previous)
      toast.add({ title: "That change didn't save.", type: "error" })
      return false
    } finally {
      setInFlight((count) => count - 1)
    }
  }

  const mapSection = (
    sectionId: string,
    change: (section: EditorSection) => EditorSection
  ) => sections.map((row) => (row.id === sectionId ? change(row) : row))

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* `font-bold` explicitly, for the reason `CLAUDE.md` gives: the base
              rule sets every `h2` to 800 and the dashboard exports draw 700. */}
          <h2 className="text-[26px] leading-none font-bold">
            {curriculumCopy.heading}
          </h2>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {curriculumCopy.summary(totals.lessons, totals.sections)}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const temp: EditorSection = {
              id: `${TEMP_PREFIX}${Date.now()}`,
              title: curriculumCopy.newSectionTitle,
              lessons: [],
            }
            mutate(
              [...sections, temp],
              () => addSection(courseId),
              (result) => {
                const created = (result as { section?: EditorSection }).section
                if (!created) return
                setSections((current) =>
                  current.map((row) => (row.id === temp.id ? created : row))
                )
              }
            )
          }}
          className="h-10 shrink-0 gap-2 bg-card px-4 text-[14px] shadow-sm"
        >
          <PlusIcon className="size-4" />
          {curriculumCopy.addSection}
        </Button>
      </div>

      {sections.length === 0 ? (
        <Empty className="mt-5 rounded-xl bg-card ring-1 ring-border">
          <EmptyHeader>
            <EmptyTitle>{curriculumCopy.empty.title}</EmptyTitle>
            <EmptyDescription>
              {curriculumCopy.empty.description}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="mt-5 flex flex-col gap-4.5">
          {sections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              index={index}
              first={index === 0}
              last={index === sections.length - 1}
              settling={section.id.startsWith(TEMP_PREFIX)}
              isTemp={(id) => id.startsWith(TEMP_PREFIX)}
              courseSlug={courseSlug}
              onLessonVideo={(lessonId) =>
                setVideoFor({ sectionId: section.id, lessonId })
              }
              onRename={(title) =>
                commit(
                  mapSection(section.id, (row) => ({ ...row, title })),
                  () => renameSection(courseId, section.id, title),
                  curriculumCopy.saved.section
                )
              }
              onDelete={() =>
                setConfirming({
                  kind: "section",
                  sectionId: section.id,
                  title: section.title,
                  lessons: section.lessons.length,
                })
              }
              onMove={(to) => moveSectionTo(section.id, to)}
              onAddLesson={(kind: LessonKind) => {
                const temp: EditorLesson = {
                  id: `${TEMP_PREFIX}${Date.now()}`,
                  title: curriculumCopy.newLessonTitle[kind],
                  kind,
                  durationMinutes: null,
                  questionsCount: null,
                  isPreview: false,
                  hasQuiz: false,
                  video: null,
                  hasArticle: false,
                }
                mutate(
                  mapSection(section.id, (row) => ({
                    ...row,
                    lessons: [...row.lessons, temp],
                  })),
                  () => addLesson(courseId, section.id, kind),
                  (result) => {
                    const created = (result as { lesson?: EditorLesson }).lesson
                    if (!created) return
                    // Swap the placeholder for the row the server wrote, so the
                    // next edit to it addresses a real lesson.
                    setSections((current) =>
                      current.map((row) =>
                        row.id === section.id
                          ? {
                              ...row,
                              lessons: row.lessons.map((lesson) =>
                                lesson.id === temp.id ? created : lesson
                              ),
                            }
                          : row
                      )
                    )
                  }
                )
              }}
              onLessonRename={(lessonId, title) =>
                commit(
                  mapSection(section.id, (row) => ({
                    ...row,
                    lessons: row.lessons.map((lesson) =>
                      lesson.id === lessonId ? { ...lesson, title } : lesson
                    ),
                  })),
                  () => updateLesson(courseId, lessonId, { title }),
                  curriculumCopy.saved.lesson
                )
              }
              onLessonMeta={(lessonId, value) => {
                const lesson = section.lessons.find(
                  (row) => row.id === lessonId
                )
                const isQuiz = lesson?.kind === "QUIZ"
                return commit(
                  mapSection(section.id, (row) => ({
                    ...row,
                    lessons: row.lessons.map((entry) =>
                      entry.id === lessonId
                        ? isQuiz
                          ? { ...entry, questionsCount: value }
                          : { ...entry, durationMinutes: value }
                        : entry
                    ),
                  })),
                  () =>
                    updateLesson(
                      courseId,
                      lessonId,
                      isQuiz
                        ? { questionsCount: value }
                        : { durationMinutes: value }
                    ),
                  isQuiz
                    ? curriculumCopy.saved.questions
                    : curriculumCopy.saved.duration
                )
              }}
              onLessonPreview={(lessonId, next) =>
                mutate(
                  mapSection(section.id, (row) => ({
                    ...row,
                    lessons: row.lessons.map((lesson) =>
                      lesson.id === lessonId
                        ? { ...lesson, isPreview: next }
                        : lesson
                    ),
                  })),
                  () => updateLesson(courseId, lessonId, { isPreview: next })
                )
              }
              onLessonMove={(lessonId, to) =>
                moveLessonTo(section.id, lessonId, to)
              }
              onLessonDelete={(lessonId) =>
                setConfirming({
                  kind: "lesson",
                  sectionId: section.id,
                  lessonId,
                  title:
                    section.lessons.find((row) => row.id === lessonId)?.title ??
                    "",
                })
              }
              drag={{
                sectionDragging: dragSection === section.id,
                lessonDragging: dragLesson,
                onSectionDragStart: () => setDragSection(section.id),
                onSectionDragOver: () => {
                  if (!dragSection || dragSection === section.id) return
                  const from = sections.findIndex((r) => r.id === dragSection)
                  if (from !== -1 && from !== index) {
                    setSections(reorder(sections, from, index))
                  }
                },
                onSectionDrop: () => {
                  const id = dragSection
                  setDragSection(null)
                  if (!id) return
                  const to = sections.findIndex((row) => row.id === id)
                  if (to !== -1) {
                    void moveSection(courseId, id, to).then((result) => {
                      if (!result.ok && result.message !== "") {
                        toast.add({ title: result.message, type: "error" })
                      }
                    })
                  }
                },
                onLessonDragStart: (lessonId) => setDragLesson(lessonId),
                onLessonDragOver: (lessonId) => {
                  if (!dragLesson || dragLesson === lessonId) return
                  const from = section.lessons.findIndex(
                    (row) => row.id === dragLesson
                  )
                  const to = section.lessons.findIndex(
                    (row) => row.id === lessonId
                  )
                  // A drag that wandered into another section is ignored rather
                  // than dropped somewhere surprising — cross-section moves are
                  // not built, see `moveLesson`.
                  if (from === -1 || to === -1 || from === to) return
                  setSections(
                    mapSection(section.id, (row) => ({
                      ...row,
                      lessons: reorder(row.lessons, from, to),
                    }))
                  )
                },
                onLessonDrop: () => {
                  const id = dragLesson
                  setDragLesson(null)
                  if (!id) return
                  const to = section.lessons.findIndex((row) => row.id === id)
                  if (to !== -1) {
                    void moveLesson(courseId, id, to).then((result) => {
                      if (!result.ok && result.message !== "") {
                        toast.add({ title: result.message, type: "error" })
                      }
                    })
                  }
                },
              }}
            />
          ))}
        </div>
      )}

      <LessonVideoDialog
        courseId={courseId}
        lesson={videoLesson ?? null}
        onOpenChange={(open) => {
          if (!open) setVideoFor(null)
        }}
        onChange={(change) => {
          if (!videoFor) return
          // Applied locally rather than waiting for the revalidation, which
          // `inFlight` would hold off anyway while other edits are pending.
          setSections((current) =>
            current.map((row) =>
              row.id === videoFor.sectionId
                ? {
                    ...row,
                    lessons: row.lessons.map((lesson) =>
                      lesson.id === videoFor.lessonId
                        ? { ...lesson, ...change }
                        : lesson
                    ),
                  }
                : row
            )
          )
        }}
      />

      <DeleteCurriculumDialog
        target={confirming}
        onOpenChange={(open) => {
          if (!open) setConfirming(null)
        }}
        onConfirm={confirmDelete}
      />
    </div>
  )

  /** Runs the delete the dialog was opened for, then closes it. The row goes
   *  optimistically like every other edit here, so there is nothing to wait
   *  for between the click and the dialog closing. */
  function confirmDelete() {
    const target = confirming
    setConfirming(null)
    if (!target) return

    if (target.kind === "section") {
      mutate(
        sections.filter((row) => row.id !== target.sectionId),
        () => deleteSection(courseId, target.sectionId)
      )
      return
    }

    mutate(
      mapSection(target.sectionId, (row) => ({
        ...row,
        lessons: row.lessons.filter((lesson) => lesson.id !== target.lessonId),
      })),
      () => deleteLesson(courseId, target.lessonId)
    )
  }

  function moveSectionTo(sectionId: string, to: number) {
    const from = sections.findIndex((row) => row.id === sectionId)
    if (from === -1 || to < 0 || to >= sections.length || to === from) return
    mutate(reorder(sections, from, to), () =>
      moveSection(courseId, sectionId, to)
    )
  }

  function moveLessonTo(sectionId: string, lessonId: string, to: number) {
    const section = sections.find((row) => row.id === sectionId)
    if (!section) return
    const from = section.lessons.findIndex((row) => row.id === lessonId)
    if (from === -1 || to < 0 || to >= section.lessons.length || to === from) {
      return
    }
    mutate(
      sections.map((row) =>
        row.id === sectionId
          ? { ...row, lessons: reorder(row.lessons, from, to) }
          : row
      ),
      () => moveLesson(courseId, lessonId, to)
    )
  }
}

function reorder<T>(rows: T[], from: number, to: number): T[] {
  const next = rows.slice()
  const [moved] = next.splice(from, 1)
  if (moved !== undefined) next.splice(to, 0, moved)
  return next
}

export { CurriculumBoard }
