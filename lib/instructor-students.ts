import { getSession } from "@/lib/auth"
import {
  STUDENTS_PAGE_SIZE,
  studentsCopy,
  studentTabValues,
  type StudentStatus,
  type StudentTab,
} from "@/lib/config/instructor-students"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import { longAgoPrecise } from "@/lib/relative-time"
import { initialsOf } from "@/lib/user"
import type { Prisma } from "@/lib/generated/prisma/client"

/**
 * The read behind `/dashboard/instructor/students`, from
 * `ui-design/light/dashboard/instructor/students-page.png`.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy, the page size and the tab vocabulary live in
 * `lib/config/instructor-students.ts` so the board can import them freely.
 *
 * **Nothing on the page is demo data and it needed no migration** —
 * `Enrollment` already carried every column the export asks for, docstrings
 * and all (`progressPercent`'s own note explains why it is stored rather than
 * derived from the lesson ratio, which is what lets the export draw "23 / 25
 * lessons" beside 92%).
 *
 * Seven definitions decide what the page means, and the export settles none of
 * them:
 *
 *  - **A row is an enrolment, not a person.** The Course column says so: the
 *    export lists Nadia and Omar against Mastering Illustration and Liam and
 *    Noah against Python for Everybody, and a learner in two of your courses
 *    has two different progress bars. So somebody enrolled twice appears
 *    twice, which is the same reading My Courses' Students tile already takes
 *    ("a learner enrolled in two of your courses counts twice, which is what
 *    students across my courses means here").
 *  - **The headline is the count of the column beneath it.** "Total students"
 *    counts the `Enrollment` rows this page paginates rather than summing
 *    `Course.enrollmentCount`, the arrangement the admin Community page's
 *    Threads tile records. The two are the same definition read from two
 *    places — that counter is a cache of this table — and they agree on a real
 *    database; they drift only in the seeded one, which writes the counter
 *    with history the enrolment rows do not reproduce (`top-courses-card.tsx`
 *    records that). A headline of 1,500 above a list of 14 would be the
 *    incoherent half of that trade.
 *  - **"Active this week" is `Enrollment.lastAccessedAt`, not `Session`.** The
 *    admin Users page counts sessions because a platform operator has no
 *    better liveness signal; an instructor does, and it is the one the row's
 *    own Last active column already draws. Reading the same column twice is
 *    what stops the tile and the list telling different stories about the same
 *    learner. It follows that somebody signed in and reading somebody *else's*
 *    course is not active here, which is correct for this page.
 *  - **Completion rate is `completedAt` over enrolments** — the identical
 *    definition the manage page's Course health card uses, so one course
 *    cannot report two completion rates on two instructor screens.
 *  - **Avg. rating is weighted by `reviewsCount`** over the published courses,
 *    the identical figure My Courses' own tile draws. A course with one
 *    five-star review must not outweigh one with nine hundred, and an em dash
 *    rather than 0.0 until something has been rated.
 *  - **The Quiz column is "quizzes passed / quizzes in the course", counted
 *    over distinct quizzes.** `Quiz.retakesAllowed` means one quiz can hold
 *    several attempts, so counting passed *attempts* would let a learner who
 *    retook one quiz four times read 4/5. It is an **em dash until they have
 *    submitted something**, which is what the export draws on its two rows at
 *    12% and 8% — a course with no quizzes lands there too, and in both cases
 *    a "0/5" would be a score nobody has taken.
 *  - **The four figures ignore the tabs, the course filter and the search.**
 *    They describe the instructor's whole audience, and a headline that moved
 *    every time somebody opened a tab would be measuring the filter — the
 *    reading `instructor-coupons.ts` settled for its own KPI row.
 */

export type StudentsQuery = {
  tab: StudentTab
  /** `?course=` — narrows to one course. The manage page's Students row and
   *  My Courses' row menu both link with it. */
  courseId: string | null
  /** `?q=` — matches the learner's name or email. */
  query: string
}

export type StudentCourse = { id: string; title: string }

export type StudentRow = {
  /** The enrolment's id — the row's identity, since one person can hold two. */
  id: string
  userId: string
  name: string
  email: string
  image: string | null
  initials: string
  courseId: string
  courseTitle: string
  progressPercent: number
  completedLessons: number
  totalLessons: number
  /** Passed quizzes over the course's quiz count, or null for the em dash —
   *  see the module note. */
  quiz: { passed: number; total: number } | null
  status: StudentStatus
  /** Already written, e.g. "2 hours ago" — see `StudentsPage.generatedAt`. */
  lastActive: string
}

export type StudentsPage = {
  rows: StudentRow[]
  courses: StudentCourse[]
  total: number
  page: number
  pageCount: number
  query: StudentsQuery
  stats: {
    total: number
    activeThisWeek: number
    /** Null until anybody has enrolled — an em dash, not 0%. */
    completionRate: number | null
    /** Null until anything has been rated. */
    rating: number | null
  }
  /** Counted once here so the footer's "1–6 of 14" and the pager agree, and so
   *  every relative stamp on the page is measured against one instant. */
  generatedAt: Date
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * The gate on everything that arrives off the URL. An unknown tab falls back
 * to "all", the course id is capped and the search capped at 100 characters —
 * the same caps `parseAuditQuery` and `parseInstructorCoursesQuery` apply, so
 * a hand-edited query string never reaches Prisma unbounded.
 *
 * A `?course=` that names somebody else's course needs no check here: the
 * query is already scoped by `Course.instructorId`, so it can only ever
 * narrow what this instructor would have been shown anyway — the reasoning
 * `parseQuestionsQuery` records.
 */
export function parseStudentsQuery(params: {
  tab?: string | string[]
  course?: string | string[]
  q?: string | string[]
  page?: string | string[]
}): StudentsQuery & { page: number } {
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const rawTab = one(params.tab)
  const rawCourse = (one(params.course) ?? "").trim()
  const rawPage = Number(one(params.page))

  return {
    tab:
      rawTab && studentTabValues.has(rawTab) ? (rawTab as StudentTab) : "all",
    courseId: rawCourse === "" ? null : rawCourse.slice(0, 64),
    query: (one(params.q) ?? "").trim().slice(0, 100),
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1,
  }
}

/**
 * The `where` every read on this page shares, scoped by `instructorId` in the
 * clause rather than checked afterwards — the console's reasoning about not
 * distinguishing "you may not see this" from "there is nothing here", and what
 * makes a stray `?course=` harmless.
 */
function rowsWhere(
  instructorId: string,
  query: StudentsQuery
): Prisma.EnrollmentWhereInput {
  return {
    course: {
      instructorId,
      ...(query.courseId ? { id: query.courseId } : {}),
    },
    ...(query.tab === "completed" ? { completedAt: { not: null } } : {}),
    ...(query.tab === "active" ? { completedAt: null } : {}),
    ...(query.query
      ? {
          user: {
            OR: [
              { name: { contains: query.query, mode: "insensitive" as const } },
              {
                email: { contains: query.query, mode: "insensitive" as const },
              },
            ],
          },
        }
      : {}),
  }
}

export async function getStudentsPage(
  query: StudentsQuery & { page: number }
): Promise<StudentsPage | null> {
  const session = await getSession()
  if (!session) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  const now = new Date()
  const mine = { instructorId: profile.id }
  const where = rowsWhere(profile.id, query)

  // **Wave one.** Everything needed to decide the page is independent, so it
  // goes in one round of hops — the arrangement `lib/messages.ts` records.
  const [total, courses, enrolmentTotal, activeThisWeek, completed, rated] =
    await Promise.all([
      db.enrollment.count({ where }),
      // The filter's own list. Every course, not just published ones: an
      // unpublished course still has the students who bought it before it came
      // off sale, and they are exactly the ones an instructor loses track of.
      db.course.findMany({
        where: mine,
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      }),
      db.enrollment.count({ where: { course: mine } }),
      db.enrollment.count({
        where: {
          course: mine,
          lastAccessedAt: { gte: new Date(now.getTime() - WEEK_MS) },
        },
      }),
      db.enrollment.count({
        where: { course: mine, completedAt: { not: null } },
      }),
      db.course.findMany({
        where: { ...mine, status: "PUBLISHED", reviewsCount: { gt: 0 } },
        select: { rating: true, reviewsCount: true },
      }),
    ])

  const pageCount = Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE))
  const page = Math.min(query.page, pageCount)

  const enrolments = await db.enrollment.findMany({
    where,
    // Most recently active first, which is the order the export's own rows run
    // in (2 hours, 1 day, 3 days, 3 weeks …). Nulls last, so a learner who has
    // never opened the course sorts below one who has rather than above
    // everybody — Postgres orders NULLs first on DESC without it. `id` breaks
    // ties so two rows written in the same seed run cannot swap between pages.
    orderBy: [
      { lastAccessedAt: { sort: "desc", nulls: "last" } },
      { id: "asc" },
    ],
    skip: (page - 1) * STUDENTS_PAGE_SIZE,
    take: STUDENTS_PAGE_SIZE,
    select: {
      id: true,
      userId: true,
      progressPercent: true,
      completedLessons: true,
      completedAt: true,
      lastAccessedAt: true,
      user: { select: { name: true, email: true, image: true } },
      course: { select: { id: true, title: true, lessonCount: true } },
    },
  })

  // **Wave two**, and only over the rows actually on screen: the quiz counts.
  // One `groupBy` for how many quizzes each of these courses holds, and one
  // for the attempts these enrolments have passed — rather than a query per
  // row, which at a page of six would be twelve hops.
  const courseIds = [...new Set(enrolments.map((row) => row.course.id))]
  const enrolmentIds = enrolments.map((row) => row.id)

  const [quizCounts, passedAttempts] = await Promise.all([
    db.courseLesson.groupBy({
      by: ["sectionId"],
      where: { section: { courseId: { in: courseIds } }, type: "QUIZ" },
      _count: { _all: true },
    }),
    db.quizAttempt.findMany({
      where: { enrollmentId: { in: enrolmentIds }, submittedAt: { not: null } },
      select: { enrollmentId: true, quizId: true, passed: true },
    }),
  ])

  // `groupBy` can only group by a column on the table itself, and the course a
  // lesson belongs to is one relation away — so the count comes back per
  // section and is rolled up here against the sections' own courses.
  const sectionCourse = new Map(
    (
      await db.courseSection.findMany({
        where: { courseId: { in: courseIds } },
        select: { id: true, courseId: true },
      })
    ).map((row) => [row.id, row.courseId])
  )
  const quizzesByCourse = new Map<string, number>()
  for (const group of quizCounts) {
    const courseId = sectionCourse.get(group.sectionId)
    if (!courseId) continue
    quizzesByCourse.set(
      courseId,
      (quizzesByCourse.get(courseId) ?? 0) + group._count._all
    )
  }

  // Distinct quizzes, not attempts: retakes are allowed, so one quiz passed
  // four times is one pass. See the module note.
  const submitted = new Map<string, Set<string>>()
  const passed = new Map<string, Set<string>>()
  for (const attempt of passedAttempts) {
    const seen = submitted.get(attempt.enrollmentId) ?? new Set<string>()
    seen.add(attempt.quizId)
    submitted.set(attempt.enrollmentId, seen)
    if (attempt.passed !== true) continue
    const won = passed.get(attempt.enrollmentId) ?? new Set<string>()
    won.add(attempt.quizId)
    passed.set(attempt.enrollmentId, won)
  }

  const ratingTotal = rated.reduce((sum, row) => sum + row.reviewsCount, 0)

  return {
    rows: enrolments.map((row) => {
      const name = row.user.name?.trim() || row.user.email
      const quizTotal = quizzesByCourse.get(row.course.id) ?? 0
      const hasSubmitted = (submitted.get(row.id)?.size ?? 0) > 0

      return {
        id: row.id,
        userId: row.userId,
        name,
        email: row.user.email,
        image: row.user.image,
        initials: initialsOf(name, row.user.email),
        courseId: row.course.id,
        courseTitle: row.course.title,
        progressPercent: row.progressPercent,
        completedLessons: row.completedLessons,
        totalLessons: row.course.lessonCount,
        quiz:
          quizTotal === 0 || !hasSubmitted
            ? null
            : { passed: passed.get(row.id)?.size ?? 0, total: quizTotal },
        status: row.completedAt === null ? "active" : "completed",
        // Written on the server and crossing as a string, for the two reasons
        // `audit-format.ts` records: it keeps `date-fns` out of the client
        // bundle, and a relative time computed on both sides of the boundary
        // is a hydration mismatch waiting for a row to sit on a boundary.
        lastActive: row.lastAccessedAt
          ? longAgoPrecise(row.lastAccessedAt, now)
          : studentsCopy.neverActive,
      }
    }),
    courses,
    total,
    page,
    pageCount,
    query: { tab: query.tab, courseId: query.courseId, query: query.query },
    stats: {
      total: enrolmentTotal,
      activeThisWeek,
      completionRate:
        enrolmentTotal === 0
          ? null
          : Math.round((completed / enrolmentTotal) * 100),
      rating:
        ratingTotal === 0
          ? null
          : Math.round(
              (rated.reduce(
                (sum, row) => sum + row.rating * row.reviewsCount,
                0
              ) /
                ratingTotal) *
                10
            ) / 10,
    },
    generatedAt: now,
  }
}

/**
 * Every row matching a filter, for **Export CSV** and **Message all** — the
 * two controls that act on the whole narrowed list rather than on a page of
 * it. It re-resolves the instructor from the session and re-scopes by
 * `instructorId`, so neither action trusts anything the browser sent.
 */
export async function getAllStudents(
  query: StudentsQuery,
  limit: number
): Promise<StudentRow[] | null> {
  const session = await getSession()
  if (!session) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  const now = new Date()
  const rows = await db.enrollment.findMany({
    where: rowsWhere(profile.id, query),
    orderBy: [
      { lastAccessedAt: { sort: "desc", nulls: "last" } },
      { id: "asc" },
    ],
    take: limit,
    select: {
      id: true,
      userId: true,
      progressPercent: true,
      completedLessons: true,
      completedAt: true,
      lastAccessedAt: true,
      user: { select: { name: true, email: true, image: true } },
      course: { select: { id: true, title: true, lessonCount: true } },
    },
  })

  return rows.map((row) => {
    const name = row.user.name?.trim() || row.user.email
    return {
      id: row.id,
      userId: row.userId,
      name,
      email: row.user.email,
      image: row.user.image,
      initials: initialsOf(name, row.user.email),
      courseId: row.course.id,
      courseTitle: row.course.title,
      progressPercent: row.progressPercent,
      completedLessons: row.completedLessons,
      totalLessons: row.course.lessonCount,
      // Not read by either caller — the CSV quotes progress and the bulk
      // message quotes nothing — so it is left off rather than costing two
      // more queries over a list that can run to thousands of rows.
      quiz: null,
      status: row.completedAt === null ? "active" : "completed",
      lastActive: row.lastAccessedAt
        ? longAgoPrecise(row.lastAccessedAt, now)
        : studentsCopy.neverActive,
    }
  })
}
