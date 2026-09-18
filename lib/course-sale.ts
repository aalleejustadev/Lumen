import { cache } from "react"

import { db } from "@/lib/db"
import { parseArticle, type ArticleDoc } from "@/lib/article-body"
import {
  categoryGradients,
  categoryIcons as databaseCategoryIcons,
  FALLBACK_CATEGORY_GRADIENT,
  FALLBACK_CATEGORY_ICON,
} from "@/lib/config/admin-overview"
import type {
  BrowseCourseCategory,
  CourseLevel,
} from "@/lib/config/browse-courses"
import {
  type CourseDetail,
  type CourseSection,
  type RatingBreakdownRow,
} from "@/lib/config/course-details"
import { canManageCourse } from "@/lib/instructor"
import { getPublicInstructor } from "@/lib/public-instructor"
import { longAgo } from "@/lib/relative-time"

/**
 * The read behind `/dashboard/courses/[slug]` — the course **sale** page —
 * over both catalogs, the arrangement `lib/course-player.ts` and
 * `lib/public-instructor.ts` already have.
 *
 * That route read only `lib/config/course-details.ts`, so a course built in the
 * app had no sale page at all, and a free-preview lesson an instructor marked
 * in the curriculum was shown to nobody. The order is the usual one: **the
 * static catalog wins**, untouched, and a database course is built into the
 * same `CourseDetail` the page already renders.
 *
 * Four things decide what the database half shows:
 *
 *  - **Only a PUBLISHED course has a sale page** — with one exception, its own
 *    instructor, so they can check how a draft will sell before submitting it.
 *    Anyone else gets a 404 for a draft, as they would for a slug that does not
 *    exist.
 *  - **Free previews carry their real content**, and only they do. A lesson
 *    marked Preview in the curriculum plays its uploaded video, or shows its
 *    article, in the preview dialog; nothing else of the course's content is
 *    read into this page. Those lessons are free by the instructor's own
 *    choice, so there is nothing to gate.
 *  - **Every figure is read**: students are `enrollmentCount`, the breakdown
 *    and the written reviews are `CourseReview` rows, "This course includes"
 *    counts the lessons that exist, and the instructor card's numbers are the
 *    ones the public profile draws (`getPublicInstructor`).
 *  - **It cannot be bought yet, and says so** (`purchasable: false`). The cart
 *    and checkout resolve courses from the static catalog, and fulfilment does
 *    not create an `Enrollment`; a button that looked live and then failed
 *    would be worse than one that explains itself.
 */

export type SalePreviewLesson = {
  id: string
  title: string
  sectionTitle: string
} & (
  | {
      kind: "video"
      /** Null until the instructor uploads one. */
      video: { url: string; durationSeconds: number | null } | null
    }
  | { kind: "article"; minutes: number | null; body: ArticleDoc | null }
)

export type SaleCourse = {
  course: CourseDetail
  /** Real preview content on a database course; null on a catalog course,
   *  whose preview dialog keeps the drawn player. */
  previews: SalePreviewLesson[] | null
  purchasable: boolean
}

const REVIEW_LIMIT = 4

export const getSaleCourse = cache(async function getSaleCourse(
  slug: string
): Promise<SaleCourse | null> {
  // The static catalog used to win here and is gone: every course on this
  // page is a database row now, so there is one path rather than two.
  return buildFromDatabase(slug)
})

async function buildFromDatabase(slug: string): Promise<SaleCourse | null> {
  const course = await db.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      description: true,
      status: true,
      level: true,
      durationHours: true,
      rating: true,
      reviewsCount: true,
      enrollmentCount: true,
      priceCents: true,
      listPriceCents: true,
      saleEndsAt: true,
      learningOutcomes: true,
      requirements: true,
      thumbnailUrl: true,
      hasCertificate: true,
      lifetimeAccess: true,
      category: { select: { name: true, slug: true, accentColor: true } },
      instructor: {
        select: {
          slug: true,
          name: true,
          title: true,
          bio: true,
          imageUrl: true,
          teachingSince: true,
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
              videoAssetId: true,
            },
          },
        },
      },
    },
  })
  if (!course) return null
  if (course.status !== "PUBLISHED" && !(await canManageCourse(course.slug))) {
    return null
  }

  const lessons = course.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({
      ...lesson,
      sectionTitle: section.title,
    }))
  )
  // A quiz is never a preview — the curriculum refuses to mark one — so only
  // video and article rows are considered.
  const previewRows = lessons.filter(
    (lesson) => lesson.isPreview && lesson.type !== "QUIZ"
  )

  const [reviews, breakdownRows, instructorProfile, assets, articles] =
    await Promise.all([
      db.courseReview.findMany({
        where: { courseId: course.id, status: "VISIBLE", deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: REVIEW_LIMIT,
        select: {
          rating: true,
          body: true,
          createdAt: true,
          user: { select: { name: true, image: true } },
        },
      }),
      db.courseReview.groupBy({
        by: ["rating"],
        where: { courseId: course.id, status: "VISIBLE", deletedAt: null },
        _count: { _all: true },
      }),
      getPublicInstructor(course.instructor.slug),
      db.mediaAsset.findMany({
        where: {
          ownerType: "LESSON_VIDEO",
          ownerId: { in: previewRows.map((lesson) => lesson.id) },
        },
        select: { id: true, ownerId: true, url: true, durationSeconds: true },
      }),
      // Article bodies for the preview lessons alone — the rest of the course's
      // content is never read into this page.
      db.courseLesson.findMany({
        where: {
          id: {
            in: previewRows
              .filter((lesson) => lesson.type !== "VIDEO")
              .map((lesson) => lesson.id),
          },
        },
        select: { id: true, articleBody: true },
      }),
    ])

  const previews: SalePreviewLesson[] = previewRows.map((lesson) => {
    const base = {
      id: lesson.id,
      title: lesson.title,
      sectionTitle: lesson.sectionTitle,
    }
    if (lesson.type === "VIDEO") {
      const asset = assets.find(
        (row) => row.id === lesson.videoAssetId && row.ownerId === lesson.id
      )
      return {
        ...base,
        kind: "video" as const,
        video: asset
          ? { url: asset.url, durationSeconds: asset.durationSeconds }
          : null,
      }
    }
    return {
      ...base,
      kind: "article" as const,
      minutes: lesson.durationMinutes,
      body: parseArticle(
        articles.find((row) => row.id === lesson.id)?.articleBody ?? null
      ),
    }
  })

  const sections: CourseSection[] = course.sections.map((section) => {
    const minutes = section.lessons.reduce(
      (sum, lesson) => sum + (lesson.durationMinutes ?? 0),
      0
    )
    return {
      title: section.title,
      lessonsLabel: `${section.lessons.length} ${
        section.lessons.length === 1 ? "lesson" : "lessons"
      }`,
      durationLabel: formatDuration(minutes),
      lessons: section.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        type:
          lesson.type === "QUIZ"
            ? ("quiz" as const)
            : lesson.type === "VIDEO"
              ? ("video" as const)
              : ("article" as const),
        minutes: lesson.durationMinutes ?? 0,
        questions: lesson.questionsCount ?? 0,
        preview: lesson.isPreview && lesson.type !== "QUIZ",
      })),
    }
  })

  const now = new Date()
  const price = course.priceCents / 100
  const listPrice = Math.max(course.listPriceCents, course.priceCents) / 100
  const reviewTotal = breakdownRows.reduce(
    (sum, row) => sum + row._count._all,
    0
  )
  const videoMinutes = lessons
    .filter((lesson) => lesson.type === "VIDEO")
    .reduce((sum, lesson) => sum + (lesson.durationMinutes ?? 0), 0)

  const detail: CourseDetail = {
    // `BrowseCourse.id` orders the static catalog's "Newest" sort, which a
    // database course is not part of.
    id: 0,
    slug: course.slug,
    title: course.title,
    instructor: course.instructor.name,
    // The label the hero badge draws. A database category ("Web Development")
    // is not one of the static catalog's names, and on this page the value is
    // only ever displayed — the glyph comes from `icon` below, keyed by slug.
    category: course.category.name as BrowseCourseCategory,
    level: toDisplayLevel(course.level),
    durationHours: course.durationHours,
    rating: course.rating,
    reviews: course.enrollmentCount,
    price,
    listPrice,
    art:
      categoryGradients[course.category.accentColor] ??
      FALLBACK_CATEGORY_GRADIENT,
    icon: databaseCategoryIcons[course.category.slug] ?? FALLBACK_CATEGORY_ICON,
    thumbnailUrl: course.thumbnailUrl,
    subtitle: course.subtitle,
    description: course.description,
    learningOutcomes: course.learningOutcomes,
    requirements: course.requirements,
    reviewsCount: course.reviewsCount,
    saleEndsInDays:
      course.saleEndsAt && course.saleEndsAt > now && listPrice > price
        ? Math.ceil(
            (course.saleEndsAt.getTime() - now.getTime()) / (24 * 3600 * 1000)
          )
        : 0,
    discountPercent:
      listPrice > price ? Math.round((1 - price / listPrice) * 100) : 0,
    includes: {
      videoHours: Math.round(videoMinutes / 60),
      articlesCount: lessons.filter(
        (lesson) => lesson.type === "ARTICLE" || lesson.type === "PRACTICE"
      ).length,
      quizzesCount: lessons.filter((lesson) => lesson.type === "QUIZ").length,
      // No resource uploads exist, so this is never promised.
      downloadableResources: false,
      certificate: course.hasCertificate,
      lifetimeAccess: course.lifetimeAccess,
    },
    contentSummary: `${sections.length} ${
      sections.length === 1 ? "section" : "sections"
    } · ${lessons.length} ${lessons.length === 1 ? "lesson" : "lessons"} · ${
      course.durationHours
    }h`,
    sections,
    instructorProfile: {
      slug: course.instructor.slug,
      name: course.instructor.name,
      title: course.instructor.title,
      bio: course.instructor.bio,
      avatarUrl:
        course.instructor.imageUrl ??
        course.instructor.user?.image ??
        undefined,
      teachingSince: course.instructor.teachingSince,
      rating: instructorProfile?.rating ?? 0,
      reviewsCount: instructorProfile?.reviewsCount ?? 0,
      studentsCount: instructorProfile?.studentsCount ?? 0,
      coursesCount: instructorProfile?.courses.length ?? 0,
    },
    studentReviews: reviews.map((review) => ({
      name: review.user.name,
      avatarUrl: review.user.image ?? undefined,
      rating: review.rating,
      timeAgo: longAgo(review.createdAt, now),
      body: review.body,
    })),
    ratingBreakdown: ([5, 4, 3, 2, 1] as const).map<RatingBreakdownRow>(
      (stars) => ({
        stars,
        percent:
          reviewTotal === 0
            ? 0
            : Math.round(
                ((breakdownRows.find((row) => row.rating === stars)?._count
                  ._all ?? 0) /
                  reviewTotal) *
                  100
              ),
      })
    ),
  }

  // **Purchasable.** It was hard-coded false because the cart and checkout
  // resolved slugs against the static catalog, so a course built in the app
  // could be viewed and never bought. Both read the database now
  // (`lib/catalog.ts`), and fulfilment enrols the buyer, so the only thing
  // that decides whether a course can be sold is whether it is PUBLISHED —
  // which `getCatalogCourse` already enforces on the way in.
  return {
    course: detail,
    previews,
    purchasable: course.status === "PUBLISHED",
  }
}

function toDisplayLevel(
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS"
): CourseLevel {
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

/** "1h 20m", the static catalog's own section format. */
function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0
    ? `${hours}h`
    : `${hours}h ${String(rest).padStart(2, "0")}m`
}
