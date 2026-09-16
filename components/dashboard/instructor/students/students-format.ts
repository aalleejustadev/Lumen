/** Presentation for `/dashboard/instructor/students`, kept beside the
 *  components that draw it the way `settings-controls.ts` is. */

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

/** The Quiz column. An em dash when nothing has been submitted — see
 *  `lib/instructor-students.ts` for why that is not a "0/5". */
export function formatQuiz(quiz: { passed: number; total: number } | null) {
  return quiz === null ? "—" : `${quiz.passed}/${quiz.total}`
}
