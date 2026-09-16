import { cache } from "react"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import { parseArticle, type ArticleDoc } from "@/lib/article-body"
import { couponSchedule } from "@/components/dashboard/instructor/coupons/coupons-format"
import type { EditorStepKey, LessonKind } from "@/lib/config/course-editor"
import type { CourseStatus } from "@/lib/generated/prisma/client"
import type { QuizDraftQuestion } from "@/lib/quiz-draft"

/**
 * The reads behind `/dashboard/instructor/courses/[slug]/edit/[step]` — the
 * course editor the two "Create Course" exports draw.
 *
 * **Nothing on it is demo data and it needed no migration.** Every field the
 * two built steps write already existed: `Course.learningOutcomes`,
 * `requirements` and `intendedAudience` for Intended learners, and
 * `CourseSection` / `CourseLesson` for the Curriculum.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy and the step vocabulary live in
 * `lib/config/course-editor.ts`.
 *
 * Four things decide what it means:
 *
 *  - **It is scoped by `instructorId` in the `where`, never checked after the
 *    read.** A slug from another instructor's catalog has to come back as
 *    nothing rather than as a row this then decides to hide — the console's
 *    reasoning about not distinguishing "you may not see this" from "there is
 *    nothing here", and the same shape `getManageCoursePage` uses.
 *  - **There is no status gate.** The editor is reached from *Continue
 *    editing* on a draft and from the manage page's Curriculum row on a live
 *    course, and both are legitimate: a published course's syllabus is exactly
 *    the thing an instructor comes back to fix. What the status does decide is
 *    whether **Publish** is offered — see `publishCopy.unavailable`.
 *  - **Step completion is derived, never stored.** The nav's green checks are
 *    facts about the row, so all six are honest even though only two steps can
 *    be edited: a `PlatformSetting`-style "steps completed" column would be a
 *    second copy of what the course already says, free to drift from it — the
 *    reasoning `Discussion.replyCount` records from the other side.
 *  - **`lessonCount` and `totalDurationMinutes` are caches of the rows**, so
 *    every write in `lib/actions/instructor-course-edit.ts` recomputes them
 *    from what actually landed rather than incrementing. `Course.lessonCount`
 *    is drawn by My Courses, the manage page, the catalog and the sale page,
 *    so a counter that drifted would be wrong in four places at once — the
 *    rule `CourseQuestion.voteCount` learned the hard way.
 */

export type EditorLesson = {
  id: string
  title: string
  kind: LessonKind
  /** Minutes for a video or article; null until somebody sets one. */
  durationMinutes: number | null
  /** Quiz rows only. */
  questionsCount: number | null
  isPreview: boolean
  /** Whether a `Quiz` row exists behind this lesson. */
  hasQuiz: boolean
  /** Video rows only: the uploaded file, or null until there is one. */
  video: EditorVideo | null
  /** Article rows only: whether anything has been written yet. */
  hasArticle: boolean
}

export type EditorVideo = {
  url: string
  /** The file's original name, as it was picked. */
  fileName: string | null
  sizeBytes: number
  durationSeconds: number | null
}

export type EditorSection = {
  id: string
  title: string
  lessons: EditorLesson[]
}

export type EditorLanding = {
  title: string
  subtitle: string
  /** `Course.description` is a list of paragraphs; the textarea edits them as
   *  one string with a blank line between each. */
  description: string
  thumbnailUrl: string | null
  categorySlug: string
  categoryAccent: string
}

export type EditorPricing = {
  currency: string
  listPriceCents: number
  includedInBusiness: boolean
  /** The coupons running on this course now — see `activeCoupons`. */
  promotions: EditorPromotion[]
}

export type EditorPromotion = {
  id: string
  code: string
  percentOff: number
  /** "Ends 30 Sep 2026", or null for a coupon with no end date. Formatted on
   *  the server, for `audit-format.ts`' reason. */
  schedule: string | null
  redemptions: number
}

export type EditorCourse = {
  id: string
  slug: string
  title: string
  status: CourseStatus
  learningOutcomes: string[]
  requirements: string[]
  intendedAudience: string
  sections: EditorSection[]
  landing: EditorLanding
  pricing: EditorPricing
  /** Blank strings where `Course.welcomeMessage` / `congratulationsMessage`
   *  are null — the textareas edit strings, and blank means "skip it". */
  messages: { welcomeMessage: string; congratulationsMessage: string }
  /** Which of the six steps have something in them — see the module note. */
  completed: Record<EditorStepKey, boolean>
  totals: { lessons: number; sections: number }
}

export const getCourseForEditor = cache(async function getCourseForEditor(
  slug: string
): Promise<EditorCourse | null> {
  const session = await getSession()
  if (!session) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  const course = await db.course.findFirst({
    where: { slug, instructorId: profile.id },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      status: true,
      description: true,
      learningOutcomes: true,
      requirements: true,
      intendedAudience: true,
      priceCents: true,
      thumbnailUrl: true,
      currency: true,
      listPriceCents: true,
      includedInBusiness: true,
      category: { select: { slug: true, accentColor: true } },
      welcomeMessage: true,
      congratulationsMessage: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
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
              videoAssetId: true,
              articleBody: true,
              quiz: { select: { id: true } },
            },
          },
        },
      },
      _count: { select: { coupons: true } },
    },
  })
  if (!course) return null

  // `videoAssetId` is a plain column rather than a relation (the asset table is
  // polymorphic), so the assets are one query over every id rather than a
  // nested select.
  const assetIds = course.sections.flatMap((section) =>
    section.lessons.flatMap((lesson) =>
      lesson.videoAssetId ? [lesson.videoAssetId] : []
    )
  )
  const assets = assetIds.length
    ? await db.mediaAsset.findMany({
        where: { id: { in: assetIds }, ownerType: "LESSON_VIDEO" },
        select: {
          id: true,
          ownerId: true,
          url: true,
          title: true,
          sizeBytes: true,
          durationSeconds: true,
        },
      })
    : []
  const videoFor = (lessonId: string, assetId: string | null) => {
    // Matched on the owner as well as the id, so a column pointing at some
    // other lesson's asset reads as no video rather than borrowing one.
    const asset = assets.find(
      (row) => row.id === assetId && row.ownerId === lessonId
    )
    return asset
      ? {
          url: asset.url,
          fileName: asset.title,
          sizeBytes: asset.sizeBytes,
          durationSeconds: asset.durationSeconds,
        }
      : null
  }

  const sections: EditorSection[] = course.sections.map((section) => ({
    id: section.id,
    title: section.title,
    lessons: section.lessons
      // PRACTICE exists in `LessonType` but this builder offers three kinds,
      // which is what the export draws. A practice row written by the seed
      // still has to render, so it is shown as an article rather than dropped
      // — a lesson an instructor cannot see is a lesson they cannot delete.
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        kind: (lesson.type === "QUIZ"
          ? "QUIZ"
          : lesson.type === "VIDEO"
            ? "VIDEO"
            : "ARTICLE") as LessonKind,
        durationMinutes: lesson.durationMinutes,
        questionsCount: lesson.questionsCount,
        isPreview: lesson.isPreview,
        hasQuiz: lesson.quiz !== null,
        video: videoFor(lesson.id, lesson.videoAssetId),
        hasArticle: (lesson.articleBody ?? "").trim() !== "",
      })),
  }))

  const lessons = sections.reduce(
    (sum, section) => sum + section.lessons.length,
    0
  )

  const now = new Date()
  const coupons = await activeCoupons(course.id, now)

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    status: course.status,
    learningOutcomes: course.learningOutcomes,
    requirements: course.requirements,
    intendedAudience: course.intendedAudience ?? "",
    sections,
    messages: {
      welcomeMessage: course.welcomeMessage ?? "",
      congratulationsMessage: course.congratulationsMessage ?? "",
    },
    landing: {
      title: course.title,
      subtitle: course.subtitle,
      description: course.description.join("\n\n"),
      thumbnailUrl: course.thumbnailUrl,
      categorySlug: course.category.slug,
      categoryAccent: course.category.accentColor,
    },
    pricing: {
      currency: course.currency,
      listPriceCents: course.listPriceCents,
      includedInBusiness: course.includedInBusiness,
      promotions: coupons.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        percentOff: coupon.percentOff,
        schedule: couponSchedule(coupon.startsAt, coupon.endsAt, now),
        redemptions: coupon._count.redemptions,
      })),
    },
    completed: {
      // The step's own copy asks for four outcomes; the check is "has the
      // instructor answered this at all", which is what a tick beside a step
      // name means. The four are a recommendation in the help text, not a gate
      // — `publishCourse` is where a real minimum would belong.
      "intended-learners": course.learningOutcomes.length > 0,
      curriculum: lessons > 0,
      "landing-page":
        course.subtitle.trim() !== "" && course.description.length > 0,
      pricing: course.priceCents > 0,
      coupons: course._count.coupons > 0,
      messages:
        (course.welcomeMessage ?? "").trim() !== "" ||
        (course.congratulationsMessage ?? "").trim() !== "",
    },
    totals: { lessons, sections: sections.length },
  }
})

/**
 * The Pricing step's "Current promotion": coupons on this course that are
 * **live by the clock** — started and not yet ended — which is the same test
 * the Coupons page derives its Active pill from, so the two screens cannot
 * disagree about what is running. A coupon at its redemption limit still
 * counts, for the reason `lib/instructor-coupons.ts` gives.
 *
 * Redemptions are counted rows, never a stored counter
 * (`CouponRedemption`'s own note). The platform's up-to-three rule caps the
 * list, so there is nothing to page.
 */
async function activeCoupons(courseId: string, now: Date) {
  return db.coupon.findMany({
    where: {
      courseId,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      code: true,
      percentOff: true,
      startsAt: true,
      endsAt: true,
      _count: { select: { redemptions: true } },
    },
  })
}

// ---------------------------------------------------------------------------
// One lesson's content
// ---------------------------------------------------------------------------

/**
 * The lesson behind `/edit/article/[lessonId]` or `/edit/quiz/[lessonId]`,
 * reached **through** a course this instructor owns — so a lesson id from
 * somebody else's catalog is simply not found, the same shape
 * `getCourseForEditor` has.
 */
async function ownedLesson(slug: string, lessonId: string) {
  const course = await getCourseForEditor(slug)
  if (!course) return null

  const lesson = await db.courseLesson.findFirst({
    where: { id: lessonId, section: { courseId: course.id } },
    select: {
      id: true,
      title: true,
      type: true,
      articleBody: true,
      section: { select: { title: true } },
    },
  })
  return lesson ? { course, lesson } : null
}

export type ArticleEditorLesson = {
  courseId: string
  courseSlug: string
  courseTitle: string
  lessonId: string
  title: string
  sectionTitle: string
  body: ArticleDoc | null
}

export async function getArticleForEditor(
  slug: string,
  lessonId: string
): Promise<ArticleEditorLesson | null> {
  const found = await ownedLesson(slug, lessonId)
  // A practice row renders as an article in the builder, so it edits as one.
  if (
    !found ||
    (found.lesson.type !== "ARTICLE" && found.lesson.type !== "PRACTICE")
  ) {
    return null
  }

  return {
    courseId: found.course.id,
    courseSlug: found.course.slug,
    courseTitle: found.course.title,
    lessonId: found.lesson.id,
    title: found.lesson.title,
    sectionTitle: found.lesson.section.title,
    body: parseArticle(found.lesson.articleBody),
  }
}

export type QuizEditorLesson = {
  courseId: string
  courseSlug: string
  courseTitle: string
  lessonId: string
  title: string
  sectionTitle: string
  questions: QuizDraftQuestion[]
}

export async function getQuizForEditor(
  slug: string,
  lessonId: string
): Promise<QuizEditorLesson | null> {
  const found = await ownedLesson(slug, lessonId)
  if (!found || found.lesson.type !== "QUIZ") return null

  const quiz = await db.quiz.findUnique({
    where: { lessonId: found.lesson.id },
    select: {
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          prompt: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, label: true, isCorrect: true },
          },
        },
      },
    },
  })

  return {
    courseId: found.course.id,
    courseSlug: found.course.slug,
    courseTitle: found.course.title,
    lessonId: found.lesson.id,
    title: found.lesson.title,
    sectionTitle: found.lesson.section.title,
    questions: quiz?.questions ?? [],
  }
}
