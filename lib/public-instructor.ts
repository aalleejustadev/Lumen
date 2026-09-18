import { cache } from "react"

import { db } from "@/lib/db"
import {
  categoryGradients,
  FALLBACK_CATEGORY_GRADIENT,
} from "@/lib/config/admin-overview"
import {
  type InstructorReview,
  type ProfileCourse,
  type PublicInstructorProfile,
} from "@/lib/config/instructor-profiles"
import { longAgo } from "@/lib/relative-time"

/**
 * The read behind `/dashboard/instructors/[slug]` — the public instructor
 * profile — over **both catalogs**, the arrangement `lib/course-player.ts`
 * already has for the enrolled course page.
 *
 * It exists because that route read only `lib/config/instructor-profiles.ts`,
 * which knows the instructors of the static demo catalog and nobody else. So
 * *View profile* on a course an instructor built in the app — reached by
 * previewing it as a student — 404'd: the course page resolves from the
 * database, and the profile it linked to did not.
 *
 * The order is the same and for the same reason:
 *
 *  - **The static profiles win.** Simon Simorangkir's page is hand-authored to
 *    match `instructor-page__part{1,2}.png`, and every other catalog instructor
 *    has a generated one. Nothing that rendered before renders differently.
 *  - **The database is the fallback**, keyed by `Instructor.slug`. What it
 *    draws is read, not invented:
 *     - **The figures come from published courses** — students are the sum of
 *       `Course.enrollmentCount`, reviews the sum of `reviewsCount`, and the
 *       rating their mean weighted by review count — the counters My Courses
 *       and the manage page already draw, rather than `Instructor`'s own
 *       `rating` / `studentsCount` columns, which nothing keeps in step.
 *     - **Only PUBLISHED courses are listed.** This is a public page; a draft
 *       or a course in review is not something a learner can open.
 *     - **Reviews are real `CourseReview` rows** on those courses, visible and
 *       not removed, newest first — the two the card draws.
 *     - **About falls back to `bio`** when `about` is empty, so a profile with a
 *       one-liner is not a blank card.
 *
 * Every card links to **the course's sale page**. A database course has one
 * now (`lib/course-sale.ts` builds it for a published course, which is the
 * only kind this page lists), so a learner browsing a profile lands where they
 * would from the catalog: the pitch, the syllabus and the free previews.
 *
 * Wrapped in React `cache` because the route reads it in `generateMetadata`
 * and again to render.
 */

const REVIEW_LIMIT = 2

export const getPublicInstructor = cache(async function getPublicInstructor(
  slug: string
): Promise<PublicInstructorProfile | null> {
  // **One source.** The static profiles used to win here, which is why a
  // course built in the app had a "View profile" that 404'd until the database
  // fallback was added. They are gone, so there is only the database.
  return buildFromDatabase(slug)
})

async function buildFromDatabase(
  slug: string
): Promise<PublicInstructorProfile | null> {
  const instructor = await db.instructor.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      title: true,
      bio: true,
      about: true,
      skills: true,
      imageUrl: true,
      teachingSince: true,
      user: { select: { image: true } },
      courses: {
        where: { status: "PUBLISHED" },
        orderBy: [{ enrollmentCount: "desc" }, { title: "asc" }],
        select: {
          id: true,
          slug: true,
          title: true,
          rating: true,
          reviewsCount: true,
          enrollmentCount: true,
          durationHours: true,
          priceCents: true,
          listPriceCents: true,
          thumbnailUrl: true,
          category: {
            select: { name: true, slug: true, accentColor: true },
          },
        },
      },
    },
  })
  if (!instructor) return null

  const courses = instructor.courses
  const reviews = courses.length
    ? await db.courseReview.findMany({
        where: {
          courseId: { in: courses.map((course) => course.id) },
          status: "VISIBLE",
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        take: REVIEW_LIMIT,
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
          user: { select: { name: true, image: true } },
        },
      })
    : []

  const reviewsCount = courses.reduce((sum, row) => sum + row.reviewsCount, 0)
  const weightedRating =
    reviewsCount === 0
      ? 0
      : courses.reduce((sum, row) => sum + row.rating * row.reviewsCount, 0) /
        reviewsCount
  const now = new Date()

  return {
    slug: instructor.slug,
    name: instructor.name,
    title: instructor.title,
    avatarUrl: instructor.imageUrl ?? instructor.user?.image ?? undefined,
    teachingSince: instructor.teachingSince,
    rating: Math.round(weightedRating * 10) / 10,
    reviewsCount,
    studentsCount: courses.reduce((sum, row) => sum + row.enrollmentCount, 0),
    about:
      instructor.about.length > 0
        ? instructor.about
        : instructor.bio.trim() !== ""
          ? [instructor.bio.trim()]
          : [],
    skills: instructor.skills,
    reviews: reviews.map<InstructorReview>((review) => ({
      name: review.user.name,
      avatarUrl: review.user.image ?? undefined,
      rating: review.rating,
      timeAgo: longAgo(review.createdAt, now),
      body: review.body,
    })),
    courses: courses.map<ProfileCourse>((course) => ({
      slug: course.slug,
      title: course.title,
      categoryLabel: course.category.name,
      // Keyed off `Category.accentColor` exactly as `CourseArt` keys it, so
      // one course does not wear two different tiles on two screens.
      art:
        categoryGradients[course.category.accentColor] ??
        FALLBACK_CATEGORY_GRADIENT,
      glyph: { from: "database", categorySlug: course.category.slug },
      thumbnailUrl: course.thumbnailUrl,
      rating: course.rating,
      reviews: course.reviewsCount,
      durationHours: course.durationHours,
      price: course.priceCents / 100,
      listPrice: course.listPriceCents / 100,
      href: `/dashboard/courses/${course.slug}`,
    })),
  }
}
