import {
  AwardIcon,
  BookOpenIcon,
  CircleCheckIcon,
  ClockIcon,
  type LucideIcon,
} from "lucide-react"

import { browseCourses, type BrowseCourse } from "@/lib/config/browse-courses"

/**
 * Demo content for `/dashboard/learning`, measured off
 * `ui-design/light/dashboard/student/my-learning-page.png`.
 *
 * Enrolment progress is the one thing no other config holds, so that — and
 * only that — is seeded here: everything the card shows about the *course*
 * (title, instructor, category, art, icon) is resolved out of
 * `lib/config/browse-courses.ts` by slug, the same way `lib/cart.ts` does it,
 * so the two surfaces can't drift. A slug that no longer resolves is dropped
 * rather than rendered as a half-empty card.
 *
 * There is no `Enrollment` model in `prisma/schema.prisma` yet — swap
 * `enrollmentSeeds` for a real query once one exists; nothing downstream has
 * to change shape.
 */

export type EnrollmentSeed = {
  slug: string
  completedLessons: number
  totalLessons: number
  /**
   * 0-100, and deliberately *not* `completedLessons / totalLessons` — the
   * export's four cards disagree with that ratio by a point or two each
   * (14/25 shows 55%, 35/52 shows 68%), which is what a time-weighted
   * progress figure looks like. Stored rather than derived so it stays
   * honest once real watch-time lands.
   */
  progress: number
  /** The lesson the Continue button resumes at; `null` once finished. */
  nextLesson: string | null
}

export type EnrolledCourse = BrowseCourse &
  Omit<EnrollmentSeed, "slug"> & { completed: boolean }

/** The export's page 1 is the first four, in this order. The fifth is what
 *  makes the "In Progress 5" stat and the export's two pages agree. */
const inProgressSeeds: EnrollmentSeed[] = [
  {
    slug: "mastering-illustration",
    completedLessons: 14,
    totalLessons: 25,
    progress: 55,
    nextLesson: "Mastering Tools",
  },
  {
    slug: "the-complete-react-bootcamp",
    completedLessons: 35,
    totalLessons: 52,
    progress: 68,
    nextLesson: "Context & Reducers",
  },
  {
    slug: "machine-learning-a-z",
    completedLessons: 9,
    totalLessons: 44,
    progress: 20,
    nextLesson: "Regression Models",
  },
  {
    slug: "financial-modeling-masterclass",
    completedLessons: 13,
    totalLessons: 30,
    progress: 42,
    nextLesson: "Discounted Cash Flow",
  },
  {
    slug: "advanced-typescript-patterns",
    completedLessons: 6,
    totalLessons: 28,
    progress: 24,
    nextLesson: "Conditional Types",
  },
]

/** Nine, to match the export's "Completed 9". None of these overlap the
 *  in-progress slugs — a course is in one bucket or the other. */
const completedSeeds: EnrollmentSeed[] = [
  { slug: "python-for-everybody", totalLessons: 32 },
  { slug: "design-systems-in-figma", totalLessons: 26 },
  { slug: "digital-marketing-complete", totalLessons: 34 },
  { slug: "photography-foundations", totalLessons: 18 },
  { slug: "startup-finance-101", totalLessons: 22 },
  { slug: "seo-and-content-strategy", totalLessons: 20 },
  { slug: "nodejs-for-backend-developers", totalLessons: 29 },
  { slug: "colour-theory-for-designers", totalLessons: 16 },
  { slug: "icon-design-fundamentals", totalLessons: 14 },
].map(({ slug, totalLessons }) => ({
  slug,
  totalLessons,
  completedLessons: totalLessons,
  progress: 100,
  nextLesson: null,
}))

function resolve(seeds: EnrollmentSeed[], completed: boolean) {
  return seeds.flatMap<EnrolledCourse>(({ slug, ...enrollment }) => {
    const course = browseCourses.find((entry) => entry.slug === slug)
    return course ? [{ ...course, ...enrollment, completed }] : []
  })
}

export const inProgressCourses = resolve(inProgressSeeds, false)
export const completedCourses = resolve(completedSeeds, true)

/** The enrolment behind one course, across both buckets — what
 *  `lib/config/course-player.ts` reads so the enrolled course page's progress
 *  and the card's progress bar come from the same seed. `undefined` for a
 *  course the student isn't enrolled in. */
export function enrollmentBySlug(slug: string): EnrolledCourse | undefined {
  return [...inProgressCourses, ...completedCourses].find(
    (course) => course.slug === slug
  )
}

export const learningTabs = [
  { value: "in-progress", label: "In Progress", courses: inProgressCourses },
  { value: "completed", label: "Completed", courses: completedCourses },
] as const

export type LearningTabValue = (typeof learningTabs)[number]["value"]

/** One row of four courses, which is what the export's page 1 shows. */
export const LEARNING_PER_PAGE = 4

export type LearningStat = {
  icon: LucideIcon
  value: string
  label: string
}

/** Hours and certificates are standalone demo numbers — there's nothing to
 *  derive them from yet. The first two are counts of the lists above, so the
 *  stat row and the tab badges can't disagree. */
export const learningStats: LearningStat[] = [
  {
    icon: BookOpenIcon,
    value: String(inProgressCourses.length),
    label: "In Progress",
  },
  {
    icon: CircleCheckIcon,
    value: String(completedCourses.length),
    label: "Completed",
  },
  { icon: ClockIcon, value: "128", label: "Hours Learned" },
  { icon: AwardIcon, value: "7", label: "Certificates" },
]
