import { db } from "@/lib/db"

/**
 * Reads for `/dashboard/admin` — the Platform Overview page. Pulls in
 * `lib/db`, so the same "never import this from a Client Component" rule as
 * `lib/cart.ts` applies.
 *
 * Nothing on this page is demo data: every figure is a query. The copy the
 * numbers land in lives in `lib/config/admin-overview.ts`, so this module
 * returns *facts* — counts, dates, sums — and never a sentence.
 *
 * Two conventions run through it:
 *
 *  - **Every delta is month over month on the running total**, not a
 *    comparison of two periods' activity: `(now − 30 days ago) ÷ 30 days ago`.
 *    That is the reading the export's own figures support (a "+8.4%" beside a
 *    cumulative 482,140 accounts can only mean "8.4% more than last month"),
 *    and it keeps all four cards on one definition rather than three.
 *  - **Uptime is the exception, and its delta is in percentage points.** A
 *    relative change between 99.88% and 99.98% is +0.1% either way you compute
 *    it, but only the point difference is the thing an operator means; the
 *    export's "+0.1%" is that number.
 */

const DAY = 24 * 60 * 60 * 1000
/** The comparison window every delta on the page uses. */
const WINDOW_DAYS = 30

export type PlatformStat = {
  /** Already formatted-ready: a count, a cents amount, or a percentage. */
  value: number
  /**
   * Month-over-month change. A relative fraction (0.084 for +8.4%) for the
   * cumulative cards; `null` when there is no earlier figure to compare with,
   * which is the honest answer for a platform in its first month rather than
   * a "+100%".
   */
  delta: number | null
}

export type PlatformStats = {
  users: PlatformStat
  courses: PlatformStat
  /** Cents, all-time, paid orders only. */
  revenue: PlatformStat
  /**
   * A fraction (0.9998), over the trailing 30 days. Its `delta` is in
   * *points* (0.001 for +0.1%), not a relative change — see the note above.
   * `value` is `null` when nothing has recorded a health check yet, which is
   * different from 0% and must not render as an outage.
   */
  uptime: { value: number | null; delta: number | null }
}

export type AttentionFacts = {
  coursesAwaitingReview: {
    count: number
    oldestSubmittedAt: Date | null
  }
  instructorApplications: {
    count: number
    oldestCreatedAt: Date | null
    /** Whether every open application arrived inside the last seven days. */
    allThisWeek: boolean
  }
  reportedReviews: {
    count: number
    /** Split by who filed the report, which is what the second line names. */
    byInstructors: number
    byOthers: number
  }
  failedPayouts: {
    count: number
    /**
     * When the failed transfers get another attempt. A failed payout has no
     * retry column of its own — it rolls into the next scheduled run, so this
     * is that run's date, and `null` means none is on the calendar.
     */
    retryScheduledFor: Date | null
  }
}

export type TopCourse = {
  slug: string
  title: string
  categoryName: string
  /** The `Category.accentColor` token, which is what picks the row's art. */
  categoryAccent: string
  categorySlug: string
  rating: number
  enrollmentCount: number
}

/** `(now − then) ÷ then`, or `null` when there was nothing to grow from. */
function growth(now: number, then: number) {
  if (then <= 0) return null
  return (now - then) / then
}

// ---------------------------------------------------------------------------
// The four stat cards
// ---------------------------------------------------------------------------

export async function getPlatformStats(): Promise<PlatformStats> {
  const cutoff = new Date(Date.now() - WINDOW_DAYS * DAY)

  const [
    users,
    usersBefore,
    courses,
    coursesBefore,
    revenue,
    revenueBefore,
    uptime,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { lt: cutoff } } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.course.count({
      // A course counts as live "a month ago" only if it was already
      // published then — `publishedAt`, not `createdAt`, which is when the
      // instructor started drafting it.
      where: { status: "PUBLISHED", publishedAt: { lt: cutoff } },
    }),
    db.order.aggregate({
      where: { status: "PAID" },
      _sum: { amountTotal: true },
    }),
    db.order.aggregate({
      where: { status: "PAID", paidAt: { lt: cutoff } },
      _sum: { amountTotal: true },
    }),
    getUptime(cutoff),
  ])

  const revenueTotal = revenue._sum.amountTotal ?? 0
  const revenueThen = revenueBefore._sum.amountTotal ?? 0

  return {
    users: { value: users, delta: growth(users, usersBefore) },
    courses: { value: courses, delta: growth(courses, coursesBefore) },
    revenue: { value: revenueTotal, delta: growth(revenueTotal, revenueThen) },
    uptime,
  }
}

/**
 * Availability over the trailing 30 days against the 30 before it, from the
 * daily rollups a health monitor writes into `uptime_sample`. Both halves are
 * summed as checks rather than averaged as percentages, so a day with fewer
 * checks recorded doesn't count for as much as a full one.
 */
async function getUptime(cutoff: Date) {
  const previousCutoff = new Date(cutoff.getTime() - WINDOW_DAYS * DAY)

  const [recent, previous] = await Promise.all([
    db.uptimeSample.aggregate({
      where: { day: { gte: cutoff } },
      _sum: { checksOk: true, checksTotal: true },
    }),
    db.uptimeSample.aggregate({
      where: { day: { gte: previousCutoff, lt: cutoff } },
      _sum: { checksOk: true, checksTotal: true },
    }),
  ])

  const ratio = (sums: {
    checksOk: number | null
    checksTotal: number | null
  }) => (sums.checksTotal ? (sums.checksOk ?? 0) / sums.checksTotal : null)

  const value = ratio(recent._sum)
  const before = ratio(previous._sum)

  return {
    value,
    // Percentage points, not a relative change.
    delta: value !== null && before !== null ? value - before : null,
  }
}

// ---------------------------------------------------------------------------
// Needs your attention
// ---------------------------------------------------------------------------

export async function getAttentionFacts(): Promise<AttentionFacts> {
  const weekAgo = new Date(Date.now() - 7 * DAY)

  const [
    submissions,
    applications,
    reports,
    reportsByInstructors,
    failedPayouts,
    nextRun,
  ] = await Promise.all([
    // `Course.status` holds the latest outcome, so the queue is a count of
    // courses in review rather than of `CourseSubmission` rows — a course
    // that was sent back and resubmitted has several of those.
    db.course.aggregate({
      where: { status: "IN_REVIEW" },
      _count: true,
      _min: { submittedAt: true },
    }),
    db.instructorApplication.aggregate({
      where: { status: "PENDING" },
      _count: true,
      _min: { createdAt: true },
    }),
    db.contentReport.count({
      where: { status: "OPEN", targetType: "REVIEW" },
    }),
    db.contentReport.count({
      where: {
        status: "OPEN",
        targetType: "REVIEW",
        reporter: { role: "instructor" },
      },
    }),
    db.payout.count({ where: { status: "FAILED" } }),
    db.payoutRun.findFirst({
      where: { status: "SCHEDULED", scheduledFor: { gte: new Date() } },
      orderBy: { scheduledFor: "asc" },
      select: { scheduledFor: true },
    }),
  ])

  const oldestApplication = applications._min.createdAt

  return {
    coursesAwaitingReview: {
      count: submissions._count,
      oldestSubmittedAt: submissions._min.submittedAt,
    },
    instructorApplications: {
      count: applications._count,
      oldestCreatedAt: oldestApplication,
      allThisWeek:
        applications._count > 0 &&
        oldestApplication !== null &&
        oldestApplication >= weekAgo,
    },
    reportedReviews: {
      count: reports,
      byInstructors: reportsByInstructors,
      byOthers: reports - reportsByInstructors,
    },
    failedPayouts: {
      count: failedPayouts,
      retryScheduledFor: nextRun?.scheduledFor ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// Top courses platform-wide
// ---------------------------------------------------------------------------

/**
 * Ordered by `Course.enrollmentCount` — the denormalised counter the schema
 * documents, which is also what the catalog and the sale page's "students"
 * stat read, so the same course cannot show two different student numbers on
 * two screens. Counting `enrollment` rows here instead would be a join across
 * the largest table on the platform for a five-row table.
 */
export async function getTopCourses(limit = 5): Promise<TopCourse[]> {
  const rows = await db.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { enrollmentCount: "desc" },
    take: limit,
    select: {
      slug: true,
      title: true,
      rating: true,
      enrollmentCount: true,
      category: { select: { name: true, slug: true, accentColor: true } },
    },
  })

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    categoryName: row.category.name,
    categorySlug: row.category.slug,
    categoryAccent: row.category.accentColor,
    rating: row.rating,
    enrollmentCount: row.enrollmentCount,
  }))
}
