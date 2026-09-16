import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import {
  COURSES_PAGE_SIZE,
  myCoursesTabValues,
  tabStatuses,
} from "@/lib/config/instructor-courses"
import type { CourseStatus, Prisma } from "@/lib/generated/prisma/client"

/**
 * The reads behind `/dashboard/instructor/courses`, from
 * `ui-design/light/dashboard/instructor/my-courses-page.png`.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy, the page size and the tab vocabulary live in
 * `lib/config/instructor-courses.ts` so the board can import them freely.
 *
 * **Nothing on the page is demo data and it needed no migration** — `Course`
 * carried every column these two exports ask for, docstrings and all
 * (`CourseStatus`' own note names this page: "every state a course is drawn
 * in, across My Courses (Published / Draft / In review) and the admin queue").
 * Six definitions decide what the page means, and the export settles none of
 * them:
 *
 *  - **A meta chip is dropped when it has nothing to say**, rather than drawn
 *    as a zero — the rule Platform Overview's attention queues already follow.
 *    That is what reproduces the export without a status test: its Draft and
 *    In-review rows carry a lesson count and an updated stamp because a course
 *    that has never been live has no students, no rating and no revenue.
 *  - **Students is `Course.enrollmentCount`**, the denormalised counter the
 *    catalog, the sale page and `top-courses-card.tsx` already render, so one
 *    course cannot report two student numbers on two screens. The KPI tile is
 *    the **sum of that same column** over the rows that draw it, for the
 *    reason the admin Community page's Threads tile gives: the headline is the
 *    sum of the column beneath it, not a second count that is free to
 *    disagree. It follows that a learner enrolled in two of your courses
 *    counts twice, which is what "students across my courses" means here.
 *  - **Avg. rating is weighted by `reviewsCount`**, not a plain mean over
 *    courses — the call `instructor-coupons.ts` makes about its own average. A
 *    course with one five-star review must not outweigh one with nine hundred.
 *    It is null, and renders as an em dash, until something has been rated.
 *  - **Revenue is the instructor's own net**, summed over `InstructorEarning`
 *    and excluding REVERSED rows. A refunded sale's share went back with the
 *    money, so it was never earned — the same reading `admin-reports.ts`
 *    settles for "Platform share". Gross would be the platform's number, not
 *    the person's, and this is their page.
 *  - **"% built" is published lessons over total lessons**, which is exactly
 *    what `CourseLesson.isPublished` exists to answer ("9 of 12 lessons
 *    published on the instructor Overview — a lesson can exist in a published
 *    course and not be live yet"). Nothing else on the model could produce the
 *    figure, and a bar computed from anything softer would be decoration. A
 *    course with no lessons at all reads 0%.
 *  - **Filtering, searching and paging happen in SQL, driven by the URL**
 *    (`?tab=&q=&page=`), the arrangement the audit log, the Users table and
 *    the coupons board already have: a narrowed view is a link, the back
 *    button walks it, and a reload keeps it. `parseInstructorCoursesQuery` is
 *    the gate.
 */

export type MyCoursesTab = "all" | "published" | "drafts" | "in-review"

export type InstructorCoursesQuery = {
  tab: MyCoursesTab
  query: string
  page: number
}

export type MyCourseRow = {
  id: string
  slug: string
  title: string
  status: CourseStatus
  categorySlug: string
  categoryAccent: string
  thumbnailUrl: string | null
  lessonCount: number
  /** Null on a course that has never been live — see the chip rule above. */
  students: number | null
  rating: number | null
  revenueCents: number | null
  /** Whole percent, or null on a course that is already live. */
  builtPercent: number | null
  /** Already written, e.g. "Updated 2 days ago" — see `courses-format.ts`. */
  updated: string
  updatedAt: Date
}

export type InstructorCoursesPage = {
  rows: MyCourseRow[]
  total: number
  page: number
  pageCount: number
  query: InstructorCoursesQuery
  stats: {
    published: number
    drafts: number
    students: number
    /** One decimal, weighted by reviews. Null until something has been rated. */
    rating: number | null
  }
}

/**
 * Turns whatever arrived in the URL into a query this module will act on.
 *
 * An unknown tab falls back to `all` and the search is capped, rather than
 * erroring — a hand-edited query string should show the unfiltered list, not a
 * crash. Nothing here can widen what is returned: every read below is already
 * scoped by `Course.instructorId`.
 */
export function parseInstructorCoursesQuery(params: {
  tab?: string | string[]
  q?: string | string[]
  page?: string | string[]
}): InstructorCoursesQuery {
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const rawTab = one(params.tab)
  const rawPage = Number(one(params.page))

  return {
    tab:
      rawTab && myCoursesTabValues.has(rawTab)
        ? (rawTab as MyCoursesTab)
        : "all",
    query: (one(params.q) ?? "").trim().slice(0, 100),
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1,
  }
}

export async function getInstructorCoursesPage(
  query: InstructorCoursesQuery
): Promise<InstructorCoursesPage | null> {
  const session = await getSession()
  if (!session) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  const mine: Prisma.CourseWhereInput = { instructorId: profile.id }
  const statuses = tabStatuses[query.tab]
  const where: Prisma.CourseWhereInput = {
    ...mine,
    ...(statuses ? { status: { in: statuses } } : {}),
    // Title and subtitle both: an instructor remembers a course by either, and
    // the row draws the title only, so a subtitle match still reads as a hit.
    ...(query.query
      ? {
          OR: [
            { title: { contains: query.query, mode: "insensitive" } },
            { subtitle: { contains: query.query, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const requested = Math.max(1, query.page)

  /** One shape for the visible rows, so the corrective read below cannot
   *  select or order them differently from the first. */
  const rowQuery = {
    where,
    // Most recently touched first, which is what "Manage what you teach"
    // wants in front of you — and it is the export's own order, whose five
    // rows run 2 days, 4 hours, 1 week, Yesterday, 3 weeks against a mix of
    // statuses no single status rule reproduces. `id` breaks ties so two
    // courses saved in the same second cannot swap places between renders.
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: COURSES_PAGE_SIZE,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      thumbnailUrl: true,
      lessonCount: true,
      enrollmentCount: true,
      rating: true,
      reviewsCount: true,
      updatedAt: true,
      category: { select: { slug: true, accentColor: true } },
      sections: {
        select: { lessons: { select: { isPublished: true } } },
      },
    },
  } satisfies Prisma.CourseFindManyArgs

  // **Wave one.** The visible rows, the row count and the headline figures are
  // independent, so they go together rather than in series — each Prisma call
  // is a network hop. `_count` on lessons is not available through a nested
  // relation two levels down, so the lesson publication state rides along on
  // the select and is folded up below.
  const [total, firstTry, headline] = await Promise.all([
    db.course.count({ where }),
    db.course.findMany({
      ...rowQuery,
      skip: (requested - 1) * COURSES_PAGE_SIZE,
    }),
    // The four KPI figures describe the whole catalog and ignore the tabs and
    // the search, for the reason `instructor-coupons.ts` gives about its own:
    // a headline that moved every time somebody opened a tab would be
    // measuring the filter.
    db.course.findMany({
      where: mine,
      select: {
        status: true,
        enrollmentCount: true,
        rating: true,
        reviewsCount: true,
      },
    }),
  ])

  const pageCount = Math.max(1, Math.ceil(total / COURSES_PAGE_SIZE))
  const page = Math.min(requested, pageCount)

  // A hand-edited `?page=99` overshoots every row, and a footer reading
  // "Showing 491–490 of 4 courses" over an empty list is worse than a wasted
  // round trip. It is corrected here rather than in
  // `parseInstructorCoursesQuery`, which cannot know the count — and it costs
  // a second read only on a URL somebody typed wrong.
  const rows =
    page === requested
      ? firstTry
      : await db.course.findMany({
          ...rowQuery,
          skip: (page - 1) * COURSES_PAGE_SIZE,
        })

  // **Wave two**, and only for what is on screen. Earnings are a sum per
  // course, so they are one grouped query over the five visible ids rather
  // than five — and none at all on a page whose rows have never been live.
  const liveIds = rows
    .filter((row) => row.status === "PUBLISHED" || row.status === "ARCHIVED")
    .map((row) => row.id)

  const earnings =
    liveIds.length === 0
      ? []
      : await db.instructorEarning.groupBy({
          by: ["courseId"],
          where: {
            instructorId: profile.id,
            courseId: { in: liveIds },
            status: { not: "REVERSED" },
          },
          _sum: { netCents: true },
        })

  const netByCourse = new Map(
    earnings.map((row) => [row.courseId, row._sum.netCents ?? 0])
  )

  const now = new Date()

  return {
    rows: rows.map((row) => {
      const live = row.status === "PUBLISHED" || row.status === "ARCHIVED"
      const lessons = row.sections.flatMap((section) => section.lessons)
      const published = lessons.filter((lesson) => lesson.isPublished).length

      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        status: row.status,
        categorySlug: row.category.slug,
        categoryAccent: row.category.accentColor,
        thumbnailUrl: row.thumbnailUrl,
        // The denormalised counter rather than `lessons.length`: it is what
        // the catalog and the sale page already draw, and a course whose
        // curriculum has not been written yet still advertises one.
        lessonCount: row.lessonCount,
        students: live && row.enrollmentCount > 0 ? row.enrollmentCount : null,
        rating: live && row.reviewsCount > 0 ? row.rating : null,
        revenueCents: live ? (netByCourse.get(row.id) ?? 0) || null : null,
        builtPercent: live
          ? null
          : lessons.length === 0
            ? 0
            : Math.round((published / lessons.length) * 100),
        updated: formatUpdatedAt(row.updatedAt, now),
        updatedAt: row.updatedAt,
      }
    }),
    total,
    page,
    pageCount,
    query: { ...query, page },
    stats: statsOf(headline),
  }
}

function statsOf(
  courses: {
    status: CourseStatus
    enrollmentCount: number
    rating: number
    reviewsCount: number
  }[]
): InstructorCoursesPage["stats"] {
  let published = 0
  let drafts = 0
  let students = 0
  let ratingWeight = 0
  let ratingTotal = 0

  for (const course of courses) {
    if (course.status === "PUBLISHED") published += 1
    if (course.status === "DRAFT" || course.status === "NEEDS_CHANGES") {
      drafts += 1
    }
    if (course.status === "PUBLISHED" || course.status === "ARCHIVED") {
      students += course.enrollmentCount
    }
    if (course.reviewsCount > 0) {
      ratingWeight += course.reviewsCount
      ratingTotal += course.rating * course.reviewsCount
    }
  }

  return {
    published,
    drafts,
    students,
    rating:
      ratingWeight === 0
        ? null
        : Math.round((ratingTotal / ratingWeight) * 10) / 10,
  }
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * "Updated 2 days ago", "Updated 4 hours ago", "Updated Yesterday", "Updated 3
 * weeks ago" — the four shapes the export draws, in that vocabulary.
 *
 * **Written on the server** and crossing as a string, for the two reasons
 * `audit-format.ts` records: it keeps a date library out of the client bundle,
 * and a relative time computed on both sides of the boundary is a hydration
 * mismatch waiting for a row to sit on a minute boundary. "Yesterday" is the
 * special case `courses-format.ts` already carries — a strict distance says "1
 * day ago" where every export in this codebase says Yesterday.
 *
 * It is hand-rolled rather than `date-fns`' because this module is already
 * read on every request of the page and the ladder is six lines; the same call
 * `lib/relative-time.ts` makes for the compact form the other three surfaces
 * draw.
 */
function formatUpdatedAt(date: Date, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - date.getTime())
  if (elapsed < HOUR) {
    const minutes = Math.max(1, Math.floor(elapsed / MINUTE))
    return `Updated ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR)
    return `Updated ${hours} ${hours === 1 ? "hour" : "hours"} ago`
  }
  if (elapsed < 2 * DAY) return "Updated Yesterday"
  const days = Math.floor(elapsed / DAY)
  if (days < 7) return `Updated ${days} days ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `Updated ${weeks} ${weeks === 1 ? "week" : "weeks"} ago`
  }
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30))
    return `Updated ${months} ${months === 1 ? "month" : "months"} ago`
  }
  const years = Math.floor(days / 365)
  return `Updated ${years} ${years === 1 ? "year" : "years"} ago`
}
