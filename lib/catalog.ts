import "server-only"

import { cache } from "react"

import {
  categoryGradients,
  FALLBACK_CATEGORY_GRADIENT,
} from "@/lib/config/admin-overview"
import type { CatalogCourse } from "@/lib/config/catalog-shape"
import { db } from "@/lib/db"

/**
 * The student catalog, read from the database.
 *
 * **This replaces `lib/config/browse-courses.ts`.** Browse Courses was a
 * client component filtering a hand-written array of 18 courses, which meant a
 * course an instructor built in the app and an admin approved could be
 * `PUBLISHED` and still invisible to every student — the status column was
 * read by nothing a learner could see. Approval now puts a course on sale,
 * which is what the review queue was always for.
 *
 * Two shapes of decision live here:
 *
 *  - **A row carries a `categorySlug`, never an icon component.** The card is
 *    rendered under a client boundary and a function cannot be serialized
 *    across it — the trap `settings-nav-card.tsx` records — so the glyph is
 *    looked up on the client from the slug, the arrangement `ProfileCourse`
 *    already uses. The gradient is resolved here because it is a string.
 *  - **Prices are dollars**, not cents, because that is what the card draws
 *    and what every filter in `browse-courses.tsx` compares against. The
 *    `Course` row stores cents; the conversion belongs at the edge.
 *
 * Only `PUBLISHED` courses are ever returned. A draft, a course in review and
 * one the console rejected are all invisible here, which is the whole point of
 * the status column.
 */

/** Everything the catalog card and its filters need, and nothing else. */
export type { CatalogCourse }

const catalogSelect = {
  id: true,
  slug: true,
  title: true,
  level: true,
  durationHours: true,
  rating: true,
  reviewsCount: true,
  priceCents: true,
  listPriceCents: true,
  thumbnailUrl: true,
  publishedAt: true,
  createdAt: true,
  enrollmentCount: true,
  instructor: { select: { id: true, name: true, slug: true } },
  category: { select: { name: true, slug: true, accentColor: true } },
} as const

type CatalogRow = {
  id: string
  slug: string
  title: string
  level: string
  durationHours: number
  rating: number
  reviewsCount: number
  priceCents: number
  listPriceCents: number
  thumbnailUrl: string | null
  publishedAt: Date | null
  createdAt: Date
  enrollmentCount: number
  instructor: { id: string; name: string; slug: string }
  category: { name: string; slug: string; accentColor: string }
}

function toCatalogCourse(row: CatalogRow): CatalogCourse {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    instructor: row.instructor.name,
    instructorSlug: row.instructor.slug,
    instructorId: row.instructor.id,
    categoryName: row.category.name,
    categorySlug: row.category.slug,
    art:
      categoryGradients[row.category.accentColor] ?? FALLBACK_CATEGORY_GRADIENT,
    thumbnailUrl: row.thumbnailUrl,
    level: row.level,
    durationHours: row.durationHours,
    rating: row.rating,
    reviews: row.reviewsCount,
    students: row.enrollmentCount,
    price: row.priceCents / 100,
    listPrice: (row.listPriceCents || row.priceCents) / 100,
    // Sorting "Newest" needs an ordinal the client can compare without
    // re-parsing a date on every render.
    publishedAtMs: (row.publishedAt ?? row.createdAt).getTime(),
  }
}

/**
 * Every course on sale.
 *
 * Read whole rather than paged: the page filters, sorts and pages entirely in
 * the browser — the arrangement `browse-courses.tsx` was built with and the
 * reason its controls feel instant — so the server's job is to hand over the
 * catalog once. Move this to a SQL query with the filters in the URL if the
 * catalog ever outgrows a few hundred courses; the component's own note says
 * what that would cost.
 *
 * Wrapped in React `cache` so the page and its metadata do not read twice.
 */
export const getCatalogCourses = cache(
  async function getCatalogCourses(): Promise<CatalogCourse[]> {
    const rows = await db.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
      select: catalogSelect,
    })
    return rows.map((row) => toCatalogCourse(row as CatalogRow))
  }
)

/** One course by slug, for the cart and checkout. `null` when it is not on
 *  sale — which is what stops a draft being added to a basket. */
export const getCatalogCourse = cache(async function getCatalogCourse(
  slug: string
): Promise<CatalogCourse | null> {
  const row = await db.course.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: catalogSelect,
  })
  return row ? toCatalogCourse(row as CatalogRow) : null
})

/** Several at once, for the cart — one query rather than one per row. */
export async function getCatalogCoursesBySlug(
  slugs: string[]
): Promise<Map<string, CatalogCourse>> {
  if (slugs.length === 0) return new Map()
  const rows = await db.course.findMany({
    where: { slug: { in: slugs }, status: "PUBLISHED" },
    select: catalogSelect,
  })
  return new Map(
    rows.map((row) => {
      const course = toCatalogCourse(row as CatalogRow)
      return [course.slug, course]
    })
  )
}
