import { db } from "@/lib/db"
import {
  PARTICIPATION_PAGE_SIZE,
  PAST_PROMOTIONS_LIMIT,
} from "@/lib/config/admin-promotions"
import type {
  Prisma,
  PromotionDiscountType,
  PromotionScope,
} from "@/lib/generated/prisma/client"

/**
 * The reads behind `/dashboard/admin/promotions`, from
 * `ui-design/light/dashboard/admin/promotions-page__admin.png`.
 *
 * Pulls in `lib/db`, so the same "never import this from a Client Component"
 * rule as the rest of `lib/admin/` applies — and, as on every console page
 * since Users, the page size and the pill vocabulary live in
 * `lib/config/admin-promotions.ts` so the board can import them without
 * dragging the Postgres driver into the browser bundle.
 *
 * **Nothing on the page is demo data, and it needed no migration.**
 * `Promotion` was already shaped for these two exports, docstrings and all —
 * its own note names this page ("Platform-wide sales, from the admin
 * Promotions page"), `Promotion.value`'s names the dialog's two discount types
 * ("the dialog offers 70 or $9.99 flat"), and `Instructor.promotionOptIn`'s
 * names the participation switch and its two pills. The seed wrote none of
 * them, so `seedPromotions` is new.
 *
 * Four things decide what the page means, and the export settles none of them:
 *
 *  - **A promotion's state is read off the clock, never stored.** `Promotion`
 *    has no status column and should not: `startsAt`/`endsAt` already carry
 *    the answer, and a third column could only ever disagree with them. So
 *    `endsAt > now` is "still to come or running", and everything else is
 *    history. It follows that **ending a sale is a write to `endsAt`**, not a
 *    status flip — see `endPromotion`.
 *
 *  - **Every promotion that has not ended gets a card**, not just the running
 *    one. The export draws a single LIVE NOW sale because that is the state it
 *    was drawn in, but the dialog's Starts field offers a future date, so a
 *    scheduled sale is a state this page can create — and one that appeared
 *    nowhere afterwards would be a sale nobody could find, let alone cancel.
 *
 *  - **"Courses included" and "Opted out" resolve the two levels
 *    `Course.promotionOptIn` documents.** That column is nullable *on purpose*
 *    — null means inherit from `Instructor.promotionOptIn` — so neither count
 *    can be a plain `count()` on one column. `PlatformSetting
 *    .autoEnrollNewCoursesInPromotions` is the **default for new rows**, not a
 *    third runtime level: it is what an instructor's own switch is seeded
 *    from, so consulting it here would double-count a preference that is
 *    already written down. Only **PUBLISHED** courses count, because a draft
 *    is not on sale and a sale cannot discount it.
 *
 *  - **`forceOnAllCourses` collapses the second tile to zero.** The switch's
 *    own words are "Overrides instructor opt-out", so under it there *is* no
 *    opted-out course — reporting the number that would have opted out
 *    without it would describe a sale that is not the one running.
 *
 * **Redemptions and revenue are the counters on `Promotion`.** They are not
 * derived from `Order.promotionId`, which exists and is the row-level link a
 * real checkout will set: this is the arrangement `top-courses-card.tsx` has
 * with `Course.enrollmentCount` and `community-board.tsx` has with
 * `Discussion.replyCount` — a denormalised total the model carries for exactly
 * this card, which the seed sets rather than materialising 12,840 orders that
 * nothing else reads. (`CouponRedemption`'s note argues the other way for
 * coupons, and it can: coupons have a redemption *table* to sum. Promotions
 * have counters instead.)
 */

export type PromotionState = "LIVE" | "SCHEDULED"

/** The shared shape both the cards and the history table read. */
type PromotionBase = {
  id: string
  name: string
  discountType: PromotionDiscountType
  value: number
  scope: PromotionScope
  /** Empty for an ALL_COURSES promotion. */
  categoryIds: string[]
  categoryNames: string[]
  redemptionCount: number
  revenueCents: number
}

export type ActivePromotion = PromotionBase & {
  state: PromotionState
  startsAt: Date
  endsAt: Date
  forceOnAllCourses: boolean
  coursesIncluded: number
  coursesOptedOut: number
}

export type PastPromotion = PromotionBase & { endsAt: Date }

export type ParticipationRow = {
  instructorId: string
  slug: string
  name: string
  imageUrl: string | null
  /** Published courses only — see the module note. */
  courseCount: number
  studentsCount: number
  participating: boolean
}

export type ParticipationPage = {
  rows: ParticipationRow[]
  total: number
  page: number
  pageCount: number
}

/** A category the dialog can scope a promotion to. */
export type PromotionCategory = { id: string; name: string }

export type PromotionsQuery = { page: number }

/**
 * Turns whatever arrived in the URL into a query this module will act on.
 * Exported because the page and the pagination links have to agree on it, and
 * because a hand-edited query string has to resolve to something sane rather
 * than reaching Prisma.
 */
export function parsePromotionsQuery(params: {
  page?: string | string[]
}): PromotionsQuery {
  const raw = Array.isArray(params.page) ? params.page[0] : params.page
  const page = Number(raw)
  return { page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1 }
}

const promotionSelect = {
  id: true,
  name: true,
  discountType: true,
  value: true,
  scope: true,
  startsAt: true,
  endsAt: true,
  forceOnAllCourses: true,
  redemptionCount: true,
  revenueCents: true,
  categories: { select: { id: true, name: true }, orderBy: { order: "asc" } },
} satisfies Prisma.PromotionSelect

type PromotionRecord = Prisma.PromotionGetPayload<{
  select: typeof promotionSelect
}>

function toBase(row: PromotionRecord): PromotionBase {
  return {
    id: row.id,
    name: row.name,
    discountType: row.discountType,
    value: row.value,
    scope: row.scope,
    categoryIds: row.categories.map((category) => category.id),
    categoryNames: row.categories.map((category) => category.name),
    redemptionCount: row.redemptionCount,
    revenueCents: row.revenueCents,
  }
}

/**
 * The published courses a promotion applies to.
 *
 * **A selected category's children are in scope too.** Nothing is nested
 * today, but `Category` is a tree and the dialog only offers the top level —
 * the same list `/dashboard/admin/categories` draws — so without this a
 * sub-category's courses would quietly escape a sale scoped to their parent.
 * It is the roll-up that page already does for its own counts, pointed the
 * other way.
 */
async function inScopeCourseFilter(
  promotion: Pick<PromotionBase, "scope" | "categoryIds">
): Promise<Prisma.CourseWhereInput> {
  if (promotion.scope === "ALL_COURSES") return { status: "PUBLISHED" }

  const children = await db.category.findMany({
    where: { parentId: { in: promotion.categoryIds } },
    select: { id: true },
  })

  return {
    status: "PUBLISHED",
    categoryId: {
      in: [...promotion.categoryIds, ...children.map((row) => row.id)],
    },
  }
}

/**
 * The two course tiles on a promotion card.
 *
 * `optedOut` is one query rather than a scan because the inheritance is
 * expressible in SQL: a course is out if its own switch says so, **or** if it
 * has no switch of its own and its instructor's says so. `included` is then
 * the remainder, which is what stops the two tiles ever failing to account for
 * the courses on sale.
 */
async function countCourses(
  promotion: Pick<PromotionBase, "scope" | "categoryIds"> & {
    forceOnAllCourses: boolean
  }
): Promise<{ coursesIncluded: number; coursesOptedOut: number }> {
  const inScope = await inScopeCourseFilter(promotion)
  const total = await db.course.count({ where: inScope })

  if (promotion.forceOnAllCourses) {
    return { coursesIncluded: total, coursesOptedOut: 0 }
  }

  const optedOut = await db.course.count({
    where: {
      ...inScope,
      OR: [
        { promotionOptIn: false },
        { promotionOptIn: null, instructor: { promotionOptIn: false } },
      ],
    },
  })

  return { coursesIncluded: total - optedOut, coursesOptedOut: optedOut }
}

/**
 * Every promotion that has not ended, soonest first — a running sale above one
 * that has yet to start, which is the order they matter in.
 */
export async function getActivePromotions(
  now = new Date()
): Promise<ActivePromotion[]> {
  const rows = await db.promotion.findMany({
    where: { endsAt: { gt: now } },
    orderBy: { startsAt: "asc" },
    select: promotionSelect,
  })

  return Promise.all(
    rows.map(async (row) => {
      const base = toBase(row)
      return {
        ...base,
        state: (row.startsAt <= now ? "LIVE" : "SCHEDULED") as PromotionState,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        forceOnAllCourses: row.forceOnAllCourses,
        ...(await countCourses({
          ...base,
          forceOnAllCourses: row.forceOnAllCourses,
        })),
      }
    })
  )
}

/**
 * The history table: promotions that have ended, most recent first — which is
 * exactly the export's own four rows read as a calendar (Summer, then
 * Developer Week, Design Refresh and New Year Kickstart).
 */
export async function getPastPromotions(
  now = new Date()
): Promise<PastPromotion[]> {
  const rows = await db.promotion.findMany({
    where: { endsAt: { lte: now } },
    orderBy: { endsAt: "desc" },
    take: PAST_PROMOTIONS_LIMIT,
    select: promotionSelect,
  })
  return rows.map((row) => ({ ...toBase(row), endsAt: row.endsAt }))
}

/**
 * One page of the participation list.
 *
 * **Ordered by reach, most students first**, and *not* by whether the switch is
 * on. Opted-out rows are the actionable ones and sorting them to the top was
 * the other reading, but a list that reorders itself the instant you flip a
 * switch makes the next row you meant to reach jump out from under the cursor.
 * Reach is stable and answers the question an admin actually has — whose
 * absence from the sale costs the most. The export's own four rows are in no
 * order at all (28,410 / 41,044 / 48,300 / 30,240), so nothing is lost.
 *
 * **Every teaching account is listed, including one with nothing published**:
 * the switch is a standing preference that `Course.promotionOptIn` inherits
 * from, so it decides what happens to their *next* course, and a row that
 * appeared only once they published would hide a setting that was already in
 * force.
 */
export async function getInstructorParticipation(
  query: PromotionsQuery
): Promise<ParticipationPage> {
  const total = await db.instructor.count()
  const pageCount = Math.max(1, Math.ceil(total / PARTICIPATION_PAGE_SIZE))
  const page = Math.min(query.page, pageCount)

  const rows = await db.instructor.findMany({
    orderBy: [{ studentsCount: "desc" }, { name: "asc" }],
    skip: (page - 1) * PARTICIPATION_PAGE_SIZE,
    take: PARTICIPATION_PAGE_SIZE,
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrl: true,
      studentsCount: true,
      promotionOptIn: true,
      _count: { select: { courses: { where: { status: "PUBLISHED" } } } },
    },
  })

  return {
    rows: rows.map((row) => ({
      instructorId: row.id,
      slug: row.slug,
      name: row.name,
      imageUrl: row.imageUrl,
      courseCount: row._count.courses,
      studentsCount: row.studentsCount,
      participating: row.promotionOptIn,
    })),
    total,
    page,
    pageCount,
  }
}

/**
 * The categories the dialog can scope a promotion to — the top level only,
 * which is the same list `/dashboard/admin/categories` owns and draws. A
 * sub-category is reached through its parent; `inScopeCourseFilter` is what
 * makes that true of the courses as well.
 */
export async function getPromotionCategories(): Promise<PromotionCategory[]> {
  return db.category.findMany({
    where: { parentId: null },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  })
}
