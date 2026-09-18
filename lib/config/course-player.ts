import type { CourseLevel } from "@/lib/config/browse-courses"
import type { CourseReview, CourseSection } from "@/lib/config/course-details"

/**
 * Demo content for `/dashboard/learning/[slug]` — the *enrolled* course page,
 * measured off `ui-design/light/dashboard/student/course-page__part{1,2}.png`
 * and the three tab exports (`course-QA__tab.png`, `course-reviews__tab.png`,
 * `course-notes__tab.png`).
 *
 * This is the post-purchase surface. `/dashboard/courses/[slug]` (the sale
 * page, `lib/config/course-details.ts`) is the pre-purchase one — it sells,
 * this one teaches — so the two show the same syllabus from different angles:
 * there, lessons carry a price-page "Preview" tag; here they carry a
 * done/current state and a per-section completion count.
 *
 * **The authored course and the generator that used to live here are gone.**
 * `lib/course-player.ts` builds this shape from `Course`, its sections and
 * lessons, the viewer's own `Enrollment` and real `CourseQuestion` and
 * `CourseReview` rows — the swap this file's header always described. What
 * stays is the shape and the four builders that turn database rows into it,
 * so there is one answer to "what does a lesson row say" rather than two.
 *
 * Nothing here carries a `LucideIcon`: the tabs and the completion accordion
 * are Client Components, and a function value can't cross the server-client
 * prop boundary (the same trap `instructor-profile-page.tsx` works around
 * with `withoutIcon`). The player surface is the bare category gradient
 * anyway, exactly as `course-preview-dialog.tsx` renders it — see
 * `lumen-course-card-art`.
 */

export type PlayerLessonState = "done" | "current" | "upcoming"

export type PlayerLesson = {
  title: string
  /** Rendered verbatim under the title: "20 min", "1 hour 20 min",
   *  "5 questions". Pre-formatted rather than a number + unit because a quiz
   *  row counts questions where a lecture counts time. */
  meta: string
  /** `article` only ever comes from a database course; the static catalog's
   *  rows are drawn as video or quiz, as the export draws them. */
  type: "video" | "article" | "quiz"
  state: PlayerLessonState
  /** Quiz rows only — the `CourseQuiz` this row opens, which is what turns
   *  the completion accordion's trailing chevron into a real link. */
  quizSlug?: string
  /** `CourseLesson.id`, on a database course. A row with one is selectable —
   *  it opens that lesson on the page — and a row without one (every catalog
   *  lesson, which has no content behind it) stays as it was. */
  id?: string
  /** Free to watch without enrolling. */
  preview?: boolean
  /** The viewer may not open this lesson: not enrolled, and not a preview. */
  locked?: boolean
}

export type QuizQuestion = {
  prompt: string
  /** Rendered A/B/C/D in order; four everywhere in the export. */
  options: string[]
  /** Index into `options`. Nothing scores against it yet — see
   *  `components/dashboard/learning/quiz/quiz-page.tsx`. */
  answerIndex: number
}

export type CourseQuiz = {
  slug: string
  /** "Quiz · Tools & Workflow", the same string the lesson row shows. */
  title: string
  questions: QuizQuestion[]
}

export type PlayerSection = {
  title: string
  lessons: PlayerLesson[]
}

export type QuestionReply = {
  name: string
  role: "Instructor" | "Student"
  avatarUrl?: string
  timeAgo: string
  body: string
}

export type CourseQuestion = {
  id: string
  title: string
  name: string
  avatarUrl?: string
  timeAgo: string
  /** The lesson the question was asked from — "Lesson 2 · Mastering Tools". */
  lessonTag: string
  answered: boolean
  /**
   * The whole thread, not just its head. The card shows the first
   * `QA_VISIBLE_REPLIES` and reveals the rest behind "Show N more replies",
   * which is how the export's first question reads "6 replies" while drawing
   * two — so the count on the toggle and the rows it reveals come from one
   * list and can't disagree.
   */
  replies: QuestionReply[]
}

/** How many replies a question shows before the "Show N more replies"
 *  toggle — two, matching the export's first thread. */
export const QA_VISIBLE_REPLIES = 2

export type CourseNote = {
  id: string
  /** M:SS on the lesson's timeline — the point the note was taken at. */
  timestamp: string
  body: string
}

export type CoursePlayerCourse = {
  slug: string
  /**
   * Set on a database course only. `full` when the viewer is enrolled, owns
   * the course or is an admin — see `lib/course-access.ts` — and `preview`
   * otherwise, which locks every lesson not marked free preview. Absent on a
   * catalog course, whose lessons have no content to gate.
   */
  access?: "full" | "preview"
  /** Database courses only: whether a sale page exists to send a locked
   *  viewer to. Only a published course has one. */
  published?: boolean
  title: string
  /** Tailwind gradient stops, straight off the `BrowseCourse` row. */
  art: string
  instructor: {
    name: string
    /** The line under the name, minus the leading "Mentor · ". */
    title: string
    avatarUrl?: string
    /** `Instructor.slug`, on a database course — what the profile route looks
     *  a database instructor up by. Absent on catalog courses, whose profile
     *  slug is derived from the name. */
    slug?: string
  }
  /** 0-100. The enrolment's stored figure, not a lesson ratio — see the note
   *  on `EnrollmentSeed.progress` in `lib/config/my-learning.ts`. */
  progress: number
  /** The tinted note under the milestone row on the Study Progress card. */
  encouragement: string
  sections: PlayerSection[]
  /** Every quiz in `sections`, resolved by `quizSlug`. Kept beside the
   *  sections rather than nested inside a lesson so the quiz page can look one
   *  up by slug without walking the whole syllabus. */
  quizzes: CourseQuiz[]
  about: {
    description: string[]
    /** "This Course Suit For:" — audience, not prerequisites. The sale page's
     *  `requirements` is the prerequisites list. */
    suitFor: string[]
  }
  questions: CourseQuestion[]
  rating: number
  reviewsCount: number
  reviews: CourseReview[]
  notes: CourseNote[]
}

/** Bands rather than a single line, so a course barely started and one nearly
 *  finished don't get the same congratulation. */
export function buildEncouragement(title: string, progress: number) {
  if (progress >= 100) {
    return `Course complete! 🎉 ${title} is done — your certificate is waiting in the Certificates tab.`
  }
  if (progress >= 60) {
    return `Almost there! 🎉 You've covered most of ${title}. Keep the streak going — the finish line is close.`
  }
  if (progress > 0) {
    return `Great job! 🎉 You're on the path to mastering ${title.toLowerCase()}. Your dedication to learning is impressive — finish strong!`
  }
  return `Welcome aboard! 🎉 ${title} starts with the first lesson below — press play whenever you're ready.`
}

/**
 * Takes the three fields it actually reads rather than a whole
 * `BrowseCourse`, so `lib/course-player.ts` can call it for a course that
 * exists only as database rows and has no row in the static catalog at all.
 * One implementation, for the reason every "the two can't drift" note in this
 * codebase gives.
 */
export function buildSuitFor({
  title,
  level,
  category,
}: {
  title: string
  level: CourseLevel
  category: string
}) {
  const topic = title.toLowerCase()
  const audience =
    level === "Beginner" || level === "All Levels"
      ? "Beginners, newbies & amateurs"
      : `${level} learners ready to go deeper`

  return [
    `Anyone who wants to start their career & get paid for their ${category.toLowerCase()} skills.`,
    `${audience} in the field of ${topic}.`,
    `Anyone that needs to add "${title}" to their portfolio.`,
    `People who learn best by building alongside the lessons rather than reading about them.`,
  ]
}

/**
 * The sale page's syllabus (`CourseDetail.sections`), re-cut as progress.
 * The first `completedLessons` lessons across the whole course are marked
 * done and the next one is the current lesson, which is what the completion
 * accordion's per-section "N done" counts add up from — so a section is
 * partially complete exactly where the running total lands inside it.
 */
export function buildSections(
  sections: CourseSection[],
  completedLessons: number
): PlayerSection[] {
  let seen = 0

  return sections.map((section) => ({
    title: section.title,
    lessons: section.lessons.map((lesson) => {
      const index = seen++
      const state: PlayerLessonState =
        index < completedLessons
          ? "done"
          : index === completedLessons
            ? "current"
            : "upcoming"

      const isQuiz = lesson.type === "quiz"
      return {
        title: isQuiz ? `Quiz · ${lesson.title}` : lesson.title,
        meta: isQuiz
          ? `${lesson.questions} questions`
          : `${lesson.minutes} min`,
        type: isQuiz ? ("quiz" as const) : ("video" as const),
        state,
        ...(isQuiz ? { quizSlug: quizSlugOf(lesson.title) } : {}),
      }
    }),
  }))
}

/** "Tools & Workflow" -> "tools-and-workflow". Shared by the lesson row and
 *  the quiz lookup so a row can't link at a quiz that doesn't resolve. */
function quizSlugOf(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * A quiz per quiz lesson, sized to the `questions` count the sale page's
 * syllabus already advertises so the row's "5 questions" and the page's
 * "Question 1 of 5" agree.
 *
 * The prompts are generic on purpose — there is no authored question bank
 * outside the flagship course, and inventing subject-specific questions for
 * fifty courses would read worse than an honest placeholder. `answerIndex` is
 * always the first option; nothing grades against it yet.
 */
function buildQuiz(sectionTitle: string, count: number): CourseQuiz {
  const templates: Array<[string, string[]]> = [
    [
      `What is the main idea behind "${sectionTitle}"?`,
      [
        "Building the habit before the technique",
        "Memorising every shortcut first",
        "Skipping straight to the final project",
        "Reading the docs end to end",
      ],
    ],
    [
      "When should you move on to the next lesson?",
      [
        "Once you've finished the section's exercise",
        "As soon as the video ends",
        "After watching it twice",
        "Only after finishing the whole course",
      ],
    ],
    [
      "Which habit does this section encourage most?",
      [
        "Practising on real work as you go",
        "Taking notes without applying them",
        "Comparing yourself to experts",
        "Waiting until you feel ready",
      ],
    ],
    [
      "What is the most common mistake covered here?",
      [
        "Rushing the setup and paying for it later",
        "Spending too long on the exercise",
        "Asking questions too early",
        "Re-watching a lesson",
      ],
    ],
    [
      "How is this section structured?",
      [
        "Each lesson builds on the one before it",
        "The lessons are independent of each other",
        "It's reference material, not a sequence",
        "It only makes sense in reverse",
      ],
    ],
    [
      "What should you have finished before the next section?",
      [
        "The exercise this section closes on",
        "Every optional reading",
        "A full portfolio piece",
        "Nothing in particular",
      ],
    ],
  ]

  return {
    slug: quizSlugOf(sectionTitle),
    title: `Quiz · ${sectionTitle}`,
    questions: Array.from({ length: count }, (_, index) => {
      const [prompt, options] = templates[index % templates.length]!
      return { prompt, options, answerIndex: 0 }
    }),
  }
}

export function buildQuizzes(sections: CourseSection[]): CourseQuiz[] {
  return sections.flatMap((section) =>
    section.lessons
      .filter((lesson) => lesson.type === "quiz")
      .map((lesson) => buildQuiz(lesson.title, lesson.questions ?? 5))
  )
}

/** Section/lesson totals for the "4 sections · 12 lessons" line and the
 *  per-section "4 lessons · 2 done" counts, derived from one list so the
 *  header and the rows can't disagree. */
export function sectionProgress(section: PlayerSection) {
  const done = section.lessons.filter(
    (lesson) => lesson.state === "done"
  ).length
  return { total: section.lessons.length, done }
}

export function courseTotals(sections: PlayerSection[]) {
  const lessons = sections.reduce(
    (sum, section) => sum + section.lessons.length,
    0
  )
  return { sections: sections.length, lessons }
}
