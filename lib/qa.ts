import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import { compactAgo } from "@/lib/relative-time"
import { initialsOf } from "@/lib/user"
import {
  QA_THREAD_REPLY_LIMIT,
  QUESTIONS_PAGE_SIZE,
  qaTabValues,
  type QaTab,
} from "@/lib/config/qa"
import type { Prisma } from "@/lib/generated/prisma/client"

/**
 * The reads behind `/dashboard/instructor/qa` and its thread page, from
 * `ui-design/light/dashboard/instructor/Q&A-page.png` and
 * `Q&A-page__individual.png`.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy lives in `lib/config/qa.ts` so the board can import it
 * freely.
 *
 * **Nothing is demo data and neither page needed a migration** —
 * `CourseQuestion`, `CourseQuestionReply` and `CourseQuestionVote` were
 * already shaped for these exports, and `CourseQuestionReply`'s own docstring
 * even dictates how the reply pills work ("read at render time — storing the
 * badge would let it drift the day someone's role changes"). The seed wrote
 * none of them, so `seedCourseQuestions` is new.
 *
 * Five definitions decide what the pages mean:
 *
 *  - **Scope is the instructor's own courses.** The lead says so — "Questions
 *    from students enrolled in your courses" — and it is a `where` on
 *    `Course.instructorId`, so a hand-edited `?course=` can only ever narrow.
 *  - **`answeredByInstructor` decides the pill and the tabs**, not the reply
 *    count. A question with six learner replies and no instructor answer is
 *    still awaiting one, which is what that column is for.
 *  - **Q&A is not Discussions.** `CourseQuestion` is anchored to a *lesson*
 *    and carries an answered state; `Discussion` is a community thread with
 *    neither. The models are separate on purpose (the schema says so) and so
 *    are these pages.
 *  - **Votes are rows, and `voteCount` is their cache.**
 *    `CourseQuestionVote` is uniquely keyed on (question, user), so a vote
 *    cannot be double-counted, and the counter moves in the same transaction
 *    as the row.
 *  - **Replies read oldest first.** The export draws them that way (30m, 12m,
 *    10m, 8m, 5m, 2m ago) because a question and its answers are a
 *    conversation you read downward — the opposite of the Discussions thread,
 *    which the user asked to lead with the newest.
 */

export type QaQuery = {
  tab: QaTab
  /** A course id, or null for "All courses". */
  courseId: string | null
  page: number
}

export type QaCourse = { id: string; title: string }

export type QaPerson = {
  name: string
  image: string | null
  initials: string
  role: string
}

export type QuestionRow = {
  id: string
  title: string
  body: string
  courseTitle: string
  /** "Lesson 2 · Mastering Tools", or null for a question with no lesson. */
  lessonLabel: string | null
  voteCount: number
  /** Whether the reader's own vote is on it. */
  voted: boolean
  replyCount: number
  answered: boolean
  age: string
  author: QaPerson
}

export type QuestionsPage = {
  rows: QuestionRow[]
  courses: QaCourse[]
  total: number
  page: number
  pageCount: number
  query: QaQuery
}

/**
 * Turns whatever arrived in the URL into a query this module will act on.
 *
 * An unknown tab falls back to `all` and an unknown course to "every course" —
 * a hand-edited query string should show the unfiltered list, not a crash.
 */
export function parseQuestionsQuery(params: {
  tab?: string | string[]
  course?: string | string[]
  page?: string | string[]
}): QaQuery {
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const rawTab = one(params.tab)
  const rawCourse = (one(params.course) ?? "").trim()
  const rawPage = Number(one(params.page))

  return {
    tab: rawTab && qaTabValues.has(rawTab) ? (rawTab as QaTab) : "all",
    courseId: rawCourse === "" ? null : rawCourse.slice(0, 64),
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1,
  }
}

const person = (author: {
  name: string
  email: string
  image: string | null
  role: string | null
}): QaPerson => ({
  name: author.name,
  image: author.image,
  initials: initialsOf(author.name, author.email),
  role: author.role ?? "user",
})

/**
 * "Lesson 2 · Mastering Tools" — the export's own shape. A question with no
 * lesson draws nothing rather than "Lesson —".
 *
 * The number is `CourseLesson.order` **plus one**: that column is 0-based, so
 * rendering it raw drew "Lesson 0 · Introduction". It is the lesson's place
 * *within its section*, which is what the column holds — a course-wide index
 * would have to be counted across every section for a label, and the export
 * gives no way to tell the two apart.
 */
function lessonLabel(
  lesson: { title: string; order: number } | null
): string | null {
  return lesson ? `Lesson ${lesson.order + 1} · ${lesson.title}` : null
}

export async function getQuestionsPage(
  query: QaQuery
): Promise<QuestionsPage | null> {
  const session = await getSession()
  if (!session) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  const meId = session.user.id
  const now = new Date()
  const mine: Prisma.CourseQuestionWhereInput = {
    deletedAt: null,
    course: { instructorId: profile.id },
  }
  const where: Prisma.CourseQuestionWhereInput = {
    ...mine,
    ...(query.tab === "answered" ? { answeredByInstructor: true } : {}),
    ...(query.tab === "unanswered" ? { answeredByInstructor: false } : {}),
    ...(query.courseId ? { courseId: query.courseId } : {}),
  }

  const [total, rows, courses] = await Promise.all([
    db.courseQuestion.count({ where }),
    db.courseQuestion.findMany({
      where,
      // Newest first. The export's three run 48m, 3h, 1 day, which no other
      // column produces — votes would put the 12-vote row on top.
      orderBy: [{ createdAt: "desc" }],
      skip: (Math.max(1, query.page) - 1) * QUESTIONS_PAGE_SIZE,
      take: QUESTIONS_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        body: true,
        voteCount: true,
        replyCount: true,
        answeredByInstructor: true,
        createdAt: true,
        course: { select: { title: true } },
        lesson: { select: { title: true, order: true } },
        author: {
          select: { name: true, email: true, image: true, role: true },
        },
      },
    }),
    db.course.findMany({
      where: { instructorId: profile.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ])

  // The reader's own votes, in one query rather than a join per row.
  const ids = rows.map((row) => row.id)
  const votes = ids.length
    ? await db.courseQuestionVote.findMany({
        where: { userId: meId, questionId: { in: ids } },
        select: { questionId: true },
      })
    : []
  const voted = new Set(votes.map((vote) => vote.questionId))

  const pageCount = Math.max(1, Math.ceil(total / QUESTIONS_PAGE_SIZE))

  return {
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      courseTitle: row.course.title,
      lessonLabel: lessonLabel(row.lesson),
      voteCount: row.voteCount,
      voted: voted.has(row.id),
      replyCount: row.replyCount,
      answered: row.answeredByInstructor,
      age: compactAgo(row.createdAt, now),
      author: person(row.author),
    })),
    courses,
    total,
    page: Math.min(Math.max(1, query.page), pageCount),
    pageCount,
    query,
  }
}

// ---------------------------------------------------------------------------
// The question page
// ---------------------------------------------------------------------------

export type QaReplyRow = {
  id: string
  body: string
  age: string
  /** Drawn on a tinted card — the export tints the instructor's answers. */
  fromStaff: boolean
  author: QaPerson
}

export type QuestionDetail = {
  id: string
  title: string
  paragraphs: string[]
  courseTitle: string
  lessonLabel: string | null
  voteCount: number
  voted: boolean
  replyCount: number
  answered: boolean
  age: string
  author: QaPerson
  replies: QaReplyRow[]
  me: { name: string; image: string | null; initials: string }
}

/**
 * One question and its replies.
 *
 * **Scoped by the instructor's own courses**, so a question id from another
 * instructor's cohort answers `notFound()` rather than opening — the guard,
 * not a check on a value from the client.
 */
export async function getQuestionDetail(
  questionId: string
): Promise<QuestionDetail | null> {
  const session = await getSession()
  if (!session) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  const meId = session.user.id
  const now = new Date()

  const row = await db.courseQuestion.findFirst({
    where: {
      id: questionId,
      deletedAt: null,
      course: { instructorId: profile.id },
    },
    select: {
      id: true,
      title: true,
      body: true,
      voteCount: true,
      replyCount: true,
      answeredByInstructor: true,
      createdAt: true,
      course: { select: { title: true } },
      lesson: { select: { title: true, order: true } },
      author: { select: { name: true, email: true, image: true, role: true } },
      replies: {
        where: { deletedAt: null },
        // Oldest first — a question and its answers read downward. See the
        // module note about why this differs from the Discussions thread.
        orderBy: { createdAt: "asc" },
        take: QA_THREAD_REPLY_LIMIT,
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: {
            select: { name: true, email: true, image: true, role: true },
          },
        },
      },
    },
  })
  if (!row) return null

  const vote = await db.courseQuestionVote.findUnique({
    where: { questionId_userId: { questionId: row.id, userId: meId } },
    select: { id: true },
  })

  return {
    id: row.id,
    title: row.title,
    paragraphs: row.body
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean),
    courseTitle: row.course.title,
    lessonLabel: lessonLabel(row.lesson),
    voteCount: row.voteCount,
    voted: vote !== null,
    replyCount: row.replyCount,
    answered: row.answeredByInstructor,
    age: compactAgo(row.createdAt, now),
    author: person(row.author),
    replies: row.replies.map((reply) => ({
      id: reply.id,
      body: reply.body,
      age: compactAgo(reply.createdAt, now),
      // Read at render time, which is what `CourseQuestionReply`'s own
      // docstring asks for: storing the badge would let it drift the day
      // somebody's role changes.
      fromStaff:
        reply.author.role === "instructor" || reply.author.role === "admin",
      author: person(reply.author),
    })),
    me: {
      name: session.user.name,
      image: session.user.image ?? null,
      initials: initialsOf(session.user.name, session.user.email),
    },
  }
}

/** The sidebar's Q&A badge: questions in this instructor's courses that still
 *  have no instructor answer. Real work waiting, which is what a badge is for
 *  — see `instructorNavCounts`. */
export async function getUnansweredQuestionCount(): Promise<number> {
  const session = await getSession()
  if (!session) return 0

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return 0

  return db.courseQuestion.count({
    where: {
      deletedAt: null,
      answeredByInstructor: false,
      course: { instructorId: profile.id },
    },
  })
}
