import { getSession } from "@/lib/auth"
import {
  ANALYTICS_COURSE_LIMIT,
  ANALYTICS_DEFAULT_RANGE,
  analyticsRangeValues,
  ENROLMENT_MONTHS,
  enrolmentSources,
  rangeDays,
  type AnalyticsRange,
} from "@/lib/config/instructor-analytics"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import type { EnrollmentSource, Prisma } from "@/lib/generated/prisma/client"

/**
 * The read behind `/dashboard/instructor/analytics`, from
 * `ui-design/light/dashboard/instructor/analytics-page.png`.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy, the range vocabulary and the source palette live in
 * `lib/config/instructor-analytics.ts` so the range select can import them
 * freely.
 *
 * **Nothing on the page is demo data and it needed no migration** —
 * `Enrollment` carries `createdAt`, `source`, `completedAt`, `lastAccessedAt`
 * and `progressPercent`, and `CourseQuestion.answeredByInstructor` is the
 * backlog the sidebar badge already counts. The one thing the export asks for
 * that no table can answer is traffic attribution; see `enrolmentSources` for
 * what the card draws instead and what would have to land to draw the rest.
 *
 * Seven definitions decide what the page means, and the export settles none of
 * them:
 *
 *  - **The range select is the page's premise, so every figure is measured
 *    over the selected window and every delta compares the window immediately
 *    before it.** That is one rule rather than the console's mixture of
 *    running totals and period figures, and it is what the control in the
 *    header promises: change it and both halves of every comparison move
 *    together. `New signups` on the Reports page is the same shape.
 *  - **Open questions is the one exception, and its footnote says so.** A
 *    backlog is a *now* figure — "awaiting your reply" is not a thing that
 *    happened during a window — so the headline is the standing count of
 *    unanswered questions, the identical definition the sidebar badge and the
 *    manage page's Q&A row already use. Its **delta compares arrivals**: how
 *    many still-open questions were asked in this window against the window
 *    before, which is what tells an instructor whether they are falling
 *    behind. It is drawn as a **count**, not a percentage, because the export
 *    draws "+2" and because "+22%" of a queue of nine says less.
 *  - **Completion rate and Avg. watch time are measured over enrolments
 *    *active* in the window** — `lastAccessedAt` inside it — which is exactly
 *    what the export's own footnote "across active cohorts" says. Scoping them
 *    to enrolments *created* in the window was the other reading and is much
 *    worse: nobody who joined seven days ago has finished, so a short range
 *    would draw 0% and call it a fact about the course. **These are therefore
 *    not the manage page's figures**, which are that course's all-time health;
 *    two different questions under two different labels, and the table below
 *    draws the all-time pair so the two screens still agree per course.
 *  - **Avg. watch time is the mean of `Enrollment.progressPercent`**, which is
 *    not a stand-in for watch time but *is* it — that column's own docstring
 *    says it is computed from watch seconds against lesson duration, which is
 *    also why the export's footnote reads "of each lesson".
 *  - **The chart is the last six *complete* months and ignores the range.**
 *    "New enrolments by month" over "Last 7 days" would be one partial column,
 *    and a partial month plotted beside complete ones reads as a collapse —
 *    the trap `getRevenueByMonth` documents, which turned that card's pill
 *    into −76.8% on real data. The console's Reports page already pairs a
 *    30-day KPI row with a fixed six-month chart for this reason. Its pill is
 *    the trend it actually plots: the last complete month against the one
 *    before. The export draws the same +8.1% on the chart and on the New
 *    enrolments card, which its mock numbers make a coincidence rather than a
 *    definition.
 *  - **The table ranks on enrolments *in the period*, which is what its own
 *    subtitle says, and its Completion and Watch time columns are the
 *    course's all-time health** — the identical definitions the manage page's
 *    Course health card draws, so one course cannot report two completion
 *    rates on two instructor screens.
 *  - **Every query is scoped by `Course.instructorId` in the `where`**, never
 *    filtered afterwards, so nothing here can reach another instructor's
 *    cohort.
 */

export type AnalyticsStat = {
  /** A count, or a fraction (0.88 for 88%), per the card's `format`. */
  value: number | null
  /**
   * `null` when there is nothing to compare against, which renders as no chip
   * at all rather than a misleading +100%. A relative change for the rate
   * cards, a difference in **points** for the two percentages, and a plain
   * count for Open questions.
   */
  delta: number | null
}

export type AnalyticsStats = {
  enrolments: AnalyticsStat
  openQuestions: AnalyticsStat
  completion: AnalyticsStat
  watchTime: AnalyticsStat
  /** The New enrolments footnote — enrolments ÷ days in the window, unrounded;
   *  `analyticsFootnotes.enrolments` decides how it is written. */
  perDay: number
}

export type EnrolmentMonth = {
  /** First instant of the month, UTC. */
  month: Date
  count: number
}

export type EnrolmentSeries = {
  months: EnrolmentMonth[]
  total: number
  /** The tallest month's short name, or null when nothing landed. */
  bestMonth: string | null
  /** Last complete month against the one before — the card's corner pill. */
  delta: number | null
}

export type SourceRow = {
  source: EnrollmentSource
  count: number
  /** 0–100, rounded, and what both the figure and the bar read. */
  percent: number
}

export type CoursePerformanceRow = {
  id: string
  title: string
  thumbnailUrl: string | null
  categorySlug: string
  categoryAccent: string
  /** New enrolments in the window — the ranking column. */
  enrolments: number
  /** All-time, per course — see the module note. Null before anybody enrols. */
  completion: number | null
  watchTime: number | null
}

export type AnalyticsPage = {
  range: AnalyticsRange
  stats: AnalyticsStats
  series: EnrolmentSeries
  sources: SourceRow[]
  courses: CoursePerformanceRow[]
  /** Whether this instructor has any course at all — what decides between the
   *  page and its illustrated empty state. */
  hasCourses: boolean
  generatedAt: Date
}

const DAY = 24 * 60 * 60 * 1000

const monthName = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
})

/**
 * The gate on what arrives off the URL. An unknown range falls back to the
 * export's own "Last 30 days" — the same shape `parseStudentsQuery` and
 * `parseReviewsQuery` apply, so a hand-edited query string never reaches
 * Prisma.
 */
export function parseAnalyticsQuery(params: {
  range?: string | string[]
}): AnalyticsRange {
  const raw = Array.isArray(params.range) ? params.range[0] : params.range
  return raw && analyticsRangeValues.has(raw)
    ? (raw as AnalyticsRange)
    : ANALYTICS_DEFAULT_RANGE
}

/** A relative change, or null when there is no base to compare against. */
function growth(now: number, before: number): number | null {
  if (before === 0) return null
  return (now - before) / before
}

/** First instant of the UTC month `monthsBack` months before this one. */
function monthStart(monthsBack: number) {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1)
  )
}

export async function getAnalyticsPage(
  range: AnalyticsRange
): Promise<AnalyticsPage | null> {
  const session = await getSession()
  if (!session) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  const now = new Date()
  const days = rangeDays(range)
  const from = new Date(now.getTime() - days * DAY)
  const before = new Date(now.getTime() - 2 * days * DAY)

  const mine: Prisma.EnrollmentWhereInput = {
    course: { instructorId: profile.id },
  }
  const window = { gte: from }
  const priorWindow = { gte: before, lt: from }

  // **Wave one.** Everything the page needs is independent of everything else,
  // so it goes in one round of hops — the arrangement `lib/messages.ts`
  // records. `aggregate` rather than `findMany` everywhere a mean or a count
  // is wanted, so no row crosses the wire to be reduced in JS.
  const [
    courseCount,
    enrolments,
    priorEnrolments,
    openQuestions,
    openThisWindow,
    openPriorWindow,
    watch,
    priorWatch,
    activeCompleted,
    priorActiveCompleted,
  ] = await Promise.all([
    db.course.count({ where: { instructorId: profile.id } }),
    db.enrollment.count({ where: { ...mine, createdAt: window } }),
    db.enrollment.count({ where: { ...mine, createdAt: priorWindow } }),
    // The backlog, not a window figure — the identical definition the sidebar
    // badge counts.
    db.courseQuestion.count({
      where: {
        course: { instructorId: profile.id },
        deletedAt: null,
        answeredByInstructor: false,
      },
    }),
    db.courseQuestion.count({
      where: {
        course: { instructorId: profile.id },
        deletedAt: null,
        answeredByInstructor: false,
        createdAt: window,
      },
    }),
    db.courseQuestion.count({
      where: {
        course: { instructorId: profile.id },
        deletedAt: null,
        answeredByInstructor: false,
        createdAt: priorWindow,
      },
    }),
    // The size of the active cohort comes back from the **same** call as its
    // mean progress — `aggregate` takes `_count` alongside `_avg` — rather
    // than from a `count` of its own. Two fewer connections for one page
    // render, which is not housekeeping: this block already opens ten at once
    // against a pooled endpoint, and every one of them is a round trip.
    db.enrollment.aggregate({
      where: { ...mine, lastAccessedAt: window },
      _avg: { progressPercent: true },
      _count: { _all: true },
    }),
    db.enrollment.aggregate({
      where: { ...mine, lastAccessedAt: priorWindow },
      _avg: { progressPercent: true },
      _count: { _all: true },
    }),
    db.enrollment.count({
      where: { ...mine, lastAccessedAt: window, completedAt: { not: null } },
    }),
    db.enrollment.count({
      where: {
        ...mine,
        lastAccessedAt: priorWindow,
        completedAt: { not: null },
      },
    }),
  ])

  // **Wave two** — the three blocks below the KPI row. The month series is the
  // only raw query on the page, for `getRevenueByMonth`' reason: Prisma cannot
  // group by a date truncation, and the alternative pulls six months of
  // enrolments across the wire to produce six numbers.
  const seriesFrom = monthStart(ENROLMENT_MONTHS)
  const seriesUntil = monthStart(0)

  const [monthRows, sourceGroups, courseGroups] = await Promise.all([
    db.$queryRaw<{ month: Date; count: bigint | number }[]>`
      SELECT date_trunc('month', e."createdAt" AT TIME ZONE 'UTC') AS month,
             COUNT(*)::bigint AS count
      FROM "enrollment" e
      JOIN "course" c ON c.id = e."courseId"
      WHERE c."instructorId" = ${profile.id}
        AND e."createdAt" >= ${seriesFrom}
        AND e."createdAt" < ${seriesUntil}
      GROUP BY 1
      ORDER BY 1
    `,
    db.enrollment.groupBy({
      by: ["source"],
      where: { ...mine, createdAt: window },
      _count: { _all: true },
    }),
    db.enrollment.groupBy({
      by: ["courseId"],
      where: { ...mine, createdAt: window },
      _count: { _all: true },
    }),
  ])

  // ---- the chart -----------------------------------------------------------
  // `date_trunc(... AT TIME ZONE 'UTC')` returns a naive timestamp, which the
  // driver hands back as a local-time Date; rebuilding the key from its UTC
  // parts is what keeps it comparable with the boundaries below. Months with
  // no enrolments come back missing from the group, so the series is built
  // from the boundaries and *filled* from the result — a quiet month draws a
  // zero bar rather than vanishing and leaving five columns.
  const byMonth = new Map<number, number>()
  for (const row of monthRows) {
    const key = Date.UTC(row.month.getFullYear(), row.month.getMonth(), 1)
    byMonth.set(key, Number(row.count))
  }
  const months: EnrolmentMonth[] = Array.from(
    { length: ENROLMENT_MONTHS },
    (_, index) => {
      const month = monthStart(ENROLMENT_MONTHS - index)
      return { month, count: byMonth.get(month.getTime()) ?? 0 }
    }
  )
  const seriesTotal = months.reduce((sum, entry) => sum + entry.count, 0)
  const best = months.reduce<EnrolmentMonth | null>(
    (top, entry) => (top === null || entry.count > top.count ? entry : top),
    null
  )

  // ---- where enrolments come from -----------------------------------------
  // Ordered by share, which is the export's own sequence, and **every source
  // with no rows is dropped** rather than drawn as a 0% bar — the "an empty
  // queue is dropped rather than drawn as a zero" rule. The colour is keyed to
  // the source rather than to the position, so a row keeps its swatch as the
  // shares move; see `enrolmentSources`.
  const sourceTotal = sourceGroups.reduce(
    (sum, group) => sum + group._count._all,
    0
  )
  const sources: SourceRow[] = enrolmentSources
    .flatMap((entry) => {
      const count =
        sourceGroups.find((group) => group.source === entry.value)?._count
          ._all ?? 0
      if (count === 0) return []
      return [
        {
          source: entry.value,
          count,
          percent: Math.round((count / sourceTotal) * 100),
        },
      ]
    })
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source))

  // ---- course performance --------------------------------------------------
  // Only courses that took an enrolment in the window, which is what "Ranked
  // by new enrolments in this period" promises; a course with none would be a
  // row of zeroes explaining nothing. Tie-broken on `courseId` because
  // `groupBy` guarantees no ordering — the bug the Reviews page's own
  // by-course card caught in the browser.
  const ranked = [...courseGroups]
    .sort(
      (a, b) =>
        b._count._all - a._count._all || a.courseId.localeCompare(b.courseId)
    )
    .slice(0, ANALYTICS_COURSE_LIMIT)

  const rankedIds = ranked.map((group) => group.courseId)
  const [courseRows, healthGroups, completedGroups] =
    rankedIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          db.course.findMany({
            where: { id: { in: rankedIds } },
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              category: { select: { slug: true, accentColor: true } },
            },
          }),
          // All-time per course, the manage page's own definitions.
          db.enrollment.groupBy({
            by: ["courseId"],
            where: { courseId: { in: rankedIds } },
            _count: { _all: true },
            _avg: { progressPercent: true },
          }),
          db.enrollment.groupBy({
            by: ["courseId"],
            where: { courseId: { in: rankedIds }, completedAt: { not: null } },
            _count: { _all: true },
          }),
        ])

  const courseById = new Map(courseRows.map((row) => [row.id, row]))
  const healthById = new Map(healthGroups.map((row) => [row.courseId, row]))
  const completedById = new Map(
    completedGroups.map((row) => [row.courseId, row._count._all])
  )

  const courses: CoursePerformanceRow[] = ranked.flatMap((group) => {
    const course = courseById.get(group.courseId)
    if (!course) return []
    const health = healthById.get(group.courseId)
    const total = health?._count._all ?? 0
    return [
      {
        id: course.id,
        title: course.title,
        thumbnailUrl: course.thumbnailUrl,
        categorySlug: course.category.slug,
        categoryAccent: course.category.accentColor,
        enrolments: group._count._all,
        completion:
          total === 0 ? null : (completedById.get(group.courseId) ?? 0) / total,
        watchTime:
          total === 0 ? null : (health?._avg.progressPercent ?? 0) / 100,
      },
    ]
  })

  const active = watch._count._all
  const priorActive = priorWatch._count._all

  const completionNow = active === 0 ? null : activeCompleted / active
  const completionBefore =
    priorActive === 0 ? null : priorActiveCompleted / priorActive
  const watchNow = active === 0 ? null : (watch._avg.progressPercent ?? 0) / 100
  const watchBefore =
    priorActive === 0 ? null : (priorWatch._avg.progressPercent ?? 0) / 100

  return {
    range,
    stats: {
      enrolments: {
        value: enrolments,
        delta: growth(enrolments, priorEnrolments),
      },
      openQuestions: {
        value: openQuestions,
        // Arrivals, not the backlog — see the module note. `null` rather than
        // 0 when neither window saw a question, so the chip is dropped instead
        // of claiming a steady state nothing measured.
        delta:
          openThisWindow === 0 && openPriorWindow === 0
            ? null
            : openThisWindow - openPriorWindow,
      },
      completion: {
        value: completionNow,
        // A difference in **points**, like uptime's on Platform Overview: the
        // relative change between two percentages is a number nobody can read.
        delta:
          completionNow === null || completionBefore === null
            ? null
            : completionNow - completionBefore,
      },
      watchTime: {
        value: watchNow,
        delta:
          watchNow === null || watchBefore === null
            ? null
            : watchNow - watchBefore,
      },
      // **Not rounded to a whole number.** The export's 1,284 over 30 days
      // writes "42 per day average", so a busy account floors — but a quiet
      // one dividing 7 by 30 floored to **0**, which reads as a broken card
      // rather than as a rate. Under one a day it keeps a decimal.
      perDay: enrolments / days,
    },
    series: {
      months,
      total: seriesTotal,
      bestMonth:
        best === null || best.count === 0 ? null : monthName.format(best.month),
      delta: growth(months.at(-1)?.count ?? 0, months.at(-2)?.count ?? 0),
    },
    sources,
    courses,
    hasCourses: courseCount > 0,
    generatedAt: now,
  }
}
