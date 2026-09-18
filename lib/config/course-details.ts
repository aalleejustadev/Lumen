import type { BrowseCourse } from "@/lib/config/browse-courses"

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
  /** `CourseLesson.id`, on a database course — what lets its syllabus row open
   *  the preview dialog on that lesson. */
  id?: string
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
  /** `Instructor.slug`, on a database course — see `instructorProfileHref`. */
  slug?: string
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
  /** An instructor-uploaded cover, on a database course. */
  thumbnailUrl?: string | null
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

/** Real headshots supplied for the marketing testimonials
 * (`lib/config/testimonials.ts`) — reused here since they're the same named
 * people, not a stock-photo integration (see `lumen-course-card-art`).
 * Everyone else gets an initials fallback (`AvatarFallback`). */
/**
 * **The authored course content that used to live here is gone.** A sale
 * page is built from `Course`, its sections, its lessons and its real
 * `CourseReview` rows now — see `lib/course-sale.ts`, which assembles this
 * same `CourseDetail` shape from the database. What stays is the shape
 * itself, which the sale page's seven cards are all typed against.
 */
