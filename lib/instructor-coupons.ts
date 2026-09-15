import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import {
  COUPONS_PAGE_SIZE,
  couponTabValues,
  type CouponStatus,
  type CouponTab,
} from "@/lib/config/instructor-coupons"
import type {
  Prisma,
  PromotionDiscountType,
} from "@/lib/generated/prisma/client"

/**
 * The reads behind `/dashboard/instructor/coupons`, from
 * `ui-design/light/dashboard/instructor/coupons-page__main.png`.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy and the page size live in
 * `lib/config/instructor-coupons.ts` so the table can import them freely.
 *
 * **Nothing on the page is demo data.** `Coupon` and `CouponRedemption` were
 * already shaped for it, and `CouponRedemption`'s own docstring names two of
 * its figures and dictates how they are produced: "both sums over rows, never
 * counters that can drift from the orders they claim to describe". So every
 * number here is a `count` or a `sum`, and the seed writes coupon *orders*
 * rather than inventing redemption totals — see `seedPurchases`.
 *
 * Five definitions decide what the page means, and the export settles none of
 * them:
 *
 *  - **Status is read off the clock**, never stored — the call `Promotion`
 *    already makes. Scheduled is `startsAt` in the future, Expired is `endsAt`
 *    in the past, everything else is Active. A coupon at its redemption limit
 *    stays Active, because that is what the export draws (EARLYBIRD, 148/150);
 *    exhaustion is a different fact and the redemption cell is where it shows.
 *  - **Revenue is `redemptions × resultingPriceCents`**, the price the coupon
 *    itself snapshots — not a join into order items. That column exists
 *    because "the list price can move afterwards" (the model's own note), so
 *    it is the only figure that still means what it meant on the day of the
 *    sale. The export's own rows disagree with any single definition — three
 *    of its four reconcile with redemptions × price and LAUNCH40 does not — so
 *    one definition wins, the reading the categories page's percentages
 *    settled.
 *  - **"Avg. discount given" is weighted by redemptions**, not a plain average
 *    over coupons. It is what was *given*, so a code used 212 times has to
 *    count 212 times; averaging the codes instead would let an unused one
 *    swing the number.
 *  - **The four KPI figures ignore the tabs and the course filter.** They
 *    describe the instructor's whole coupon programme, and a headline that
 *    moved every time somebody opened a tab would be measuring the filter.
 *  - **Filtering and paging happen in SQL, driven by the URL** (`?tab=&course=&page=`),
 *    the arrangement the audit log and the Users table already have: a
 *    narrowed view is a link, the back button walks it, and a reload keeps it.
 *    `parseCouponsQuery` is the gate.
 */

export type CouponsQuery = {
  tab: CouponTab
  /** A course id, or null for "All courses". */
  courseId: string | null
  page: number
}

export type CouponRow = {
  id: string
  code: string
  courseId: string
  courseTitle: string
  discountType: PromotionDiscountType
  percentOff: number
  priceCents: number
  listPriceCents: number
  redemptionLimit: number | null
  redemptions: number
  revenueCents: number
  status: CouponStatus
  startsAt: Date
  endsAt: Date | null
}

export type CouponCourse = {
  id: string
  title: string
  priceCents: number
  listPriceCents: number
}

export type CouponsPage = {
  rows: CouponRow[]
  courses: CouponCourse[]
  total: number
  page: number
  pageCount: number
  query: CouponsQuery
  stats: {
    activeCount: number
    redemptions: number
    revenueCents: number
    /** Whole percent, redemption-weighted. Null when nothing has been redeemed. */
    averageDiscount: number | null
  }
  /** Counted once here so the table's "1–5 of 8" and the pager agree. */
  generatedAt: Date
}

/**
 * Turns whatever arrived in the URL into a query this module will act on.
 *
 * An unknown tab falls back to `all` and an unknown course to "every course",
 * rather than erroring — a hand-edited query string should show the unfiltered
 * table, not a crash. The course id is only ever *matched* against the
 * instructor's own courses further down, so it cannot widen what is returned.
 */
export function parseCouponsQuery(params: {
  tab?: string | string[]
  course?: string | string[]
  page?: string | string[]
}): CouponsQuery {
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const rawTab = one(params.tab)
  const rawCourse = (one(params.course) ?? "").trim()
  const rawPage = Number(one(params.page))

  return {
    tab: rawTab && couponTabValues.has(rawTab) ? (rawTab as CouponTab) : "all",
    courseId: rawCourse === "" ? null : rawCourse.slice(0, 64),
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1,
  }
}

/** The clock, in one place, so the tabs, the pills and the counts cannot
 *  disagree about what "now" was. */
function statusOf(
  coupon: { startsAt: Date; endsAt: Date | null },
  now: Date
): CouponStatus {
  if (coupon.startsAt > now) return "scheduled"
  if (coupon.endsAt && coupon.endsAt < now) return "expired"
  return "active"
}

/** The same three states as a `where`, so a tab narrows rows in SQL rather
 *  than in the browser. */
function tabWhere(tab: CouponTab, now: Date): Prisma.CouponWhereInput {
  if (tab === "scheduled") return { startsAt: { gt: now } }
  if (tab === "expired") return { endsAt: { lt: now } }
  if (tab === "active") {
    return {
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    }
  }
  return {}
}

export async function getCouponsPage(
  query: CouponsQuery
): Promise<CouponsPage | null> {
  const session = await getSession()
  if (!session) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  const now = new Date()
  const mine: Prisma.CouponWhereInput = { instructorId: profile.id }

  // The course filter is matched against this instructor's own coupons, so a
  // hand-edited `?course=` can only ever narrow — it can never reach a course
  // somebody else teaches.
  const where: Prisma.CouponWhereInput = {
    ...mine,
    ...tabWhere(query.tab, now),
    ...(query.courseId ? { courseId: query.courseId } : {}),
  }

  // **Wave one.** The page's own rows, the filter's course list and the
  // headline figures are independent, so they go together rather than in
  // series — each Prisma call is a network hop.
  const [total, all, courses] = await Promise.all([
    db.coupon.count({ where }),
    // Every coupon, unpaged: the four KPI cards describe the whole programme
    // (see the module note), and the redemption counts they need are the same
    // ones the visible rows need. One read serves both.
    db.coupon.findMany({
      where: mine,
      // Newest first, with `code` breaking ties so two coupons written in the
      // same second cannot swap places between renders. The *presentation*
      // order is applied below, once the status is known.
      orderBy: [{ createdAt: "desc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        courseId: true,
        discountType: true,
        percentOff: true,
        resultingPriceCents: true,
        redemptionLimit: true,
        startsAt: true,
        endsAt: true,
        course: { select: { title: true, listPriceCents: true } },
        _count: { select: { redemptions: true } },
      },
    }),
    db.course.findMany({
      where: { instructorId: profile.id },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        priceCents: true,
        listPriceCents: true,
      },
    }),
  ])

  const enriched = all.map((coupon) => {
    const redemptions = coupon._count.redemptions
    return {
      id: coupon.id,
      code: coupon.code,
      courseId: coupon.courseId,
      courseTitle: coupon.course.title,
      discountType: coupon.discountType,
      percentOff: coupon.percentOff,
      priceCents: coupon.resultingPriceCents,
      listPriceCents: coupon.course.listPriceCents,
      redemptionLimit: coupon.redemptionLimit,
      redemptions,
      // See the module note: the coupon's own snapshotted price is the only
      // figure that still means what it meant on the day of the sale.
      revenueCents: redemptions * coupon.resultingPriceCents,
      status: statusOf(coupon, now),
      startsAt: coupon.startsAt,
      endsAt: coupon.endsAt,
    }
  })

  /**
   * **Running codes first, then scheduled, then expired — newest first inside
   * each.**
   *
   * The export's own five rows are in no order any single column produces
   * (their end dates run 30 Sep, 12 Sep, 18 Oct, 05 Nov), so there is nothing
   * to reproduce and one definition has to win — the reading the Reports
   * page's payout runs settled. This is the one that matches what the page is
   * *for*: an instructor opens it to see what is live. Sorting purely by
   * recency put the single coupon nobody can use yet at the top.
   *
   * It is done here rather than in SQL because status is derived from the
   * clock, which Postgres cannot order by without recomputing it — and the
   * list is already read whole for the KPI cards, so the sort is free.
   */
  const statusRank: Record<CouponStatus, number> = {
    active: 0,
    scheduled: 1,
    expired: 2,
  }
  enriched.sort(
    (a, b) =>
      statusRank[a.status] - statusRank[b.status] ||
      b.startsAt.getTime() - a.startsAt.getTime() ||
      a.code.localeCompare(b.code)
  )

  const redemptions = enriched.reduce((sum, row) => sum + row.redemptions, 0)
  const stats = {
    activeCount: enriched.filter((row) => row.status === "active").length,
    redemptions,
    revenueCents: enriched.reduce((sum, row) => sum + row.revenueCents, 0),
    averageDiscount:
      redemptions === 0
        ? null
        : Math.round(
            enriched.reduce(
              (sum, row) => sum + row.percentOff * row.redemptions,
              0
            ) / redemptions
          ),
  }

  // The visible page is sliced from the same list, filtered the way `where`
  // filtered the count — so "1–5 of 8" and the rows can never disagree.
  const filtered = enriched.filter((row) => {
    if (query.courseId && row.courseId !== query.courseId) return false
    if (query.tab === "all") return true
    return row.status === query.tab
  })

  const pageCount = Math.max(1, Math.ceil(total / COUPONS_PAGE_SIZE))
  const page = Math.min(query.page, pageCount)
  const rows = filtered.slice(
    (page - 1) * COUPONS_PAGE_SIZE,
    page * COUPONS_PAGE_SIZE
  )

  return {
    rows,
    courses,
    total,
    page,
    pageCount,
    query: { ...query, page },
    stats,
    generatedAt: now,
  }
}
