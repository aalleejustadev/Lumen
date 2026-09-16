import type { CourseStatus } from "@/lib/generated/prisma/client"
import type {
  InstructorCoursesQuery,
  MyCoursesTab,
} from "@/lib/instructor-courses"

/**
 * Everything `/dashboard/instructor/courses` *says*, and nothing it counts —
 * the split every surface in this codebase makes: the figures come out of
 * `lib/instructor-courses.ts`, the phrasing around them lives here.
 *
 * It also carries the page size, the tab vocabulary and the client-safe
 * helpers, for the mechanical reason `admin-users.ts` records: the board is a
 * Client Component and needs all three, and importing any *value* from
 * `lib/instructor-courses.ts` would drag `lib/db` and the Postgres driver into
 * the browser bundle. This module imports nothing but types, so it crosses
 * freely.
 */

/** Five rows — the export's own footer says "Showing 1–5 of 10 courses". */
export const COURSES_PAGE_SIZE = 5

export const myCoursesCopy = {
  title: "My Courses",
  description:
    "Manage what you teach — edit lessons, track enrolment, and publish updates.",
  createCourse: "Create Course",
  searchPlaceholder: "Search your courses...",
  /** The primary action on a row, by whether the course has ever been live. */
  manage: "Manage",
  continueEditing: "Continue editing",
  /**
   * Why **Continue editing** is inert, and Create Course with it. There is no
   * authoring flow — no `/dashboard/instructor/courses/new` and no editor
   * behind it — so those two render disabled with this on them rather than
   * linking onto a 404. That is the treatment the Help Center gives "Open
   * Discussions" and the inbox gives its paperclip, and like the Help Center's
   * the flag is read off `instructorNav` rather than written down again, so
   * both light up on their own the day Create Course flips to `built: true`.
   *
   * **Manage is not one of them.** `/dashboard/instructor/courses/[slug]` is
   * built, so a course that has been live links straight to it; see
   * `my-course-row.tsx`.
   */
  authoringUnavailable:
    "The course editor isn't built yet — this lights up with Create Course.",
  built: (percent: number) => `${percent}% built`,
  showing: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total} ${total === 1 ? "course" : "courses"}`,
  noMatches: "No course matches that filter.",
  empty: {
    title: "No courses yet",
    description:
      "Everything you teach shows up here once you publish your first course.",
  },
} as const

/** The `⋯` menu — see `course-row-actions.tsx` for why each item is what it is. */
export const courseRowMenu = {
  label: "Actions for",
  viewSalePage: "View sale page",
  viewSalePageUnavailable:
    "A course only has a sale page once it is published.",
  questions: "Questions about this course",
  coupons: "Coupons for this course",
} as const

export const myCoursesStats = {
  published: "Published",
  drafts: "Drafts",
  students: "Students",
  rating: "Avg. rating",
} as const

/**
 * The four tabs, exactly as drawn.
 *
 * `CourseStatus` has six members and the export names three of them, so two
 * calls had to be made:
 *
 *  - **Drafts is DRAFT *and* NEEDS_CHANGES.** A course the console sent back
 *    is in the instructor's hands again and nowhere else on this page would
 *    list it; its pill still reads "Needs changes", so the row says why it is
 *    there. Grouping them is what stops the most urgent course an instructor
 *    has being reachable only from All.
 *  - **REJECTED and ARCHIVED get no tab of their own.** Neither is work: one
 *    was turned down and cannot be resubmitted against, the other was
 *    deliberately retired. They are listed under All with their own pills
 *    rather than given a tab that is empty on almost every account.
 */
export const myCoursesTabs: { value: MyCoursesTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "drafts", label: "Drafts" },
  { value: "in-review", label: "In review" },
]

export const myCoursesTabValues = new Set<string>(
  myCoursesTabs.map((tab) => tab.value)
)

/** Which statuses a tab means. `all` is every status this instructor owns. */
export const tabStatuses: Record<MyCoursesTab, CourseStatus[] | null> = {
  all: null,
  published: ["PUBLISHED"],
  drafts: ["DRAFT", "NEEDS_CHANGES"],
  "in-review": ["IN_REVIEW"],
}

export function isMyCoursesFiltered(query: InstructorCoursesQuery): boolean {
  return query.tab !== "all" || query.query !== ""
}

/**
 * Whether a course has ever been live, which decides two things at once: the
 * label on its primary button, and whether the row draws the progress bar or
 * the students/rating/revenue chips.
 *
 * The export settles it by example — its two Published rows carry "Manage" and
 * the full meta line with no bar, its Draft and In-review rows carry "Continue
 * editing", a bar, and nothing but a lesson count. An archived course is
 * grouped with the live ones because it *was* live: it has students, a rating
 * and revenue, and a "45% built" bar under it would say something false.
 */
export function hasBeenLive(status: CourseStatus): boolean {
  return status === "PUBLISHED" || status === "ARCHIVED"
}
