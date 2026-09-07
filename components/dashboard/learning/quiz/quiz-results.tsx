"use client"

import Link from "next/link"
import { CheckIcon, RotateCcwIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { CourseQuiz } from "@/lib/config/course-player"
import { cn } from "@/lib/utils"

/** 80% is the usual bar for a lesson check. Nothing gates on it yet — it only
 *  decides which of the two summaries the card shows. */
const PASS_PERCENT = 80

/**
 * The screen after the last question. `quiz-page.png` doesn't draw one, so
 * this is built from the same parts as the quiz card it replaces — 718px,
 * `p-7.5`, the same header row and progress bar — with the option rows
 * swapped for a per-question review.
 *
 * Nothing is recorded: there is no `QuizAttempt` model, so a result lives as
 * long as the component does and "Retake quiz" just clears local state. This
 * is the first place `QuizQuestion.answerIndex` is actually read.
 */
function QuizResults({
  quiz,
  answers,
  courseSlug,
  onRetake,
}: {
  quiz: CourseQuiz
  /** Question index -> the option index chosen. Missing = skipped. */
  answers: Record<number, number>
  courseSlug: string
  onRetake: () => void
}) {
  const total = quiz.questions.length
  const correct = quiz.questions.filter(
    (question, index) => answers[index] === question.answerIndex
  ).length
  const percent = Math.round((correct / total) * 100)
  const passed = percent >= PASS_PERCENT

  return (
    <div className="mx-auto w-full max-w-[718px]">
      <Link
        href={`/dashboard/learning/${courseSlug}`}
        className="flex w-fit items-center gap-2.5 text-[15px] text-muted-foreground hover:text-foreground"
      >
        <RotateCcwIcon className="size-4.5 -scale-x-100" />
        Back to course
      </Link>

      <Card className="mt-4 gap-0 p-7.5 ring-border">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-xl font-bold">{quiz.title}</h1>
          <p className="text-[15px] text-muted-foreground">Results</p>
        </div>

        <Progress
          value={100}
          aria-label="Quiz complete"
          className="mt-5 [&_[data-slot=progress-indicator]]:bg-bar-fill [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-track"
        />

        <div className="mt-7 flex flex-col items-center text-center">
          <span
            className={cn(
              "flex size-20 items-center justify-center rounded-full text-2xl font-extrabold tabular-nums",
              passed
                ? "bg-success/12 text-success"
                : "bg-warning/12 text-warning"
            )}
          >
            {percent}%
          </span>
          <h2 className="mt-4 text-xl font-bold">
            {passed ? "Nice work!" : "Worth another pass"}
          </h2>
          <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">
            You answered {correct} of {total}{" "}
            {total === 1 ? "question" : "questions"} correctly.
          </p>
        </div>

        <ul className="mt-7 flex flex-col gap-3">
          {quiz.questions.map((question, index) => {
            const chosen = answers[index]
            const isCorrect = chosen === question.answerIndex

            return (
              <li
                key={question.prompt}
                className="flex items-start gap-3.5 rounded-xl border border-border px-3.5 py-3.5"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-white",
                    isCorrect ? "bg-success" : "bg-destructive"
                  )}
                >
                  {isCorrect ? (
                    <CheckIcon className="size-4.5" strokeWidth={2.5} />
                  ) : (
                    <XIcon className="size-4.5" strokeWidth={2.5} />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-6 font-semibold">
                    {question.prompt}
                  </span>
                  <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">
                    {chosen === undefined
                      ? "Skipped"
                      : `Your answer: ${question.options[chosen]}`}
                  </span>
                  {!isCorrect ? (
                    <span className="mt-0.5 block text-sm leading-5 text-success">
                      Correct answer: {question.options[question.answerIndex]}
                    </span>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={onRetake}
            className="h-10 gap-2 bg-card px-6 font-semibold shadow-sm"
          >
            <RotateCcwIcon data-icon="inline-start" className="size-4" />
            Retake quiz
          </Button>

          <Button
            nativeButton={false}
            render={<Link href={`/dashboard/learning/${courseSlug}`} />}
            className="h-10 gap-2 px-6 font-semibold"
          >
            Back to course
          </Button>
        </div>
      </Card>
    </div>
  )
}

export { QuizResults }
