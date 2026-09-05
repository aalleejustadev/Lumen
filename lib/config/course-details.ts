import { browseCourses, type BrowseCourse } from "@/lib/config/browse-courses"

/**
 * Demo content for `/dashboard/courses/[slug]`, measured off
 * `ui-design/light/dashboard/student/course-sale-page-part-{1,2}.png`.
 * `Course`, `Instructor`, `CourseSection`, `CourseLesson` and `CourseReview`
 * now exist in `prisma/schema.prisma` — the shape is ready — but there's
 * still no instructor-authoring flow to populate them, so (same arrangement
 * as `lib/config/browse-courses.ts`) this file remains the data source.
 *
 * Only `python-for-everybody` (the export's own course) is hand-authored to
 * match the design exactly, including a few things the export itself gets
 * "wrong" on purpose — kept as-is because the brief is to match the export,
 * not to fix it:
 *  - the hero description, "What you'll learn", "Requirements" and
 *    "Description" are all about illustration/vector work, not Python
 *  - one review name-drops "Simon", not Marco (the instructor shown)
 * Every other course gets a plausible detail page generated from its
 * `BrowseCourse` row, so every card in Browse Courses leads somewhere real
 * — see `buildGeneratedDetail` below.
 */

export type LessonType = "video" | "article" | "quiz" | "practice"

export type CourseLesson = {
  title: string
  type: LessonType
  /** Video/article/practice rows show this ("20 min"). */
  minutes?: number
  /** Quiz rows show this ("5 questions") instead of a duration. */
  questions?: number
  /** The blue "Preview" link — free to watch without buying. */
  preview?: boolean
  /** Runtime of the free preview *clip*, in seconds, shown on the preview
   *  player's scrubber as M:SS (`course-preview-dialog.tsx`). Only meaningful
   *  alongside `preview`, and shorter than `minutes` because the clip is an
   *  excerpt — which is why the syllabus and the player quote different
   *  numbers for the same lesson, exactly as the two exports do. Without it
   *  the player falls back to formatting `minutes`. */
  previewSeconds?: number
}

export type CourseSection = {
  title: string
  lessonsLabel: string
  durationLabel: string
  lessons: CourseLesson[]
}

export type CourseInstructorProfile = {
  name: string
  title: string
  bio: string
  avatarUrl?: string
  teachingSince: number
  rating: number
  reviewsCount: number
  studentsCount: number
  coursesCount: number
}

export type CourseReview = {
  name: string
  avatarUrl?: string
  rating: number
  timeAgo: string
  body: string
}

export type RatingBreakdownRow = { stars: 5 | 4 | 3 | 2 | 1; percent: number }

export type CourseDetail = BrowseCourse & {
  subtitle: string
  description: string[]
  learningOutcomes: string[]
  requirements: string[]
  /** Written reviews on this course specifically — distinct from
   *  `reviews` (inherited from `BrowseCourse`), which is the enrolled/rated
   *  student count the catalog card and hero "students" stat show. Far fewer
   *  students leave a written review than take the course. */
  reviewsCount: number
  saleEndsInDays: number
  discountPercent: number
  includes: {
    videoHours: number
    articlesCount: number
    quizzesCount: number
    downloadableResources: boolean
    certificate: boolean
    lifetimeAccess: boolean
  }
  contentSummary: string
  sections: CourseSection[]
  instructorProfile: CourseInstructorProfile
  studentReviews: CourseReview[]
  ratingBreakdown: RatingBreakdownRow[]
}

type DetailExtras = Omit<CourseDetail, keyof BrowseCourse>

/** Real headshots supplied for the marketing testimonials
 * (`lib/config/testimonials.ts`) — reused here since they're the same named
 * people, not a stock-photo integration (see `lumen-course-card-art`).
 * Everyone else gets an initials fallback (`AvatarFallback`). */
const knownInstructorProfiles: Record<
  string,
  Omit<
    CourseInstructorProfile,
    "rating" | "reviewsCount" | "studentsCount" | "coursesCount"
  >
> = {
  "Marco Devine": {
    name: "Marco Devine",
    title: "Illustrator at Google",
    avatarUrl: "/testimonials/marco-devine.png",
    teachingSince: 2021,
    bio: "Twelve years drawing for a living — editorial, then product design, and for the last five years at Google building illustration systems used across dozens of surfaces.",
  },
  "Simon Simorangkir": {
    name: "Simon Simorangkir",
    title: "Product Designer & Design Educator",
    avatarUrl: "/testimonials/simon-simorangkir.png",
    teachingSince: 2020,
    bio: "A product designer who has spent the last several years building design systems, now teaching the same practical, project-based process to everyone else.",
  },
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${String(mins).padStart(2, "0")}m`
}

/** python-for-everybody — hand-authored to match the export exactly. */
const flagshipDetails: Record<string, DetailExtras> = {
  "python-for-everybody": {
    subtitle:
      "Build a repeatable vector workflow — from first rough shape to a finished, portfolio-ready illustration.",
    description: [
      "Most people who think they cannot draw are simply missing a workflow. This course gives you one — a repeatable process that takes you from a rough shape to a finished, exportable illustration without guesswork.",
      "We start with the tools that actually matter, then build up through paths, colour systems, and typography, closing with a complete piece you can put straight into a portfolio. Every section ends with a short quiz so you know the ideas landed before moving on.",
    ],
    learningOutcomes: [
      "Draw confident vector shapes with the pen tool",
      "Build a reusable colour and type system",
      "Trace and refine artwork without fighting anchor points",
      "Export cleanly for web, print, and product surfaces",
      "Develop a personal illustration style that scales",
      "Finish a complete piece you can put in a portfolio",
    ],
    requirements: [
      "Any vector editor — Illustrator, Affinity, or Figma all work",
      "No prior illustration experience needed",
      "A mouse is fine; a tablet is a bonus, not a requirement",
    ],
    reviewsCount: 1204,
    saleEndsInDays: 2,
    discountPercent: 83,
    includes: {
      videoHours: 24,
      articlesCount: 8,
      quizzesCount: 3,
      downloadableResources: true,
      certificate: true,
      lifetimeAccess: true,
    },
    contentSummary: "4 sections · 16 lessons · 38h",
    sections: [
      {
        title: "Getting your bearings",
        lessonsLabel: "4 lessons",
        durationLabel: "1h 20m",
        lessons: [
          {
            title: "Introduction",
            type: "video",
            minutes: 20,
            preview: true,
            previewSeconds: 252,
          },
          {
            title: "Setting up your workspace",
            type: "video",
            minutes: 18,
            preview: true,
            previewSeconds: 400,
          },
          { title: "Mastering Tools", type: "practice", minutes: 32 },
          { title: "Quiz · Tools & Workflow", type: "quiz", questions: 5 },
        ],
      },
      {
        title: "Shapes, paths, and the pen tool",
        lessonsLabel: "5 lessons",
        durationLabel: "3h 10m",
        lessons: [
          { title: "Anatomy of a vector shape", type: "video", minutes: 22 },
          { title: "Drawing with the pen tool", type: "video", minutes: 35 },
          {
            title: "Editing anchor points and handles",
            type: "video",
            minutes: 28,
          },
          {
            title: "Boolean operations and compound paths",
            type: "practice",
            minutes: 40,
          },
          { title: "Quiz · Paths & Anchors", type: "quiz", questions: 6 },
        ],
      },
      {
        title: "Colour and typography systems",
        lessonsLabel: "4 lessons",
        durationLabel: "2h 05m",
        lessons: [
          { title: "Building a colour palette", type: "video", minutes: 25 },
          {
            title: "Reusable swatches and styles",
            type: "video",
            minutes: 20,
          },
          { title: "Pairing and setting type", type: "video", minutes: 30 },
          { title: "Quiz · Colour & Type", type: "quiz", questions: 5 },
        ],
      },
      {
        title: "Finishing and exporting",
        lessonsLabel: "3 lessons",
        durationLabel: "1h 40m",
        lessons: [
          {
            title: "Preparing artwork for export",
            type: "video",
            minutes: 25,
          },
          {
            title: "Exporting for web, print, and product",
            type: "video",
            minutes: 30,
          },
          {
            title: "Final project: portfolio piece",
            type: "practice",
            minutes: 45,
          },
        ],
      },
    ],
    instructorProfile: {
      ...knownInstructorProfiles["Marco Devine"]!,
      rating: 4.9,
      reviewsCount: 1204,
      studentsCount: 28410,
      coursesCount: 6,
    },
    studentReviews: [
      {
        name: "Nadia Rahman",
        avatarUrl: "/testimonials/nadia-rahman.png",
        rating: 5,
        timeAgo: "2 days ago",
        body: "The anchor-point section alone was worth it. I traced a full illustration on my first try after weeks of struggling.",
      },
      {
        name: "Aisha Bello",
        rating: 5,
        timeAgo: "1 month ago",
        body: "Beautifully produced — audio, pacing, and the on-screen callouts are all top tier. Simon explains the why, not just the clicks.",
      },
    ],
    ratingBreakdown: [
      { stars: 5, percent: 78 },
      { stars: 4, percent: 16 },
      { stars: 3, percent: 4 },
      { stars: 2, percent: 1 },
      { stars: 1, percent: 1 },
    ],
  },
}

const genericLearningOutcomes = (category: string) => [
  `Get comfortable with the core ${category} toolkit`,
  "Apply what you learn to a real, portfolio-ready project",
  `Avoid the most common beginner mistakes in ${category}`,
  "Build a repeatable workflow you can reuse on future work",
  'Understand the "why" behind each technique, not just the steps',
  "Finish with a complete project you can show off",
]

const genericRequirements = (level: BrowseCourse["level"], category: string) =>
  level === "Advanced" || level === "Intermediate"
    ? [
        `Basic familiarity with ${category}`,
        "A computer with a reliable internet connection",
        "Comfort following along with hands-on exercises",
      ]
    : [
        "No prior experience required",
        "A computer with a reliable internet connection",
        "Willingness to practice along with each lesson",
      ]

const reviewPool: Omit<CourseReview, "rating">[] = [
  {
    name: "Jordan Pierce",
    timeAgo: "4 days ago",
    body: "Clear, well-paced, and the projects actually feel useful rather than throwaway exercises.",
  },
  {
    name: "Elena Marsh",
    timeAgo: "2 weeks ago",
    body: "Exactly what I needed to go from watching tutorials to actually building things myself.",
  },
  {
    name: "Tomás Rivera",
    timeAgo: "3 weeks ago",
    body: "Good depth without dragging — every section ties back to the final project.",
  },
]

const SECTION_TITLES = [
  "Getting started",
  "Core concepts",
  "Applied practice",
  "Wrapping up",
]
const SECTION_WEIGHTS = [0.3, 0.3, 0.25, 0.15]
const LESSON_TEMPLATES = [
  "Introduction",
  "Setting up your workflow",
  "Working through real examples",
  "Common pitfalls and how to avoid them",
  "Putting it into practice",
]

function buildSections(course: BrowseCourse): CourseSection[] {
  const totalMinutes = course.durationHours * 60
  let lessonIndex = 0

  return SECTION_TITLES.map((title, sectionIndex) => {
    const isLast = sectionIndex === SECTION_TITLES.length - 1
    const sectionMinutes = Math.max(
      30,
      Math.round(totalMinutes * SECTION_WEIGHTS[sectionIndex]!)
    )
    // One content lesson per ~18 minutes of section time (2-6 of them), so a
    // long course gets more, shorter lessons rather than a couple of
    // implausibly long ones — `perLessonMinutes` below is clamped for the
    // same reason.
    // Capped at `LESSON_TEMPLATES.length` so a single section never repeats
    // a lesson title.
    const contentLessonCount = Math.min(
      LESSON_TEMPLATES.length,
      Math.max(2, Math.round(sectionMinutes / 18))
    )
    const perLessonMinutes = Math.min(
      40,
      Math.max(8, Math.round(sectionMinutes / contentLessonCount))
    )

    const lessons: CourseLesson[] = []
    for (let i = 0; i < contentLessonCount; i++) {
      lessons.push({
        title: LESSON_TEMPLATES[lessonIndex % LESSON_TEMPLATES.length]!,
        type: i % 2 === 0 ? "video" : "practice",
        minutes: perLessonMinutes,
        preview: sectionIndex === 0 && i === 0,
      })
      lessonIndex++
    }
    lessons.push(
      isLast
        ? {
            title: "Final project",
            type: "practice",
            minutes: Math.min(60, perLessonMinutes * 2),
          }
        : { title: `Quiz · ${title}`, type: "quiz", questions: 5 }
    )

    const actualMinutes = lessons.reduce(
      (sum, lesson) => sum + (lesson.minutes ?? 0),
      0
    )

    return {
      title,
      lessonsLabel: `${lessons.length} lessons`,
      durationLabel: formatDuration(actualMinutes),
      lessons,
    }
  })
}

/** ~2.5% of students leaving a written review, floored at a believable
 *  minimum — mirrors the flagship's own ratio (1,204 reviews / 48,300
 *  students). Shared by a course's own `reviewsCount` and the instructor
 *  stats' aggregate, so the two stay consistent with each other. */
function deriveReviewsCount(students: number) {
  return Math.max(20, Math.round(students * 0.025))
}

function buildInstructorProfile(course: BrowseCourse): CourseInstructorProfile {
  const coursesByInstructor = browseCourses.filter(
    (candidate) => candidate.instructor === course.instructor
  )
  const totalStudents = coursesByInstructor.reduce(
    (sum, candidate) => sum + candidate.reviews,
    0
  )
  const totalReviews = coursesByInstructor.reduce(
    (sum, candidate) => sum + deriveReviewsCount(candidate.reviews),
    0
  )
  const avgRating =
    coursesByInstructor.reduce((sum, candidate) => sum + candidate.rating, 0) /
    coursesByInstructor.length

  const known = knownInstructorProfiles[course.instructor]

  return {
    name: course.instructor,
    title: known?.title ?? `${course.category} Instructor`,
    bio:
      known?.bio ??
      `Has taught ${coursesByInstructor.length} course${coursesByInstructor.length === 1 ? "" : "s"} on Lumen, helping students build real, practical skills in ${course.category}.`,
    avatarUrl: known?.avatarUrl,
    teachingSince: known?.teachingSince ?? 2022,
    rating: Math.round(avgRating * 10) / 10,
    reviewsCount: totalReviews,
    studentsCount: totalStudents,
    coursesCount: coursesByInstructor.length,
  }
}

function buildRatingBreakdown(rating: number): RatingBreakdownRow[] {
  // A heuristic shape, not a real distribution: higher rating skews harder
  // toward 5★, everything else splits the remainder in descending order.
  const fiveStar = Math.min(
    90,
    Math.max(50, Math.round(40 + (rating - 3.5) * 40))
  )
  const remaining = 100 - fiveStar
  const fourStar = Math.round(remaining * 0.6)
  const threeStar = Math.round(remaining * 0.25)
  const twoStar = Math.round(remaining * 0.1)
  const oneStar = 100 - fiveStar - fourStar - threeStar - twoStar

  return [
    { stars: 5, percent: fiveStar },
    { stars: 4, percent: fourStar },
    { stars: 3, percent: threeStar },
    { stars: 2, percent: twoStar },
    { stars: 1, percent: Math.max(0, oneStar) },
  ]
}

function buildGeneratedDetail(course: BrowseCourse): DetailExtras {
  const sections = buildSections(course)
  const totalLessons = sections.reduce(
    (sum, section) => sum + section.lessons.length,
    0
  )
  const quizzesCount = sections.reduce(
    (sum, section) =>
      sum + section.lessons.filter((lesson) => lesson.type === "quiz").length,
    0
  )
  const reviewSeed = reviewPool[course.id % reviewPool.length]!
  const secondReviewSeed = reviewPool[(course.id + 1) % reviewPool.length]!

  return {
    subtitle: `A practical, project-based path through ${course.title.toLowerCase()} — built for ${
      course.level === "All Levels"
        ? "learners at any level"
        : `${course.level.toLowerCase()} learners`
    }.`,
    description: [
      `${course.title} is built around real work, not theory for its own sake — you'll spend most of your time inside the same tools and workflows used on the job.`,
      "Each section builds on the last and closes with a short check so the ideas stick before you move on to the next one.",
    ],
    learningOutcomes: genericLearningOutcomes(course.category),
    requirements: genericRequirements(course.level, course.category),
    reviewsCount: deriveReviewsCount(course.reviews),
    saleEndsInDays: 2,
    discountPercent: Math.round((1 - course.price / course.listPrice) * 100),
    includes: {
      videoHours: Math.max(1, Math.round(course.durationHours * 0.7)),
      articlesCount: course.level === "Beginner" ? 4 : 6,
      quizzesCount,
      downloadableResources: true,
      certificate: true,
      lifetimeAccess: true,
    },
    contentSummary: `${sections.length} sections · ${totalLessons} lessons · ${course.durationHours}h`,
    sections,
    instructorProfile: buildInstructorProfile(course),
    studentReviews: [
      {
        name: reviewSeed.name,
        timeAgo: reviewSeed.timeAgo,
        rating: 5,
        body: reviewSeed.body,
      },
      {
        name: secondReviewSeed.name,
        timeAgo: secondReviewSeed.timeAgo,
        rating: 5,
        body: secondReviewSeed.body,
      },
    ],
    ratingBreakdown: buildRatingBreakdown(course.rating),
  }
}

export function getCourseDetail(slug: string): CourseDetail | undefined {
  const course = browseCourses.find((candidate) => candidate.slug === slug)
  if (!course) return undefined

  const extras = flagshipDetails[slug] ?? buildGeneratedDetail(course)
  return { ...course, ...extras }
}
