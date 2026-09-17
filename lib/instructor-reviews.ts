import { getSession } from "@/lib/auth"
import {
  RATING_BY_COURSE_LIMIT,
  RATING_TREND_DAYS,
  REVIEWS_PAGE_SIZE,
  reviewsTabValues,
  type ReviewsTab,
} from "@/lib/config/instructor-reviews"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import { longAgo } from "@/lib/relative-time"
import { initialsOf } from "@/lib/user"
import type { Prisma } from "@/lib/generated/prisma/client"

/**
 * The read behind `/dashboard/instructor/reviews`, from
 * `ui-design/light/dashboard/instructor/reviews-page.png`.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy, the page size and the tab vocabulary live in
 * `lib/config/instructor-reviews.ts` so the board can import them freely.
 *
 * **Nothing on the page is demo data and it needed no migration** —
 * `CourseReview`, `CourseReviewReply` and `ContentReport` were already shaped
 * for this export, docstrings and all. `CourseReview.title`'s own note names
 * "the headline the instructor Reviews page draws above the body";
 * `CourseReviewReply` is unique per review because it is "rendered inline
 * beneath it", which is exactly the block under "You replied"; and
 * `ContentReport`'s says reports are "filed by instructors from their Reviews
 * page". What the seed did not have was a single reply row — see
 * `seedReviewReplies`.
 *
 * Seven definitions decide what the page means, and the export settles none of
 * them:
 *
 *  - **Every figure on the page is counted from `CourseReview` rows, not from
 *    `Course.rating` / `Course.reviewsCount`.** The export forces it: its five
 *    per-course counts (1,204 + 892 + 741 + 284 + 163) sum to **exactly** the
 *    3,284 in its own headline, so the two halves of the page are one
 *    population — and the star breakdown can only ever be counted, since
 *    nothing stores it. A headline read off the counter above bars summing to
 *    something else would look broken. Those counters are a *cache* of this
 *    table, so the two agree on a real database and drift only in the seeded
 *    one, which writes them with history the review rows do not reproduce.
 *    That is the trade `lib/instructor-students.ts` already makes between its
 *    "Total students" headline and `Course.enrollmentCount`, stated here from
 *    the other side. The consequence worth knowing: this page's 4.7 and the
 *    Avg. rating tiles on My Courses and Students — which are weighted by
 *    `reviewsCount` — can disagree on seeded data.
 *  - **"across 12 courses" counts courses that actually have a review**, not
 *    courses owned. A rating is spread *across* the things that have been
 *    rated, and saying "across 18 courses" while six of them have never been
 *    rated would put the reader's arithmetic at odds with the card beside it.
 *  - **A bar is a percentage of the total, and the track is rounded**, so a
 *    star nobody gave still draws nothing and a 1% star still draws a dot —
 *    which is exactly what the export's own 33 one-star reviews look like.
 *  - **The trend is the rating now against the rating as it stood a quarter
 *    ago** — the average over reviews written before that date, not the
 *    average *of* last quarter's reviews. That is the running-total reading
 *    Platform Overview's four cards settled, and it is the only one under
 *    which "+0.2 vs last quarter" describes a reputation rather than a batch.
 *    It is a difference in **rating points**, like uptime's percentage points.
 *    Null — and the line is dropped rather than drawn as "+0.0" — when nothing
 *    predates the window, because a brand-new instructor has no quarter to be
 *    compared with. The "an empty queue is dropped rather than drawn as a
 *    zero" rule.
 *  - **Only `VISIBLE`, undeleted reviews are listed or counted.** A review a
 *    moderator removed or parked pending appeal is not on the course page, and
 *    an instructor's own rating should not be dragged by a row nobody else can
 *    see. It follows that reporting a review changes nothing visible here
 *    until an admin decides — which is why the Report button goes inert and
 *    says so instead.
 *  - **The summary card and "Rating by course" ignore the tabs and the course
 *    filter.** They describe the whole body of feedback, and a headline that
 *    moved every time somebody opened a tab would be measuring the filter —
 *    the reading `instructor-coupons.ts` settled for its own KPI row.
 *  - **Newest first.** The export's four cards run 2 days, 4 days, 1 week, 1
 *    week, and a review is a thing you catch up on rather than a queue you
 *    work from the bottom of.
 */

export type ReviewsQuery = {
  tab: ReviewsTab
  /** `?course=` — narrows to one course. The manage page's Reviews row links
   *  with it. */
  courseId: string | null
}

export type ReviewCourse = { id: string; title: string }

export type ReviewReply = {
  body: string
  authorName: string
  authorImage: string | null
  authorInitials: string
}

export type ReviewRow = {
  id: string
  rating: number
  /** `CourseReview.title` is nullable; a review with no headline draws its
   *  body alone rather than an empty line. */
  title: string | null
  body: string
  /** Already written, e.g. "2 days ago" — see `ReviewsPage.generatedAt`. */
  createdAgo: string
  courseId: string
  courseTitle: string
  authorName: string
  authorImage: string | null
  authorInitials: string
  /** Whether a report is already open against it, which is what makes the
   *  Report button inert. */
  reported: boolean
  reply: ReviewReply | null
}

export type RatingByCourseRow = {
  id: string
  title: string
  reviews: number
  rating: number
  thumbnailUrl: string | null
  categorySlug: string
  categoryAccent: string
}

export type ReviewsSummary = {
  /** Null until anything has been rated — the card is dropped, not drawn at
   *  0.0. */
  rating: number | null
  total: number
  /** Courses with at least one review — see the module note. */
  courses: number
  /** Five rows, 5★ first, as drawn. */
  breakdown: { stars: number; count: number; percent: number }[]
  /** Rating points against a quarter ago, or null when there is no quarter to
   *  compare with. */
  trend: number | null
}

export type ReviewsPage = {
  rows: ReviewRow[]
  courses: ReviewCourse[]
  byCourse: RatingByCourseRow[]
  summary: ReviewsSummary
  total: number
  page: number
  pageCount: number
  query: ReviewsQuery
  /** Counted once here so the footer's "1–4 of 9" and the pager agree, and so
   *  every relative stamp on the page is measured against one instant. */
  generatedAt: Date
}

/** The stars each tab keeps. `3-below` is 1–3 because the export says "&
 *  below" — a one-star review is the one an instructor most needs to see, so
 *  it cannot be the tab that hides it. */
const TAB_RATINGS: Record<Exclude<ReviewsTab, "all">, number[]> = {
  "5": [5],
  "4": [4],
  "3-below": [1, 2, 3],
}

/**
 * The gate on everything that arrives off the URL. An unknown tab falls back
 * to "all", the course id is capped at 64 characters — the same caps
 * `parseStudentsQuery` and `parseAuditQuery` apply, so a hand-edited query
 * string never reaches Prisma unbounded.
 *
 * A `?course=` naming somebody else's course needs no check here: the query is
 * already scoped by `Course.instructorId`, so it can only ever narrow what
 * this instructor would have been shown anyway — the reasoning
 * `parseQuestionsQuery` records.
 */
export function parseReviewsQuery(params: {
  tab?: string | string[]
  course?: string | string[]
  page?: string | string[]
}): ReviewsQuery & { page: number } {
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const rawTab = one(params.tab)
  const rawCourse = (one(params.course) ?? "").trim()
  const rawPage = Number(one(params.page))

  return {
    tab:
      rawTab && reviewsTabValues.has(rawTab) ? (rawTab as ReviewsTab) : "all",
    courseId: rawCourse === "" ? null : rawCourse.slice(0, 64),
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1,
  }
}

/**
 * Every review this page will ever consider: visible, undeleted and on one of
 * this instructor's courses. Scoped by `instructorId` **in the clause** rather
 * than checked afterwards, which is what makes a stray `?course=` harmless and
 * what the console's "you may not see this" / "there is nothing here"
 * reasoning asks for.
 */
function mineWhere(instructorId: string): Prisma.CourseReviewWhereInput {
  return {
    course: { instructorId },
    deletedAt: null,
    status: "VISIBLE",
  }
}

/** The list's own `where` — the base above plus whatever the URL narrowed. */
function rowsWhere(
  instructorId: string,
  query: ReviewsQuery
): Prisma.CourseReviewWhereInput {
  const ratings = query.tab === "all" ? null : TAB_RATINGS[query.tab]
  return {
    ...mineWhere(instructorId),
    ...(query.courseId ? { courseId: query.courseId } : {}),
    ...(ratings ? { rating: { in: ratings } } : {}),
  }
}

export async function getReviewsPage(
  query: ReviewsQuery & { page: number }
): Promise<ReviewsPage | null> {
  const session = await getSession()
  if (!session) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  const now = new Date()
  const mine = mineWhere(profile.id)
  const where = rowsWhere(profile.id, query)
  const quarterAgo = new Date(
    now.getTime() - RATING_TREND_DAYS * 24 * 60 * 60 * 1000
  )

  // **Wave one.** Everything needed to decide the page is independent of
  // everything else, so it goes in one round of hops — the arrangement
  // `lib/messages.ts` records.
  const [total, courses, overall, byRating, byCourse, before] =
    await Promise.all([
      db.courseReview.count({ where }),
      // The filter's own list. Every course, not only published ones: a course
      // taken off sale keeps the reviews it earned, and they are exactly the
      // ones an instructor stops seeing otherwise.
      db.course.findMany({
        where: { instructorId: profile.id },
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      }),
      db.courseReview.aggregate({
        where: mine,
        _avg: { rating: true },
        _count: { _all: true },
      }),
      db.courseReview.groupBy({
        by: ["rating"],
        where: mine,
        _count: { _all: true },
      }),
      db.courseReview.groupBy({
        by: ["courseId"],
        where: mine,
        _count: { _all: true },
        _avg: { rating: true },
      }),
      // The rating as it stood a quarter ago — see the module note on why this
      // is a running total rather than one period's reviews.
      db.courseReview.aggregate({
        where: { ...mine, createdAt: { lt: quarterAgo } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ])

  const pageCount = Math.max(1, Math.ceil(total / REVIEWS_PAGE_SIZE))
  const page = Math.min(query.page, pageCount)

  // **Wave two**, over the rows actually on screen plus the handful of courses
  // the right-hand card names.
  // Most-reviewed first, which is the export's own sequence — and **tie-broken
  // on `courseId`**, which is not decoration: `groupBy` gives no ordering
  // guarantee, so two courses holding the same number of reviews swapped
  // places between two renders of the same data until this was added. Seen in
  // the browser, and exactly the reason `Category.order` is tie-broken on
  // `name`.
  const ranked = [...byCourse]
    .sort(
      (a, b) =>
        b._count._all - a._count._all || a.courseId.localeCompare(b.courseId)
    )
    .slice(0, RATING_BY_COURSE_LIMIT)

  const [reviews, rankedCourses] = await Promise.all([
    db.courseReview.findMany({
      where,
      // `id` breaks ties so two rows written in the same seed run cannot swap
      // between pages.
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * REVIEWS_PAGE_SIZE,
      take: REVIEWS_PAGE_SIZE,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        createdAt: true,
        course: { select: { id: true, title: true } },
        user: { select: { name: true, email: true, image: true } },
        reply: {
          select: {
            body: true,
            author: { select: { name: true, email: true, image: true } },
          },
        },
      },
    }),
    db.course.findMany({
      where: { id: { in: ranked.map((row) => row.courseId) } },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        category: { select: { slug: true, accentColor: true } },
      },
    }),
  ])

  // **Wave three**, and only because it depends on which rows landed: whether
  // each of them already carries an open report. `ContentReport` is
  // polymorphic — `targetId` is a plain string with no relation behind it —
  // so this cannot be an `include`, which is the same reason
  // `lib/admin/reviews.ts` reads its queue in two queries.
  const reported = new Set(
    reviews.length === 0
      ? []
      : (
          await db.contentReport.findMany({
            where: {
              targetType: "REVIEW",
              targetId: { in: reviews.map((row) => row.id) },
              status: "OPEN",
            },
            select: { targetId: true },
          })
        ).map((row) => row.targetId)
  )

  const courseById = new Map(rankedCourses.map((row) => [row.id, row]))
  const counts = new Map(byRating.map((row) => [row.rating, row._count._all]))
  const overallTotal = overall._count._all

  return {
    rows: reviews.map((row) => {
      const name = row.user.name?.trim() || row.user.email
      const replyAuthor = row.reply?.author
      const replyName = replyAuthor
        ? replyAuthor.name?.trim() || replyAuthor.email
        : ""

      return {
        id: row.id,
        rating: row.rating,
        title: row.title,
        body: row.body,
        // Written on the server and crossing as a string, for the two reasons
        // `audit-format.ts` records: it keeps `date-fns` out of the client
        // bundle, and a relative time computed on both sides of the boundary
        // is a hydration mismatch waiting for a row to sit on a boundary.
        // `longAgo` rather than `longAgoPrecise` because the export writes "2
        // days ago", not "31 hours ago" — that module's own note on why there
        // are two ladders.
        createdAgo: longAgo(row.createdAt, now),
        courseId: row.course.id,
        courseTitle: row.course.title,
        authorName: name,
        authorImage: row.user.image,
        authorInitials: initialsOf(name, row.user.email),
        reported: reported.has(row.id),
        reply: row.reply
          ? {
              body: row.reply.body,
              authorName: replyName,
              authorImage: replyAuthor?.image ?? null,
              authorInitials: initialsOf(replyName, replyAuthor?.email ?? ""),
            }
          : null,
      }
    }),
    courses,
    byCourse: ranked.flatMap((group) => {
      const course = courseById.get(group.courseId)
      if (!course) return []
      return [
        {
          id: course.id,
          title: course.title,
          reviews: group._count._all,
          rating: round1(group._avg.rating ?? 0),
          thumbnailUrl: course.thumbnailUrl,
          categorySlug: course.category.slug,
          categoryAccent: course.category.accentColor,
        },
      ]
    }),
    summary: {
      rating: overallTotal === 0 ? null : round1(overall._avg.rating ?? 0),
      total: overallTotal,
      courses: byCourse.length,
      breakdown: [5, 4, 3, 2, 1].map((stars) => {
        const count = counts.get(stars) ?? 0
        return {
          stars,
          count,
          percent:
            overallTotal === 0
              ? 0
              : Math.round((count / overallTotal) * 1000) / 10,
        }
      }),
      trend:
        overallTotal === 0 || before._count._all === 0
          ? null
          : round1((overall._avg.rating ?? 0) - (before._avg.rating ?? 0)),
    },
    total,
    page,
    pageCount,
    query: { tab: query.tab, courseId: query.courseId },
    generatedAt: now,
  }
}

/** One decimal, which is what every rating in this app is drawn to. */
function round1(value: number): number {
  return Math.round(value * 10) / 10
}
