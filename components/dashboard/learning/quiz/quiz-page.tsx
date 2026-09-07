"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { QuizResults } from "@/components/dashboard/learning/quiz/quiz-results"
import type { CourseQuiz } from "@/lib/config/course-player"
import { cn } from "@/lib/utils"

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"]

/**
 * `/dashboard/learning/[slug]/quiz/[quizSlug]`, from `quiz-page.png`.
 * Measured off that export at DPR 2: a **718px** card centred on the page
 * (`p-7.5`), a header row over a progress bar, the prompt, then 64px option
 * rows on a 12px rhythm and a Previous/Next footer on 40px controls.
 *
 * Answers are local state: there is no `QuizAttempt` model in
 * `prisma/schema.prisma`, so nothing is scored, saved or graded — the
 * `answerIndex` on each question is sitting there unread until there is
 * somewhere to record a result. Options are native radios inside their rows
 * (visually hidden, not removed) so arrow-key selection and screen-reader
 * grouping come from the platform rather than hand-rolled ARIA.
 *
 * Two states the export doesn't draw, because it only draws question 1 of 5:
 * Previous is disabled on the first question rather than being a dead
 * control, and the last question's primary button reads "Finish" and hands
 * over to `quiz-results.tsx` — which is where `answerIndex` is finally read.
 * Replace that hand-off with a real submit once attempts can be recorded.
 */
function QuizPage({
  quiz,
  courseSlug,
}: {
  quiz: CourseQuiz
  courseSlug: string
}) {
  const [index, setIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<number, number>>({})
  const [submitted, setSubmitted] = React.useState(false)

  const total = quiz.questions.length
  const question = quiz.questions[index]
  const backHref = `/dashboard/learning/${courseSlug}`
  const isLast = index === total - 1

  if (submitted) {
    return (
      <QuizResults
        quiz={quiz}
        answers={answers}
        courseSlug={courseSlug}
        onRetake={() => {
          setAnswers({})
          setIndex(0)
          setSubmitted(false)
        }}
      />
    )
  }

  if (!question) return null

  return (
    <div className="mx-auto w-full max-w-[718px]">
      <Link
        href={backHref}
        className="flex w-fit items-center gap-2.5 text-[15px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4.5" />
        Back to course
      </Link>

      <Card className="mt-4 gap-0 p-7.5 ring-border">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-xl font-bold">{quiz.title}</h1>
          <p className="text-[15px] text-muted-foreground tabular-nums">
            Question {index + 1} of {total}
          </p>
        </div>

        <Progress
          value={((index + 1) / total) * 100}
          aria-label={`Question ${index + 1} of ${total}`}
          className="mt-5 [&_[data-slot=progress-indicator]]:bg-bar-fill [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-track"
        />

        {/* `key` on the group resets the roving focus between questions, so
            arrowing through question 2 doesn't start from question 1's
            position. */}
        <fieldset key={index} className="mt-6">
          <legend className="text-xl font-bold">{question.prompt}</legend>

          <div className="mt-6 flex flex-col gap-3">
            {question.options.map((option, optionIndex) => {
              const selected = answers[index] === optionIndex

              return (
                <label
                  key={option}
                  className={cn(
                    "flex h-16 cursor-pointer items-center gap-3.5 rounded-xl border px-3.5 transition-colors",
                    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
                    selected
                      ? "border-primary bg-soft"
                      : "border-border hover:bg-hover"
                  )}
                >
                  <input
                    type="radio"
                    name={`question-${index}`}
                    className="sr-only"
                    checked={selected}
                    onChange={() =>
                      setAnswers((current) => ({
                        ...current,
                        [index]: optionIndex,
                      }))
                    }
                  />
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-hover text-foreground"
                    )}
                  >
                    {OPTION_LETTERS[optionIndex]}
                  </span>
                  <span className="text-[15px]">{option}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-6 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            disabled={index === 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            className="h-10 gap-2 bg-card px-6 font-semibold shadow-sm"
          >
            <ChevronLeftIcon data-icon="inline-start" className="size-4" />
            Previous
          </Button>

          <Button
            onClick={() =>
              isLast
                ? setSubmitted(true)
                : setIndex((current) => Math.min(total - 1, current + 1))
            }
            className="h-10 gap-2 px-6 font-semibold"
          >
            {isLast ? "Finish" : "Next"}
            <ChevronRightIcon data-icon="inline-end" className="size-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}

export { QuizPage }
