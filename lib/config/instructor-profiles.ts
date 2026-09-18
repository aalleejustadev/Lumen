import {
  type BrowseCourse,
  type BrowseCourseCategory,
} from "@/lib/config/browse-courses"

/**
 * Demo content for `/dashboard/instructors/[slug]`, measured off
 * `ui-design/light/dashboard/student/instructor-page__part{1,2}.png`. Same
 * arrangement as `browse-courses.ts` / `course-details.ts`: `Instructor` in
 * `prisma/schema.prisma` has the real columns now (`slug`, `about`,
 * `skills`, …), but there's no instructor-authoring flow yet to populate
 * them, so this file remains the data source.
 *
 * Only Simon Simorangkir (the export's own instructor) is hand-authored to
 * match the design exactly — including the reused-placeholder-text quirks
 * already noted for `course-details.ts` (his title here, "Illustrator at
 * Google", is verbatim Marco Devine's from the course sale page; the two
 * reviews below are shorter than the versions of the same two reviews shown
 * on `python-for-everybody`'s sale page). Every other instructor gets a
 * plausible profile generated from their `BrowseCourse` rows.
 */

export type InstructorReview = {
  name: string
  avatarUrl?: string
  rating: number
  timeAgo: string
  body: string
}

export type InstructorProfile = {
  slug: string
  name: string
  title: string
  avatarUrl?: string
  teachingSince: number
  rating: number
  reviewsCount: number
  studentsCount: number
  about: string[]
  skills: string[]
  reviews: InstructorReview[]
  courses: BrowseCourse[]
}

/**
 * A course as the profile page's cards draw it — plain data, so it crosses into
 * the client `InstructorCoursesSection` without the `icon` function a
 * `BrowseCourse` carries.
 *
 * It exists because a profile now resolves from **two catalogs**
 * (`lib/public-instructor.ts`): the static demo courses, and database courses,
 * whose categories ("Web Development", "Development") are not in
 * `BrowseCourseCategory` and whose only rendering page is the enrolled course
 * page. So the card is told its label, its artwork, its glyph's vocabulary and
 * its link, rather than deriving all four from a catalog row.
 */
export type ProfileCourse = {
  slug: string
  title: string
  categoryLabel: string
  /** Tailwind gradient stops. */
  art: string
  /** Which icon table the glyph comes from — the catalog's, keyed by category
   *  name, or the console's, keyed by category slug. */
  glyph:
    | { from: "catalog"; category: BrowseCourseCategory }
    | { from: "database"; categorySlug: string }
  /** An instructor-uploaded cover, drawn over the gradient when set. */
  thumbnailUrl: string | null
  rating: number
  reviews: number
  durationHours: number
  /** Dollars, for the card's "$13.99". */
  price: number
  listPrice: number
  href: string
}

export type PublicInstructorProfile = Omit<InstructorProfile, "courses"> & {
  courses: ProfileCourse[]
}

/** A static catalog course, as a card. Its link is the sale page, which every
 *  catalog course has. */
export function instructorSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const NAME_TITLES = new Set([
  "dr",
  "dr.",
  "mr",
  "mr.",
  "mrs",
  "mrs.",
  "ms",
  "ms.",
  "prof",
  "prof.",
])

/** "Dr. Elias Vance" -> "Elias", not "Dr." — used for "About {firstName}" /
 *  "Courses by {firstName}" and the generated review copy below. */
export function firstNameOf(fullName: string) {
  const parts = fullName.split(" ").filter(Boolean)
  const index = parts.findIndex((part) => !NAME_TITLES.has(part.toLowerCase()))
  return parts[index === -1 ? 0 : index] ?? fullName
}

/** "Dr. Elias Vance" -> "EV", not "DEV" — first-name and last-word initials,
 *  skipping a leading title the same way `firstNameOf` does. */
export function initialsOf(fullName: string) {
  const parts = fullName.split(" ").filter(Boolean)
  const first = firstNameOf(fullName)
  const last = parts[parts.length - 1]
  const secondInitial = last && last !== first ? (last[0] ?? "") : ""
  return `${first[0] ?? ""}${secondInitial}`.toUpperCase()
}

/**
 * **The authored profiles that used to live here are gone.** A public
 * instructor page is built from the `Instructor` row, its published
 * courses and its real `CourseReview` rows — see `lib/public-instructor.ts`,
 * which assembles this same shape from the database. What stays is the
 * shape and the three name helpers, which strip a leading title so
 * "Dr. Elias Vance" renders as "About Elias" rather than "About Dr.".
 */
