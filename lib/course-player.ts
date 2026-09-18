import { cache } from "react"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  categoryGradients,
  FALLBACK_CATEGORY_GRADIENT,
} from "@/lib/config/admin-overview"
import type {
  CourseLevel,
  BrowseCourseCategory,
} from "@/lib/config/browse-courses"
import type {
  CourseLesson,
  CourseReview,
  CourseSection,
} from "@/lib/config/course-details"
import {
  buildEncouragement,
  buildQuizzes,
  buildSections,
  buildSuitFor,
  type CoursePlayerCourse,
  type CourseQuestion,
  type CourseQuiz,
  type QuestionReply,
} from "@/lib/config/course-player"
import { parseArticle, type ArticleDoc } from "@/lib/article-body"
import { canAccessCourseContent } from "@/lib/course-access"
import { compactAgo, longAgo } from "@/lib/relative-time"
import type { CourseLevel as DbCourseLevel } from "@/lib/generated/prisma/client"

/**
 * The read behind `/dashboard/learning/[slug]` — the *enrolled* course page.
 *
 * It exists because that page, and the sale page beside it, resolve their
 * course out of `lib/config/browse-courses.ts`, while every instructor surface
 * resolves one out of the database. Those two catalogs do not overlap
 * completely and **deliberately so**: `seedDeveloperWorkspace`'s courses are
 * kept out of the student catalog because "a course with no authored
 * `CourseDetail` is a sale page that cannot render" (that function's own
 * note). The consequence nobody had hit until the manage page shipped is that
 * **Preview as student 404'd for exactly the courses an instructor owns** —
 * the config-only route had no row for them.
 *
 * So this is a resolver over both, and the order is the point:
 *
 *  - **The static catalog wins.** `mastering-illustration` is hand-authored to
 *    match `course-page__part{1,2}.png` and the three tab exports down to the
 *    copy; every other catalog slug has a generated `CourseDetail` that the
 *    sale page, My Learning and the quiz page all already read. Letting the
 *    database shadow any of that would quietly re-render surfaces that are
 *    built to match an export, which is the one thing this codebase does not
 *    trade away. Nothing that renders today changes.
 *  - **The database is the fallback**, and it is what turns a course with real
 *    rows and no catalog entry from a 404 into a page. It builds the *same*
 *    `CoursePlayerCourse` the config does — through the very same
 *    `buildSections` / `buildQuizzes` / `buildEncouragement` / `buildSuitFor`,
 *    exported from that module for this — so the two halves cannot drift into
 *    two versions of "what a lesson row says".
 *
 * **This is a swap of the source, not of the surface.** `course-player.ts`'
 * own header has said since it was written that it should become real queries
 * "once there is" an `Enrollment` model; there is one now, and this is the
 * half of that swap the 404 forced. The catalog half is a much larger change —
 * Browse Courses, the sale page and My Learning all read those config files —
 * and is deliberately not attempted here.
 *
 * Three things the database answers better than the generator ever did, and
 * they are read rather than invented: the **questions** are real
 * `CourseQuestion` rows with their real replies, the **reviews** are real
 * `CourseReview` rows, and the **progress** is the viewer's own `Enrollment`.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies.
 */

/** How many of each to put on the page. The tabs page nothing, so these are
 *  what the surface shows rather than a page size. */
const REVIEW_LIMIT = 8
const QUESTION_LIMIT = 8
const REPLY_LIMIT = 12

/**
 * Wrapped in React `cache` for `getManageCoursePage`' reason: the route reads
 * it in `generateMetadata` and again to render, and a Prisma call is not
 * deduped the way `fetch` is.
 */
export const getEnrolledCourse = cache(async function getEnrolledCourse(
  slug: string
): Promise<CoursePlayerCourse | null> {
  // The static catalog used to win here. It is gone, so this resolves from
  // the database alone — the swap `lib/course-player.ts`' own header always
  // described as the other half of the `Enrollment` work.
  return buildFromDatabase(slug)
})

/**
 * One quiz on one course, the database-aware twin of `getCourseQuiz`. The
 * quiz page has to resolve the same two halves the lesson row linked at, or a
 * quiz row on a database course would be a chevron onto a 404 — the promise
 * this codebase refuses to make anywhere else.
 */
export const getEnrolledCourseQuiz = cache(async function getEnrolledCourseQuiz(
  courseSlug: string,
  quizSlug: string
) {
  const course = await getEnrolledCourse(courseSlug)
  const quiz = course?.quizzes.find((entry) => entry.slug === quizSlug)
  return course && quiz ? { course, quiz } : null
})

// ---------------------------------------------------------------------------

async function buildFromDatabase(
  slug: string
): Promise<CoursePlayerCourse | null> {
  const course = await db.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      description: true,
      level: true,
      rating: true,
      reviewsCount: true,
      intendedAudience: true,
      category: { select: { name: true, accentColor: true } },
      instructor: {
        select: {
          id: true,
          slug: true,
          name: true,
          title: true,
          imageUrl: true,
          userId: true,
          user: { select: { image: true } },
        },
      },
      sections: {
        orderBy: { order: "asc" },
        select: {
          title: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              durationMinutes: true,
              questionsCount: true,
              isPreview: true,
              quiz: {
                select: {
                  questions: {
                    orderBy: { order: "asc" },
                    select: {
                      prompt: true,
                      options: {
                        orderBy: { order: "asc" },
                        select: { label: true, isCorrect: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  if (!course) return null

  const session = await getSession()
  const now = new Date()

  // The viewer's **own** enrolment, which for an instructor previewing their
  // course is simply absent — so the page opens at zero progress rather than
  // borrowing somebody else's. The config path says the same thing about a
  // course a student has not bought.
  const enrollment = session
    ? await db.enrollment.findUnique({
        where: {
          userId_courseId: { userId: session.user.id, courseId: course.id },
        },
        select: { id: true, progressPercent: true },
      })
    : null

  const [completedLessons, reviews, questions] = await Promise.all([
    enrollment
      ? db.lessonProgress.count({
          where: { enrollmentId: enrollment.id, completedAt: { not: null } },
        })
      : Promise.resolve(0),
    db.courseReview.findMany({
      where: { courseId: course.id, status: "VISIBLE", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: REVIEW_LIMIT,
      select: {
        id: true,
        rating: true,
        body: true,
        createdAt: true,
        user: { select: { name: true, image: true } },
      },
    }),
    db.courseQuestion.findMany({
      where: { courseId: course.id },
      orderBy: { createdAt: "desc" },
      take: QUESTION_LIMIT,
      select: {
        id: true,
        title: true,
        createdAt: true,
        answeredByInstructor: true,
        lessonId: true,
        author: { select: { name: true, image: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          take: REPLY_LIMIT,
          select: {
            id: true,
            body: true,
            createdAt: true,
            authorId: true,
            author: { select: { name: true, image: true } },
          },
        },
      },
    }),
  ])

  // The syllabus, re-cut into the shape `lib/config/course-details.ts`
  // describes, so the three shared builders below see exactly what they see on
  // the config path. `lessonsLabel`/`durationLabel` are the sale page's own
  // strings and nothing on this page reads them, but they are filled honestly
  // rather than left blank.
  const sections: CourseSection[] = course.sections.map((section) => {
    const minutes = section.lessons.reduce(
      (sum, lesson) => sum + (lesson.durationMinutes ?? 0),
      0
    )
    return {
      title: section.title,
      lessonsLabel: `${section.lessons.length} ${section.lessons.length === 1 ? "lesson" : "lessons"}`,
      durationLabel: formatDuration(minutes),
      lessons: section.lessons.map(toConfigLesson),
    }
  })

  const progress = enrollment?.progressPercent ?? 0
  const access = (await canAccessCourseContent(course.id)) ? "full" : "preview"

  // The shared builder cuts the rows and their progress states; the database
  // then adds what only it knows — each row's id, its real kind, whether it is
  // a free preview, and whether this viewer may open it. Walked in the same
  // order, so row N here is lesson N there.
  const dbLessons = course.sections.flatMap((section) => section.lessons)
  let rowIndex = 0
  const playerSections = buildSections(sections, completedLessons).map(
    (section) => ({
      ...section,
      lessons: section.lessons.map((row) => {
        const lesson = dbLessons[rowIndex++]
        if (!lesson) return row
        return {
          ...row,
          id: lesson.id,
          type:
            lesson.type === "QUIZ"
              ? ("quiz" as const)
              : lesson.type === "VIDEO"
                ? ("video" as const)
                : ("article" as const),
          preview: lesson.isPreview,
          locked: access === "preview" && !lesson.isPreview,
        }
      }),
    })
  )

  // "Lesson 7 · Cutting scope" — the index is course-wide, not
  // section-relative, which is what the chip means to somebody reading it.
  const lessonTags = new Map<string, string>()
  let lessonNumber = 0
  for (const section of course.sections) {
    for (const lesson of section.lessons) {
      lessonNumber += 1
      lessonTags.set(lesson.id, `Lesson ${lessonNumber} · ${lesson.title}`)
    }
  }

  const instructorUserId = course.instructor.userId
  const instructorAvatar =
    course.instructor.imageUrl ?? course.instructor.user?.image ?? undefined

  return {
    slug: course.slug,
    access,
    published: course.status === "PUBLISHED",
    title: course.title,
    // The per-category gradient, keyed off `Category.accentColor` exactly as
    // `CourseArt` keys it, so one course does not wear two different tiles on
    // two screens. `lumen-course-card-art` is why there is no photograph.
    art:
      categoryGradients[course.category.accentColor] ??
      FALLBACK_CATEGORY_GRADIENT,
    instructor: {
      name: course.instructor.name,
      title: course.instructor.title,
      avatarUrl: instructorAvatar,
      slug: course.instructor.slug,
    },
    progress,
    encouragement: buildEncouragement(course.title, progress),
    sections: playerSections,
    quizzes: withAuthoredQuestions(
      buildQuizzes(sections),
      course.sections.flatMap((section) =>
        section.lessons.filter((lesson) => lesson.type === "QUIZ")
      )
    ),
    about: {
      description: course.description,
      // `Course.intendedAudience` is a single authored line when an instructor
      // has written one; otherwise the same generated list the catalog path
      // builds, from the same function.
      suitFor: course.intendedAudience
        ? [course.intendedAudience]
        : buildSuitFor({
            title: course.title,
            level: toDisplayLevel(course.level),
            category: course.category.name as BrowseCourseCategory,
          }),
    },
    questions: questions.map<CourseQuestion>((question) => ({
      id: question.id,
      title: question.title,
      name: question.author.name,
      avatarUrl: question.author.image ?? undefined,
      timeAgo: compactAgo(question.createdAt, now),
      lessonTag:
        (question.lessonId ? lessonTags.get(question.lessonId) : undefined) ??
        "This course",
      // The stored column, not `replies.length`: a question with six learner
      // replies and no instructor answer is still unanswered, which is the
      // distinction `lib/qa.ts` records at length.
      answered: question.answeredByInstructor,
      replies: question.replies.map<QuestionReply>((reply) => ({
        name: reply.author.name,
        role:
          instructorUserId && reply.authorId === instructorUserId
            ? "Instructor"
            : "Student",
        avatarUrl: reply.author.image ?? undefined,
        timeAgo: compactAgo(reply.createdAt, now),
        body: reply.body,
      })),
    })),
    rating: course.rating,
    reviewsCount: course.reviewsCount,
    reviews: reviews.map<CourseReview>((review) => ({
      name: review.user.name,
      avatarUrl: review.user.image ?? undefined,
      rating: review.rating,
      // The prose ladder, not the compact one — a review reaching back weeks
      // says "3 weeks ago", which is what `course-reviews__tab.png` draws.
      timeAgo: longAgo(review.createdAt, now),
      body: review.body,
    })),
    // A student's own notes start empty, exactly as the config path leaves
    // them: `LessonNote` has no writer yet and the Notes tab is local state.
    notes: [],
  }
}

/**
 * Swaps in the questions an instructor wrote in the quiz editor.
 *
 * `buildQuizzes` walks the syllabus and returns one quiz per quiz lesson, in
 * order, which is what keeps the lesson row's slug and the quiz page agreeing —
 * so this keeps that list and only replaces each quiz's questions, matched by
 * position against the same quiz lessons in the same order. A lesson whose
 * quiz has not been written yet keeps the generated placeholder, which is what
 * every seeded course has always shown.
 *
 * `answerIndex` is the position of the option marked correct; `saveQuiz`
 * guarantees exactly one.
 */
function withAuthoredQuestions(
  quizzes: CourseQuiz[],
  lessons: {
    quiz: {
      questions: {
        prompt: string
        options: { label: string; isCorrect: boolean }[]
      }[]
    } | null
  }[]
): CourseQuiz[] {
  return quizzes.map((quiz, index) => {
    const authored = lessons[index]?.quiz?.questions ?? []
    if (authored.length === 0) return quiz
    return {
      ...quiz,
      questions: authored.map((question) => ({
        prompt: question.prompt,
        options: question.options.map((option) => option.label),
        answerIndex: Math.max(
          0,
          question.options.findIndex((option) => option.isCorrect)
        ),
      })),
    }
  })
}

/** `LessonType` is spelled in caps in the database and in lower case in the
 *  config, and the two enums do not otherwise differ. */
function toConfigLesson(lesson: {
  title: string
  type: "VIDEO" | "ARTICLE" | "QUIZ" | "PRACTICE"
  durationMinutes: number | null
  questionsCount: number | null
}): CourseLesson {
  if (lesson.type === "QUIZ") {
    return {
      title: lesson.title,
      type: "quiz",
      // The sale page's syllabus and the quiz page's "Question 1 of N" read
      // one number, so a lesson with no authored count falls back to the five
      // `buildQuizzes` would have generated anyway.
      questions: lesson.questionsCount ?? 5,
    }
  }
  return {
    title: lesson.title,
    type:
      lesson.type === "ARTICLE"
        ? "article"
        : lesson.type === "PRACTICE"
          ? "practice"
          : "video",
    minutes: lesson.durationMinutes ?? 0,
  }
}

function toDisplayLevel(level: DbCourseLevel): CourseLevel {
  switch (level) {
    case "BEGINNER":
      return "Beginner"
    case "INTERMEDIATE":
      return "Intermediate"
    case "ADVANCED":
      return "Advanced"
    default:
      return "All Levels"
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

// ---------------------------------------------------------------------------
// The lesson on screen
// ---------------------------------------------------------------------------

/**
 * What the enrolled course page shows in place of its player, for one lesson
 * of a database course.
 *
 * **Content is read only when the viewer may see it.** A locked lesson comes
 * back as `locked` with its title and nothing else, so its video URL and
 * article body never reach the page — see `lib/course-access.ts`.
 */
export type LessonView = {
  id: string
  title: string
  sectionTitle: string
  /** 1-based, across the whole course — "Lesson 3 of 12". */
  number: number
  total: number
  previousId: string | null
  nextId: string | null
  /** Whether *this viewer* has ticked it. Drives the Mark-as-complete button,
   *  and is false for anyone without an enrolment — an instructor previewing
   *  their own course has no progress of their own to show. */
  completed: boolean
} & (
  | {
      kind: "video"
      /** Null until the instructor uploads one. */
      video: { url: string; durationSeconds: number | null } | null
    }
  | { kind: "article"; minutes: number | null; body: ArticleDoc | null }
  | { kind: "quiz"; questions: number; quizSlug: string | null }
  | { kind: "locked"; lessonKind: "video" | "article" | "quiz" }
)

/**
 * Resolves the lesson to show: the one named in `?lesson=`, else the lesson
 * the viewer is on (the syllabus's "current" row), else the first. An id that
 * is not one of this course's lessons falls back the same way rather than
 * 404ing, the way an unknown editor step does.
 */
export async function getLessonView(
  course: CoursePlayerCourse,
  requestedId: string | undefined
): Promise<LessonView | null> {
  if (!course.access) return null

  const rows = course.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({ lesson, sectionTitle: section.title }))
  )
  const withIds = rows.filter((row) => row.lesson.id)
  if (withIds.length === 0) return null

  const index = Math.max(
    0,
    withIds.findIndex((row) => row.lesson.id === requestedId) !== -1
      ? withIds.findIndex((row) => row.lesson.id === requestedId)
      : withIds.findIndex((row) => row.lesson.state === "current")
  )
  const { lesson: row, sectionTitle } = withIds[index]!

  // Whether this viewer has ticked it. One indexed lookup through their own
  // enrolment, so somebody previewing a course they do not take reads false
  // rather than borrowing a student's progress.
  const session = await getSession()
  const progress = session
    ? await db.lessonProgress.findFirst({
        where: {
          lessonId: row.id!,
          enrollment: { userId: session.user.id },
          NOT: { completedAt: null },
        },
        select: { id: true },
      })
    : null

  const base = {
    id: row.id!,
    title: row.title,
    sectionTitle,
    number: index + 1,
    total: withIds.length,
    previousId: withIds[index - 1]?.lesson.id ?? null,
    nextId: withIds[index + 1]?.lesson.id ?? null,
    completed: progress !== null,
  }

  if (row.locked) return { ...base, kind: "locked", lessonKind: row.type }

  // Scoped by the course slug as well as the id, so a lesson id from another
  // course cannot be read through this one's page.
  const lesson = await db.courseLesson.findFirst({
    where: { id: row.id, section: { course: { slug: course.slug } } },
    select: {
      type: true,
      title: true,
      durationMinutes: true,
      questionsCount: true,
      articleBody: true,
      videoAssetId: true,
    },
  })
  if (!lesson) return null

  if (lesson.type === "QUIZ") {
    return {
      ...base,
      title: lesson.title,
      kind: "quiz",
      questions: lesson.questionsCount ?? 0,
      quizSlug: row.quizSlug ?? null,
    }
  }

  if (lesson.type === "VIDEO") {
    const asset = lesson.videoAssetId
      ? await db.mediaAsset.findFirst({
          where: {
            id: lesson.videoAssetId,
            ownerId: row.id,
            ownerType: "LESSON_VIDEO",
          },
          select: { url: true, durationSeconds: true },
        })
      : null
    return {
      ...base,
      title: lesson.title,
      kind: "video",
      video: asset
        ? { url: asset.url, durationSeconds: asset.durationSeconds }
        : null,
    }
  }

  return {
    ...base,
    title: lesson.title,
    kind: "article",
    minutes: lesson.durationMinutes,
    body: parseArticle(lesson.articleBody),
  }
}
