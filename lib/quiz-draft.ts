import { QUIZ_LIMITS, quizEditorCopy } from "@/lib/config/course-editor"

/**
 * The shape the quiz editor edits and `saveQuiz` accepts, and the one rule set
 * both of them check it against.
 *
 * **One function, called on both sides.** The editor runs it before saving so
 * it can jump to the question at fault; the action runs it again because a
 * Server Action is a public endpoint. Two copies of "what makes a question
 * valid" would be two answers to the same question, free to drift.
 *
 * `id` is present on rows that already exist. The action matches on it so a
 * question that was only edited keeps its row — and with it any `QuizAnswer`
 * a student has recorded against it — rather than being deleted and
 * re-created on every save.
 */
export type QuizDraftOption = {
  id?: string
  label: string
  isCorrect: boolean
}

export type QuizDraftQuestion = {
  id?: string
  prompt: string
  options: QuizDraftOption[]
}

export type QuizDraftError = {
  /** 0-based question at fault, or null for a problem with the whole quiz. */
  index: number | null
  message: string
}

export function validateQuizDraft(
  questions: QuizDraftQuestion[]
): QuizDraftError | null {
  const errors = quizEditorCopy.errors

  if (questions.length === 0)
    return { index: null, message: errors.noQuestions }
  if (questions.length > QUIZ_LIMITS.questions) {
    return { index: null, message: errors.tooMany }
  }

  for (const [index, question] of questions.entries()) {
    const n = index + 1
    if (question.prompt.trim() === "") {
      return { index, message: errors.prompt(n) }
    }
    if (question.options.length < QUIZ_LIMITS.minOptions) {
      return { index, message: errors.options(n) }
    }
    if (question.options.some((option) => option.label.trim() === "")) {
      return { index, message: errors.blankOption(n) }
    }
    // The student page keys its rows by label, and two identical answers are
    // a mistake an instructor would want pointed out anyway.
    const labels = question.options.map((option) =>
      option.label.trim().toLowerCase()
    )
    if (new Set(labels).size !== labels.length) {
      return { index, message: errors.duplicate(n) }
    }
    // Exactly one: the student page is a radio group, so a second correct
    // answer could never be chosen alongside the first.
    if (question.options.filter((option) => option.isCorrect).length !== 1) {
      return { index, message: errors.correct(n) }
    }
  }

  return null
}
