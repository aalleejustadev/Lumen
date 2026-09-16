"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/toast"
import {
  editorStepHref,
  QUIZ_LIMITS,
  quizEditorCopy,
} from "@/lib/config/course-editor"
import type { QuizEditorLesson } from "@/lib/instructor-course-edit"
import {
  validateQuizDraft,
  type QuizDraftError,
  type QuizDraftQuestion,
} from "@/lib/quiz-draft"
import { saveQuiz } from "@/lib/actions/instructor-course-edit"
import { cn } from "@/lib/utils"

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"]

/** A draft row carries a client-only `key` beside the database `id`, because
 *  a row that has never been saved has no id to key a list on. */
type DraftOption = {
  key: string
  id?: string
  label: string
  isCorrect: boolean
}
type DraftQuestion = {
  key: string
  id?: string
  prompt: string
  options: DraftOption[]
}

/**
 * `/dashboard/instructor/courses/[slug]/edit/quiz/[lessonId]` — where a quiz's
 * questions, answers and correct answers are written.
 *
 * **It is the student quiz page, made editable**, rather than a form of its
 * own. `quiz-page.tsx` is built to `quiz-page.png` — a 718px card on `p-7.5`,
 * the "Quiz · <lesson>" / "Question N of M" header over a progress bar, the
 * prompt at 20px/700, 64px lettered option rows on a 12px rhythm, and a
 * Previous / Next footer on 40px controls — and every one of those is reused
 * here class for class, so what an instructor writes is laid out exactly as a
 * student will meet it. What changes is only what is needed to author:
 *
 *  - **The prompt and each answer are fields drawn as the text they become** —
 *    borderless until hovered or focused, the call `editable-text.tsx` makes.
 *  - **The correct answer is picked by clicking its letter.** It is drawn in
 *    the student page's own "selected" state (`border-primary bg-soft`, a dark
 *    letter tile), so the answer marked correct looks exactly like the answer
 *    a student will need to choose. Those letters are native radios, one group
 *    per question, which is also what makes "exactly one correct" a property
 *    of the control rather than only of the validation.
 *  - **A row of numbered chips sits under the progress bar**, because an
 *    editor needs to jump straight to question 7, where a student only ever
 *    walks forwards. On the last question **Next becomes Add question**, the
 *    mirror of the student page's Next becoming Finish.
 *
 * It saves the whole quiz at once, with Save or ⌘S, for the article editor's
 * reason: a quiz is not valid half-written (a question with one answer is not
 * a choice), so there is no sensible moment to write it piece by piece.
 * `validateQuizDraft` runs here first so a refusal can jump to the question at
 * fault and point at it, and runs again in `saveQuiz` because the action is a
 * public endpoint.
 *
 * A quiz with no questions opens on **one blank question with four answers**
 * — the shape the export draws — rather than an empty state, because the only
 * thing to do on an empty quiz is start the first question.
 */
function QuizEditor({ lesson }: { lesson: QuizEditorLesson }) {
  const [questions, setQuestions] = React.useState<DraftQuestion[]>(() =>
    lesson.questions.length > 0
      ? lesson.questions.map(toDraft)
      : [blankQuestion()]
  )
  const [index, setIndex] = React.useState(0)
  const [dirty, setDirty] = React.useState(false)
  const [error, setError] = React.useState<QuizDraftError | null>(null)
  const [saving, startSaving] = React.useTransition()
  // A field to focus once it exists — a ref rather than state, because the
  // focus is a side effect of the render that creates the field, not something
  // to render again for.
  const pendingFocus = React.useRef<string | null>(null)

  const total = questions.length
  const question = questions[Math.min(index, total - 1)]!
  const isLast = index >= total - 1
  const title = quizEditorCopy.title(lesson.title)

  // Moves focus to a field that was just created (a new answer, a new
  // question's prompt) once the render that created it has committed.
  React.useEffect(() => {
    const key = pendingFocus.current
    if (!key) return
    pendingFocus.current = null
    document.querySelector<HTMLElement>(`[data-focus-key="${key}"]`)?.focus()
  })

  function focusSoon(key: string) {
    pendingFocus.current = key
  }

  function update(change: (current: DraftQuestion[]) => DraftQuestion[]) {
    setQuestions(change)
    setDirty(true)
    setError(null)
  }

  function updateQuestion(change: (current: DraftQuestion) => DraftQuestion) {
    const key = question.key
    update((current) =>
      current.map((row) => (row.key === key ? change(row) : row))
    )
  }

  function addQuestion() {
    if (total >= QUIZ_LIMITS.questions) {
      toast.add({ title: quizEditorCopy.errors.tooMany, type: "error" })
      return
    }
    const next = blankQuestion()
    update((current) => [...current, next])
    setIndex(total)
    focusSoon(`prompt-${next.key}`)
  }

  function deleteQuestion() {
    if (total <= 1) return
    const key = question.key
    update((current) => current.filter((row) => row.key !== key))
    setIndex((current) => Math.max(0, Math.min(current, total - 2)))
  }

  function addOption() {
    if (question.options.length >= QUIZ_LIMITS.maxOptions) return
    const option = blankOption()
    updateQuestion((row) => ({ ...row, options: [...row.options, option] }))
    focusSoon(`option-${option.key}`)
  }

  const save = React.useCallback(() => {
    if (saving) return
    const payload: QuizDraftQuestion[] = questions.map((row) => ({
      id: row.id,
      prompt: row.prompt,
      options: row.options.map((option) => ({
        id: option.id,
        label: option.label,
        isCorrect: option.isCorrect,
      })),
    }))

    const invalid = validateQuizDraft(payload)
    if (invalid) {
      setError(invalid)
      if (invalid.index !== null) setIndex(invalid.index)
      toast.add({ title: invalid.message, type: "error" })
      return
    }

    startSaving(async () => {
      const result = await saveQuiz(lesson.courseId, lesson.lessonId, payload)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok && result.questions) {
        // The saved rows carry their new ids, so the next save updates them
        // rather than creating them again.
        setQuestions(result.questions.map(toDraft))
        setDirty(false)
        setError(null)
      }
    })
  }, [questions, saving, lesson.courseId, lesson.lessonId])

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        typeof event.key === "string" &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault()
        save()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [save])

  React.useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])

  const errorHere = error !== null && error.index === index

  return (
    <div className="mx-auto w-full max-w-[718px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={editorStepHref(lesson.courseSlug, "curriculum")}
          className="flex w-fit items-center gap-2.5 text-[15px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4.5" />
          {quizEditorCopy.back}
        </Link>

        <div className="flex items-center gap-3">
          <span
            className="text-[13px] text-muted-foreground"
            aria-live="polite"
          >
            {dirty ? quizEditorCopy.unsaved : quizEditorCopy.allSaved}
          </span>
          <Button
            type="button"
            loading={saving}
            disabled={!dirty}
            onClick={save}
            className="h-10 px-4"
          >
            {quizEditorCopy.save}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-[14px] text-muted-foreground">
        {quizEditorCopy.lead}
      </p>

      <Card className="mt-4 gap-0 p-7.5 ring-border">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-[15px] text-muted-foreground tabular-nums">
            {quizEditorCopy.counter(index, total)}
          </p>
        </div>

        <Progress
          value={((index + 1) / total) * 100}
          aria-label={quizEditorCopy.counter(index, total)}
          className="mt-5 [&_[data-slot=progress-indicator]]:bg-bar-fill [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-track"
        />

        <nav
          aria-label="Questions"
          className="mt-5 flex flex-wrap items-center gap-2"
        >
          {questions.map((row, rowIndex) => {
            const active = rowIndex === index
            const faulty = error?.index === rowIndex
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => setIndex(rowIndex)}
                aria-label={quizEditorCopy.jumpTo(rowIndex)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "grid size-8 cursor-pointer place-items-center rounded-lg text-[13px] font-semibold tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-hover text-foreground hover:bg-track",
                  faulty && "ring-2 ring-destructive"
                )}
              >
                {rowIndex + 1}
              </button>
            )
          })}
          {total < QUIZ_LIMITS.questions ? (
            <button
              type="button"
              onClick={addQuestion}
              aria-label={quizEditorCopy.addQuestion}
              title={quizEditorCopy.addQuestion}
              className="grid size-8 cursor-pointer place-items-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <PlusIcon className="size-4" />
            </button>
          ) : null}
        </nav>

        {/* `key` resets the fields between questions, the reason the student
            page keys its fieldset. */}
        <div key={question.key} className="mt-6">
          <textarea
            value={question.prompt}
            data-focus-key={`prompt-${question.key}`}
            aria-label={`Question ${index + 1}`}
            placeholder={quizEditorCopy.promptPlaceholder}
            maxLength={QUIZ_LIMITS.prompt}
            rows={1}
            onChange={(event) => {
              const prompt = event.target.value
              updateQuestion((row) => ({ ...row, prompt }))
            }}
            className={cn(
              // The student page's legend, as a field: 20px/700, and it grows
              // with the text instead of scrolling.
              "-mx-1.5 block [field-sizing:content] w-[calc(100%+0.75rem)] resize-none rounded-md bg-transparent px-1.5 py-1 text-xl leading-snug font-bold outline-none",
              "ring-1 ring-transparent transition-[background-color,box-shadow] hover:ring-border focus:ring-ring/50",
              "placeholder:text-subtle-foreground"
            )}
          />

          <fieldset className="mt-6">
            <legend className="sr-only">{quizEditorCopy.correct}</legend>
            <div className="flex flex-col gap-3">
              {question.options.map((option, optionIndex) => {
                const letter = OPTION_LETTERS[optionIndex]!
                const lastOption = optionIndex === question.options.length - 1

                return (
                  <div
                    key={option.key}
                    className={cn(
                      "flex h-16 items-center gap-3.5 rounded-xl border px-3.5 transition-colors",
                      option.isCorrect
                        ? "border-primary bg-soft"
                        : "border-border hover:bg-hover"
                    )}
                  >
                    <label
                      title={quizEditorCopy.markCorrect(letter)}
                      className="relative shrink-0 cursor-pointer rounded-lg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50"
                    >
                      <input
                        type="radio"
                        name={`correct-${question.key}`}
                        className="sr-only"
                        checked={option.isCorrect}
                        aria-label={quizEditorCopy.markCorrect(letter)}
                        onChange={() =>
                          updateQuestion((row) => ({
                            ...row,
                            options: row.options.map((entry) => ({
                              ...entry,
                              isCorrect: entry.key === option.key,
                            })),
                          }))
                        }
                      />
                      <span
                        className={cn(
                          "flex size-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                          option.isCorrect
                            ? "bg-primary text-primary-foreground"
                            : "bg-hover text-foreground hover:bg-track"
                        )}
                      >
                        {letter}
                      </span>
                    </label>

                    <input
                      value={option.label}
                      data-focus-key={`option-${option.key}`}
                      aria-label={quizEditorCopy.optionPlaceholder(letter)}
                      placeholder={quizEditorCopy.optionPlaceholder(letter)}
                      maxLength={QUIZ_LIMITS.option}
                      onChange={(event) => {
                        const label = event.target.value
                        updateQuestion((row) => ({
                          ...row,
                          options: row.options.map((entry) =>
                            entry.key === option.key
                              ? { ...entry, label }
                              : entry
                          ),
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return
                        event.preventDefault()
                        // Enter walks down the answers, and adds one past the
                        // last — the way a list is typed anywhere else.
                        const next = question.options[optionIndex + 1]
                        if (next) {
                          document
                            .querySelector<HTMLElement>(
                              `[data-focus-key="option-${next.key}"]`
                            )
                            ?.focus()
                        } else if (lastOption) addOption()
                      }}
                      className="h-10 min-w-0 flex-1 rounded-md bg-transparent px-1.5 text-[15px] outline-none placeholder:text-subtle-foreground"
                    />

                    {option.isCorrect ? (
                      <span className="hidden shrink-0 items-center gap-1 text-[13px] font-medium text-success sm:inline-flex">
                        <CheckIcon className="size-3.5" />
                        {quizEditorCopy.correct}
                      </span>
                    ) : null}

                    <button
                      type="button"
                      aria-label={`${quizEditorCopy.removeOption} ${letter}`}
                      title={quizEditorCopy.removeOption}
                      disabled={
                        question.options.length <= QUIZ_LIMITS.minOptions
                      }
                      onClick={() =>
                        updateQuestion((row) => ({
                          ...row,
                          options: row.options.filter(
                            (entry) => entry.key !== option.key
                          ),
                        }))
                      }
                      className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-card hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                )
              })}

              {question.options.length < QUIZ_LIMITS.maxOptions ? (
                <button
                  type="button"
                  onClick={addOption}
                  className="flex h-16 cursor-pointer items-center gap-3.5 rounded-xl border border-dashed border-border px-3.5 text-[15px] text-muted-foreground transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-hover">
                    <PlusIcon className="size-4" />
                  </span>
                  {quizEditorCopy.addOption}
                </button>
              ) : null}
            </div>
          </fieldset>

          {errorHere ? (
            <p role="alert" className="mt-4 text-[14px] text-destructive">
              {error.message}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            disabled={index === 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            className="h-10 gap-2 bg-card px-6 font-semibold shadow-sm"
          >
            <ChevronLeftIcon data-icon="inline-start" className="size-4" />
            {quizEditorCopy.previous}
          </Button>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              disabled={total <= 1}
              onClick={deleteQuestion}
              aria-label={quizEditorCopy.deleteQuestion}
              title={quizEditorCopy.deleteQuestion}
              className="h-10 gap-2 px-3 text-muted-foreground hover:text-destructive"
            >
              <Trash2Icon className="size-4" />
              <span className="sr-only sm:not-sr-only">
                {quizEditorCopy.deleteQuestion}
              </span>
            </Button>

            {isLast ? (
              <Button
                onClick={addQuestion}
                disabled={total >= QUIZ_LIMITS.questions}
                className="h-10 gap-2 px-6 font-semibold"
              >
                <PlusIcon data-icon="inline-start" className="size-4" />
                {quizEditorCopy.addQuestion}
              </Button>
            ) : (
              <Button
                onClick={() =>
                  setIndex((current) => Math.min(total - 1, current + 1))
                }
                className="h-10 gap-2 px-6 font-semibold"
              >
                {quizEditorCopy.next}
                <ChevronRightIcon data-icon="inline-end" className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function blankOption(): DraftOption {
  return { key: newKey(), label: "", isCorrect: false }
}

function blankQuestion(): DraftQuestion {
  return {
    key: newKey(),
    prompt: "",
    options: Array.from({ length: 4 }, blankOption),
  }
}

function toDraft(question: QuizDraftQuestion): DraftQuestion {
  return {
    key: question.id ?? newKey(),
    id: question.id,
    prompt: question.prompt,
    options: question.options.map((option) => ({
      key: option.id ?? newKey(),
      id: option.id,
      label: option.label,
      isCorrect: option.isCorrect,
    })),
  }
}

export { QuizEditor }
