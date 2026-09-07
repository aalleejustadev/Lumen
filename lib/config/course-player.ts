import { browseCourses, type BrowseCourse } from "@/lib/config/browse-courses"
import {
  getCourseDetail,
  type CourseReview,
  type CourseSection,
} from "@/lib/config/course-details"
import { enrollmentBySlug } from "@/lib/config/my-learning"

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
 * Same arrangement as every other surface so far: only the export's own
 * course (`mastering-illustration`) is hand-authored to match the design
 * exactly, and every other slug gets a plausible page generated from its
 * `CourseDetail` — so every "Continue" button on `/dashboard/learning` leads
 * somewhere real rather than a dead link. There is no `Enrollment`,
 * `LessonProgress`, `CourseQuestion` or `LessonNote` model in
 * `prisma/schema.prisma` yet; swap this file for real queries once there is,
 * nothing downstream has to change shape.
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
  type: "video" | "quiz"
  state: PlayerLessonState
  /** Quiz rows only — the `CourseQuiz` this row opens, which is what turns
   *  the completion accordion's trailing chevron into a real link. */
  quizSlug?: string
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
  title: string
  /** Tailwind gradient stops, straight off the `BrowseCourse` row. */
  art: string
  instructor: {
    name: string
    /** The line under the name, minus the leading "Mentor · ". */
    title: string
    avatarUrl?: string
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

/** Real headshots supplied for the marketing testimonials — reused here for
 *  the same named people, same reasoning as `course-details.ts`. Everyone
 *  else falls back to initials in an `AvatarFallback`. */
const knownAvatars: Record<string, string> = {
  "Marco Devine": "/testimonials/marco-devine.png",
  "Simon Simorangkir": "/testimonials/simon-simorangkir.png",
  "Nadia Rahman": "/testimonials/nadia-rahman.png",
  "Priya Nadar": "/testimonials/priya-nadar.png",
}

type PlayerExtras = Omit<CoursePlayerCourse, "slug" | "title" | "art">

/**
 * mastering-illustration — the export's own course, hand-authored to match
 * `course-page__part{1,2}.png` and the three tab exports exactly.
 *
 * Its curriculum is 4 sections / 12 lessons with 2 done, which does *not*
 * agree with the same course's card on `/dashboard/learning` (14 of 25
 * lessons, 55%). That disagreement is the export's own — the two designs
 * were drawn against different placeholder syllabi — and it is kept rather
 * than reconciled, the same call `course-details.ts` makes about the sale
 * page's illustration copy sitting on a Python course. The one number that
 * *is* shared is `progress`: it comes from the enrolment seed, so the
 * "55%" badge here and the card's progress bar can't drift.
 */
const flagshipPlayers: Record<string, PlayerExtras> = {
  "mastering-illustration": {
    instructor: {
      name: "Simon Simorangkir",
      // Verbatim from the export, which reuses Marco Devine's title from the
      // sale page — the same placeholder quirk `instructor-profiles.ts`
      // carries on Simon's own profile page.
      title: "Illustrator at Google",
      avatarUrl: knownAvatars["Simon Simorangkir"],
    },
    progress: 55,
    encouragement:
      "Great job! 🎉 You're on the path to mastering illustration. Your dedication to learning is impressive — finish strong!",
    sections: [
      {
        title: "Getting your bearings",
        lessons: [
          {
            title: "Introduction",
            meta: "20 min",
            type: "video",
            state: "done",
          },
          {
            title: "Setting up your workspace",
            meta: "18 min",
            type: "video",
            state: "done",
          },
          {
            title: "Mastering Tools",
            meta: "1 hour 20 min",
            type: "video",
            state: "current",
          },
          {
            title: "Quiz · Tools & Workflow",
            meta: "5 questions",
            type: "quiz",
            state: "upcoming",
            quizSlug: "tools-and-workflow",
          },
        ],
      },
      {
        title: "Shapes, paths, and the pen tool",
        lessons: [
          {
            title: "Primitive shapes and the shape builder",
            meta: "32 min",
            type: "video",
            state: "upcoming",
          },
          {
            title: "Anchor points, handles, and curves",
            meta: "46 min",
            type: "video",
            state: "upcoming",
          },
          {
            title: "Mastering the pen tool",
            meta: "1 hour 05 min",
            type: "video",
            state: "upcoming",
          },
          {
            title: "Quiz · Paths & Curves",
            meta: "6 questions",
            type: "quiz",
            state: "upcoming",
            quizSlug: "paths-and-curves",
          },
        ],
      },
      {
        title: "Colour and typography systems",
        lessons: [
          {
            title: "Building a palette that holds together",
            meta: "38 min",
            type: "video",
            state: "upcoming",
          },
          {
            title: "Pairing type with illustration",
            meta: "27 min",
            type: "video",
            state: "upcoming",
          },
        ],
      },
      {
        title: "Finishing and exporting",
        lessons: [
          {
            title: "Final polish and consistency pass",
            meta: "34 min",
            type: "video",
            state: "upcoming",
          },
          {
            title: "Exporting for print and screen",
            meta: "22 min",
            type: "video",
            state: "upcoming",
          },
        ],
      },
    ],
    quizzes: [
      {
        slug: "tools-and-workflow",
        title: "Quiz · Tools & Workflow",
        questions: [
          {
            // Verbatim from `quiz-page.png`, down to the option order.
            prompt:
              "Which tool creates precise vector paths by placing anchor points?",
            options: ["Pen Tool", "Brush Tool", "Eraser Tool", "Lasso Tool"],
            answerIndex: 0,
          },
          {
            prompt:
              "What does the shape builder let you do with overlapping shapes?",
            options: [
              "Merge and subtract regions by dragging across them",
              "Convert them to a raster image",
              "Apply a gradient to all of them at once",
              "Lock them so they can't be edited",
            ],
            answerIndex: 0,
          },
          {
            prompt: "Where do you enable a panel that isn't currently visible?",
            options: [
              "The Window menu",
              "The File menu",
              "The Select menu",
              "The Effect menu",
            ],
            answerIndex: 0,
          },
          {
            prompt: "Which format keeps an illustration sharp at any size?",
            options: ["SVG", "JPEG", "GIF", "BMP"],
            answerIndex: 0,
          },
          {
            prompt:
              "What is the first step in the workflow taught in this section?",
            options: [
              "Setting up the workspace and artboards",
              "Exporting for print",
              "Adding the final colour palette",
              "Writing the project brief",
            ],
            answerIndex: 0,
          },
        ],
      },
      {
        slug: "paths-and-curves",
        title: "Quiz · Paths & Curves",
        questions: [
          {
            prompt: "What controls the shape of a curve at an anchor point?",
            options: [
              "Its direction handles",
              "Its stroke weight",
              "Its fill colour",
              "Its layer order",
            ],
            answerIndex: 0,
          },
          {
            prompt:
              "How do you convert a smooth anchor point to a corner point?",
            options: [
              "Click it with the anchor point tool",
              "Double-click the path",
              "Increase the stroke weight",
              "Group the object",
            ],
            answerIndex: 0,
          },
          {
            prompt: "Which selection tool edits individual anchor points?",
            options: ["Direct selection", "Selection", "Magic wand", "Lasso"],
            answerIndex: 0,
          },
          {
            prompt: "What happens when you close a path?",
            options: [
              "The start and end anchor points join",
              "The path is rasterised",
              "The stroke is removed",
              "The object is locked",
            ],
            answerIndex: 0,
          },
          {
            prompt: "Fewer anchor points on a curve generally means:",
            options: [
              "A smoother, cleaner curve",
              "A larger file that renders slower",
              "A curve that can't be edited",
              "No visible difference at all",
            ],
            answerIndex: 0,
          },
          {
            prompt:
              "Which shortcut temporarily switches the pen to direct selection?",
            options: [
              "Holding Cmd / Ctrl",
              "Holding Shift",
              "Pressing Esc",
              "Pressing Tab",
            ],
            answerIndex: 0,
          },
        ],
      },
    ],
    about: {
      description: [
        "Unlock your creative potential with this beginner-friendly illustration course. Ready to embark on a journey into the world of digital art and design? You'll learn the tools, techniques, and workflow used by working illustrators — one clear lesson at a time.",
        "Every section closes with a short exercise you can finish in an evening, so the ideas stick before the next one builds on them. By the end you'll have a repeatable process and a handful of finished pieces you'd actually put in front of a client.",
      ],
      suitFor: [
        "Anyone who wants to start their career & get paid for their illustration design skills.",
        "Beginners, newbies & amateurs in the field of illustration.",
        'Anyone that needs to add "Illustration" to their portfolio.',
        "People new to the world of illustration design.",
      ],
    },
    questions: [
      {
        id: "shape-builder-trial",
        title:
          "Does the shape builder work the same in the free trial version?",
        name: "Omar Farouk",
        timeAgo: "48m ago",
        lessonTag: "Lesson 2 · Mastering Tools",
        answered: true,
        replies: [
          {
            name: "Simon Simorangkir",
            role: "Instructor",
            avatarUrl: knownAvatars["Simon Simorangkir"],
            timeAgo: "30m ago",
            body: "Great question — all core tools including the shape builder are available in the trial. The panel is collapsed by default; enable it under Window › Shape Builder.",
          },
          {
            name: "Nadia Rahman",
            role: "Student",
            avatarUrl: knownAvatars["Nadia Rahman"],
            timeAgo: "12m ago",
            body: "Had the same issue. Enabling it from the Window menu fixed it for me too.",
          },
          {
            name: "Carlos Mendes",
            role: "Student",
            timeAgo: "10m ago",
            body: "Worth noting the trial is the full app for 7 days — nothing is feature-gated, it just stops opening after that.",
          },
          {
            name: "Omar Farouk",
            role: "Student",
            timeAgo: "8m ago",
            body: "Found it, thank you both. It was hiding behind the Window menu exactly as described.",
          },
          {
            name: "Aisha Bello",
            role: "Student",
            timeAgo: "6m ago",
            body: "Does the shape builder keep its keyboard shortcut after the trial expires and you subscribe?",
          },
          {
            name: "Simon Simorangkir",
            role: "Instructor",
            avatarUrl: knownAvatars["Simon Simorangkir"],
            timeAgo: "4m ago",
            body: "It does — shortcuts live in your app preferences, and those carry across from the trial to a paid licence.",
          },
        ],
      },
      {
        id: "font-pairing",
        title:
          "Which font pairing do you recommend for editorial illustration?",
        name: "Aisha Bello",
        timeAgo: "3h ago",
        lessonTag: "Lesson 5 · Typography",
        answered: false,
        replies: [],
      },
      {
        id: "pen-tool-shortcut",
        title:
          "Is there a keyboard shortcut to switch between the pen and direct selection tool?",
        name: "Sofia Almeida",
        timeAgo: "2 days ago",
        lessonTag: "Lesson 6 · Mastering Pen Tool",
        answered: true,
        replies: [
          {
            name: "Simon Simorangkir",
            role: "Instructor",
            avatarUrl: knownAvatars["Simon Simorangkir"],
            timeAgo: "1 day ago",
            body: "Hold Cmd (Ctrl on Windows) while the pen is active — it temporarily switches to direct selection, and releasing puts you straight back on the pen.",
          },
          {
            name: "Omar Farouk",
            role: "Student",
            timeAgo: "22h ago",
            body: "This one changed my whole workflow. No more hopping to the toolbar mid-path.",
          },
        ],
      },
    ],
    rating: 4.9,
    reviewsCount: 1204,
    reviews: [
      {
        name: "Nadia Rahman",
        avatarUrl: knownAvatars["Nadia Rahman"],
        rating: 5,
        timeAgo: "2 days ago",
        body: "The anchor-point section alone was worth it. I traced a full illustration on my first try.",
      },
      {
        name: "Aisha Bello",
        rating: 5,
        timeAgo: "1 month ago",
        body: "Beautifully produced — audio, pacing, and the on-screen callouts are all top tier.",
      },
      {
        name: "Carlos Mendes",
        rating: 4,
        timeAgo: "2 months ago",
        body: "Great fundamentals course. Wish there was a bit more on colour theory, but very solid overall.",
      },
    ],
    notes: [
      {
        id: "note-1",
        timestamp: "2:05",
        body: "Great explanation of the pen tool anchor points.",
      },
      {
        id: "note-2",
        timestamp: "10:40",
        body: "Shortcut for the shape builder — revisit this.",
      },
      {
        id: "note-3",
        timestamp: "25:00",
        body: "Color palette setup starts here.",
      },
    ],
  },
}

/** Bands rather than a single line, so a course barely started and one nearly
 *  finished don't get the same congratulation. */
function buildEncouragement(title: string, progress: number) {
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

function buildSuitFor(course: BrowseCourse) {
  const topic = course.title.toLowerCase()
  const audience =
    course.level === "Beginner" || course.level === "All Levels"
      ? "Beginners, newbies & amateurs"
      : `${course.level} learners ready to go deeper`

  return [
    `Anyone who wants to start their career & get paid for their ${course.category.toLowerCase()} skills.`,
    `${audience} in the field of ${topic}.`,
    `Anyone that needs to add "${course.title}" to their portfolio.`,
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
function buildSections(
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

function buildQuizzes(sections: CourseSection[]): CourseQuiz[] {
  return sections.flatMap((section) =>
    section.lessons
      .filter((lesson) => lesson.type === "quiz")
      .map((lesson) => buildQuiz(lesson.title, lesson.questions ?? 5))
  )
}

/** Two seeded questions per course, tagged against the course's own lessons
 *  so the "Lesson N · Title" chips point at something that exists. */
function buildQuestions(
  course: BrowseCourse,
  sections: PlayerSection[],
  instructor: CoursePlayerCourse["instructor"]
): CourseQuestion[] {
  const lessons = sections.flatMap((section) => section.lessons)
  const tagFor = (index: number) => {
    const lesson = lessons[index % Math.max(1, lessons.length)]
    return lesson
      ? `Lesson ${(index % lessons.length) + 1} · ${lesson.title}`
      : course.title
  }

  return [
    {
      id: `${course.slug}-pacing`,
      title: `Is it worth doing the exercises before moving on to the next section?`,
      name: "Aisha Bello",
      timeAgo: "5h ago",
      lessonTag: tagFor(1),
      answered: true,
      replies: [
        {
          name: instructor.name,
          role: "Instructor",
          avatarUrl: instructor.avatarUrl,
          timeAgo: "3h ago",
          body: "Yes — every section is built to close on its exercise, and the next one assumes you've done it. Twenty minutes there saves an hour later.",
        },
      ],
    },
    {
      id: `${course.slug}-setup`,
      title: `Do I need anything installed before starting the course?`,
      name: "Omar Farouk",
      timeAgo: "2 days ago",
      lessonTag: tagFor(0),
      answered: false,
      replies: [],
    },
  ]
}

/**
 * Every enrolled course page, keyed by slug. Returns `undefined` for a slug
 * that isn't a real course so the route can 404 rather than render an empty
 * shell.
 */
export function getCoursePlayer(slug: string): CoursePlayerCourse | undefined {
  const course = browseCourses.find((entry) => entry.slug === slug)
  const detail = getCourseDetail(slug)
  if (!course || !detail) return undefined

  const base = { slug: course.slug, title: course.title, art: course.art }
  const flagship = flagshipPlayers[slug]
  if (flagship) return { ...base, ...flagship }

  // A course the student hasn't enrolled in still has to render — the sale
  // page links here from "Go to course" once a purchase lands — so an absent
  // enrolment is simply zero progress rather than a missing page.
  const enrollment = enrollmentBySlug(slug)
  const completedLessons = enrollment?.completedLessons ?? 0
  const progress = enrollment?.progress ?? 0

  const instructor = {
    name: detail.instructorProfile.name,
    title: detail.instructorProfile.title,
    avatarUrl: detail.instructorProfile.avatarUrl,
  }
  const sections = buildSections(detail.sections, completedLessons)

  return {
    ...base,
    instructor,
    progress,
    encouragement: buildEncouragement(course.title, progress),
    sections,
    quizzes: buildQuizzes(detail.sections),
    about: {
      description: detail.description,
      suitFor: buildSuitFor(course),
    },
    questions: buildQuestions(course, sections, instructor),
    rating: course.rating,
    reviewsCount: detail.reviewsCount,
    reviews: detail.studentReviews,
    // A student's own notes start empty — there's nothing to seed them from,
    // and the Notes tab draws its own empty state.
    notes: [],
  }
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

/** One quiz on one course, for `/dashboard/learning/[slug]/quiz/[quizSlug]`.
 *  `undefined` when either half doesn't resolve, so the route can 404 rather
 *  than render an empty shell. */
export function getCourseQuiz(courseSlug: string, quizSlug: string) {
  const course = getCoursePlayer(courseSlug)
  const quiz = course?.quizzes.find((entry) => entry.slug === quizSlug)
  return course && quiz ? { course, quiz } : undefined
}
