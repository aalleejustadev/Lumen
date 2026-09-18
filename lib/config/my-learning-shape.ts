/**
 * My Learning's row and stat shapes, apart from the reads that build them.
 *
 * `lib/learning.ts` is `server-only` and the courses grid is a Client
 * Component, so the shape lives here where both can import it — the split
 * `lib/config/catalog-shape.ts` records, and the reason `lib/admin/users.ts`
 * keeps `USERS_PAGE_SIZE` out of its own module.
 */
export type EnrolledCourse = {
  id: string
  slug: string
  title: string
  instructor: string
  categoryName: string
  categorySlug: string
  art: string
  thumbnailUrl: string | null
  level: string
  durationHours: number
  rating: number
  reviews: number
  price: number
  listPrice: number
  completedLessons: number
  totalLessons: number
  /** `Enrollment.progressPercent` — stored, not a lesson ratio. */
  progress: number
  nextLesson: string
  completed: boolean
}

export type LearningStat = {
  label: string
  value: string
  icon: string
}

/** Four a page, two across — the export's own rhythm. */
export const LEARNING_PER_PAGE = 4

export const learningTabs = [
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const

export type LearningTabValue = (typeof learningTabs)[number]["value"]
