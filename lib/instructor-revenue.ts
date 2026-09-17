import { getSession } from "@/lib/auth"
import {
  EARNING_MONTHS,
  EARNINGS_BY_COURSE_LIMIT,
  PAYOUT_HISTORY_LIMIT,
} from "@/lib/config/instructor-revenue"
import { db } from "@/lib/db"
import type { PayoutMethodView } from "@/lib/instructor-payouts"
import type { PayoutStatus, Prisma } from "@/lib/generated/prisma/client"

/**
 * The read behind `/dashboard/instructor/revenue`, from
 * `ui-design/light/dashboard/instructor/revenue-page.png`.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy, the limits and the status vocabulary live in
 * `lib/config/instructor-revenue.ts` so the chart can import them freely.
 *
 * **Nothing on the page is demo data and it needed no migration.** The schema
 * was shaped for this export down to the sentences:
 * `InstructorEarning.clearsAt`'s own docstring says it is "the page's 'clears
 * within 30 days'", `Payout`'s says "`PO-10428` in the instructor's payout
 * history is the same row the admin's run dialog lists as a recipient", and
 * `PayoutMethod`'s `role` exists because the settings export tags one
 * **Primary**. What the seed did not have was a single order, earning or
 * payout on a developer's *own* profile — see `seedDeveloperWorkspace`.
 *
 * Eight definitions decide what the page means, and the export settles none of
 * them:
 *
 *  - **Every figure is `netCents` — the instructor's own share — and
 *    `REVERSED` rows are excluded everywhere.** A refunded sale's share went
 *    back with the money, so it was never earned; that is the same reading
 *    `admin-reports.ts` settled for the platform's own share, stated from the
 *    other side, and the identical definition My Courses and the manage page
 *    already draw for a course's revenue.
 *  - **"Available for payout" is `AVAILABLE` alone**, not "everything not yet
 *    paid. `EarningStatus` carries PENDING and AVAILABLE as separate states
 *    precisely because money inside its clearance window cannot be sent, and
 *    the card beneath it counts the PENDING pile separately. Adding them would
 *    make the headline a number no payout run would ever honour.
 *  - **"Next automatic payout" is the next occurrence of the instructor's own
 *    `payoutDayOfMonth`** — the column the settings page's Schedule row and
 *    the Help Center's payout answers already read, so the three cannot
 *    disagree. It is **dropped when the balance is zero**: a date with nothing
 *    to send behind it is a promise the platform would not keep, so the line
 *    says "when your balance clears" instead.
 *  - **"This month" is the calendar month, not a trailing 30 days**, because
 *    its own footnote says "vs last month" and because "Earnings by course"
 *    draws the same figure under the same words. One definition, two places.
 *  - **"Pending clearance" names a real number of days.** The export writes
 *    "clears within 30 days"; that 30 is `InstructorEarning.clearsAt`'s
 *    business and nothing stores a platform-wide window, so the line is
 *    derived from the furthest pending row rather than typed into copy — the
 *    second-source-of-truth trap `instructor-help.ts` records.
 *  - **"Avg. per sale" is over `SALE` rows only.** `EarningSource` also
 *    carries BUSINESS_WATCH (a monthly rollup), ADJUSTMENT and REVERSAL, none
 *    of which is a sale, and dividing by them would answer a question nobody
 *    asked.
 *  - **The chart draws the last six *complete* months**, for the reason
 *    `getRevenueByMonth` documents at length: a partial month plotted beside
 *    complete ones reads as a collapse. It follows that the chart deliberately
 *    does **not** include the "This month" card's figure, which is exactly
 *    what the export draws — its last bar is August's $22.1k against a This
 *    month card of $18,240. Its pill is the trend it actually plots, last
 *    complete month against the one before; the export shows the same +12.4%
 *    in both places, which its mock numbers make a coincidence.
 *  - **Payout history is `Payout`, newest first**, and it is the *same table*
 *    the console's payout-run dialog lists as recipients — the model's own
 *    note. Its amounts are what the run actually sent, not a re-sum of the
 *    ledger.
 */

export type EarningMonth = {
  /** First instant of the month, UTC. */
  month: Date
  cents: number
}

export type EarningSeries = {
  months: EarningMonth[]
  totalCents: number
  /** The tallest month's full name, or null when nothing landed. */
  bestMonth: string | null
  /** Last complete month against the one before — the card's corner pill. */
  delta: number | null
}

export type CourseEarningRow = {
  id: string
  title: string
  thumbnailUrl: string | null
  categorySlug: string
  categoryAccent: string
  cents: number
  /** 0–100 — share of the month's total, which is what the bar draws. */
  percent: number
}

export type PayoutRow = {
  id: string
  reference: string
  /** Already written, e.g. "01 Aug 2026" — see `RevenuePage.generatedAt`. */
  date: string
  /** "Bank · ••••4471", "PayPal · ada@lumen.co", or a dash when the method
   *  has since been removed (`Payout.payoutMethod` is `SetNull`). */
  method: string | null
  amountCents: number
  status: PayoutStatus
  /** Only set on a FAILED row; the table draws it as the row's title. */
  failureReason: string | null
}

export type RevenueStats = {
  lifetimeCents: number
  /** "Mar 2021" — when the first earning landed, or null before any. */
  since: string | null
  thisMonthCents: number
  /** Relative change against last month, or null when it earned nothing. */
  monthDelta: number | null
  pendingCents: number
  /** Days until the furthest pending row clears, or null when none is. */
  clearsInDays: number | null
  /** Null until something has sold — an em dash, not $0.00. */
  perSaleCents: number | null
}

export type RevenuePage = {
  availableCents: number
  /** Already written, e.g. "01 Sep 2026", or null when there is nothing to
   *  send — see the module note. */
  nextPayoutOn: string | null
  /** The PRIMARY destination, or null when none has been added. */
  primaryMethod: PayoutMethodView | null
  payoutDayOfMonth: number
  stats: RevenueStats
  series: EarningSeries
  byCourse: CourseEarningRow[]
  payouts: PayoutRow[]
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
const shortMonthYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
/** "01 Aug 2026" — the export's own spelling, zero-padded. */
const payoutDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

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

/**
 * The next time the monthly batch runs, from the instructor's own
 * `payoutDayOfMonth`.
 *
 * `Date.UTC` rolls a day past the end of a month forward rather than
 * overflowing — a 31st in a 30-day month becomes the 1st of the next — which
 * is the behaviour a schedule wants and is why this is not clamped by hand.
 */
function nextPayoutDate(day: number, now: Date): Date {
  const thisMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day)
  )
  return thisMonth > now
    ? thisMonth
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day))
}

export async function getRevenuePage(): Promise<RevenuePage | null> {
  const session = await getSession()
  if (!session) return null

  const instructor = await db.instructor.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      payoutDayOfMonth: true,
      payoutMethods: {
        where: { role: "PRIMARY" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          id: true,
          type: true,
          label: true,
          last4: true,
          currency: true,
          role: true,
          verifiedAt: true,
          createdAt: true,
        },
      },
    },
  })
  if (!instructor) return null

  const now = new Date()
  // **`REVERSED` is excluded from every figure on the page** — see the module
  // note. It is spelled once here so a new query cannot quietly opt out.
  const earned: Prisma.InstructorEarningWhereInput = {
    instructorId: instructor.id,
    status: { not: "REVERSED" },
  }
  const thisMonth = monthStart(0)
  const lastMonth = monthStart(1)

  // **Wave one.** Everything needed to decide the page is independent, so it
  // goes in one round of hops — the arrangement `lib/messages.ts` records, and
  // `aggregate` rather than `findMany` wherever a sum is wanted so no row
  // crosses the wire to be reduced in JS.
  const [
    courseCount,
    available,
    lifetime,
    firstEarning,
    month,
    priorMonth,
    pending,
    furthestPending,
    perSale,
  ] = await Promise.all([
    db.course.count({ where: { instructorId: instructor.id } }),
    db.instructorEarning.aggregate({
      where: { instructorId: instructor.id, status: "AVAILABLE" },
      _sum: { netCents: true },
    }),
    db.instructorEarning.aggregate({
      where: earned,
      _sum: { netCents: true },
    }),
    db.instructorEarning.findFirst({
      where: earned,
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db.instructorEarning.aggregate({
      where: { ...earned, createdAt: { gte: thisMonth } },
      _sum: { netCents: true },
    }),
    db.instructorEarning.aggregate({
      where: { ...earned, createdAt: { gte: lastMonth, lt: thisMonth } },
      _sum: { netCents: true },
    }),
    db.instructorEarning.aggregate({
      where: { instructorId: instructor.id, status: "PENDING" },
      _sum: { netCents: true },
    }),
    // The row that clears last, which is what "clears within N days" counts
    // to. Ordered rather than aggregated because `_max` on a nullable date
    // still needs the row's own value and this reads plainer.
    db.instructorEarning.findFirst({
      where: {
        instructorId: instructor.id,
        status: "PENDING",
        clearsAt: { not: null },
      },
      orderBy: { clearsAt: "desc" },
      select: { clearsAt: true },
    }),
    db.instructorEarning.aggregate({
      where: { ...earned, source: "SALE" },
      _sum: { netCents: true },
      _count: { _all: true },
    }),
  ])

  // **Wave two** — the three blocks below. The month series is the only raw
  // query, for `getRevenueByMonth`' reason: Prisma cannot group by a date
  // truncation, and the alternative pulls six months of ledger rows across the
  // wire to produce six numbers.
  const seriesFrom = monthStart(EARNING_MONTHS)
  const seriesUntil = monthStart(0)

  const [monthRows, courseGroups, payoutRows] = await Promise.all([
    db.$queryRaw<{ month: Date; cents: bigint | number }[]>`
      SELECT date_trunc('month', "createdAt" AT TIME ZONE 'UTC') AS month,
             SUM("netCents")::bigint AS cents
      FROM "instructor_earning"
      WHERE "instructorId" = ${instructor.id}
        AND status <> 'REVERSED'
        AND "createdAt" >= ${seriesFrom}
        AND "createdAt" < ${seriesUntil}
      GROUP BY 1
      ORDER BY 1
    `,
    db.instructorEarning.groupBy({
      by: ["courseId"],
      where: { ...earned, createdAt: { gte: thisMonth } },
      _sum: { netCents: true },
    }),
    db.payout.findMany({
      where: { instructorId: instructor.id },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: PAYOUT_HISTORY_LIMIT,
      select: {
        id: true,
        reference: true,
        amountCents: true,
        status: true,
        failureReason: true,
        paidAt: true,
        createdAt: true,
        payoutMethod: { select: { type: true, label: true, last4: true } },
      },
    }),
  ])

  // ---- the chart -----------------------------------------------------------
  // `date_trunc(... AT TIME ZONE 'UTC')` returns a naive timestamp, which the
  // driver hands back as a local-time Date; rebuilding the key from its UTC
  // parts keeps it comparable with the boundaries below. Months with no
  // earnings come back missing from the group, so the series is built from the
  // boundaries and *filled* — a quiet month draws a zero bar rather than
  // vanishing and leaving five columns.
  const byMonth = new Map<number, number>()
  for (const row of monthRows) {
    const key = Date.UTC(row.month.getFullYear(), row.month.getMonth(), 1)
    byMonth.set(key, Number(row.cents))
  }
  const months: EarningMonth[] = Array.from(
    { length: EARNING_MONTHS },
    (_, index) => {
      const month = monthStart(EARNING_MONTHS - index)
      return { month, cents: byMonth.get(month.getTime()) ?? 0 }
    }
  )
  const best = months.reduce<EarningMonth | null>(
    (top, entry) => (top === null || entry.cents > top.cents ? entry : top),
    null
  )

  // ---- earnings by course --------------------------------------------------
  // `InstructorEarning.courseId` is nullable (`SetNull`, and BUSINESS_WATCH
  // rollups carry none), so a group with no course is dropped rather than
  // drawn as a nameless bar.
  const monthTotal = month._sum.netCents ?? 0
  const rankedCourses = courseGroups
    .flatMap((group) =>
      group.courseId === null || (group._sum.netCents ?? 0) <= 0
        ? []
        : [{ courseId: group.courseId, cents: group._sum.netCents ?? 0 }]
    )
    .sort((a, b) => b.cents - a.cents || a.courseId.localeCompare(b.courseId))
    .slice(0, EARNINGS_BY_COURSE_LIMIT)

  const courseRows =
    rankedCourses.length === 0
      ? []
      : await db.course.findMany({
          where: { id: { in: rankedCourses.map((row) => row.courseId) } },
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            category: { select: { slug: true, accentColor: true } },
          },
        })
  const courseById = new Map(courseRows.map((row) => [row.id, row]))

  const availableCents = available._sum.netCents ?? 0
  const pendingCents = pending._sum.netCents ?? 0
  const saleCount = perSale._count._all

  return {
    availableCents,
    // Dropped when there is nothing to send — see the module note.
    nextPayoutOn:
      availableCents <= 0
        ? null
        : payoutDate.format(nextPayoutDate(instructor.payoutDayOfMonth, now)),
    primaryMethod:
      instructor.payoutMethods.length === 0
        ? null
        : {
            id: instructor.payoutMethods[0]!.id,
            type: instructor.payoutMethods[0]!.type,
            label: instructor.payoutMethods[0]!.label,
            last4: instructor.payoutMethods[0]!.last4,
            currency: instructor.payoutMethods[0]!.currency,
            role: instructor.payoutMethods[0]!.role,
            verified: instructor.payoutMethods[0]!.verifiedAt !== null,
            addedOn: shortMonthYear.format(
              instructor.payoutMethods[0]!.createdAt
            ),
          },
    payoutDayOfMonth: instructor.payoutDayOfMonth,
    stats: {
      lifetimeCents: lifetime._sum.netCents ?? 0,
      since:
        firstEarning === null
          ? null
          : shortMonthYear.format(firstEarning.createdAt),
      thisMonthCents: monthTotal,
      monthDelta: growth(monthTotal, priorMonth._sum.netCents ?? 0),
      pendingCents,
      clearsInDays:
        furthestPending?.clearsAt == null
          ? null
          : Math.max(
              0,
              Math.ceil(
                (furthestPending.clearsAt.getTime() - now.getTime()) / DAY
              )
            ),
      perSaleCents:
        saleCount === 0
          ? null
          : Math.round((perSale._sum.netCents ?? 0) / saleCount),
    },
    series: {
      months,
      totalCents: months.reduce((sum, entry) => sum + entry.cents, 0),
      bestMonth:
        best === null || best.cents === 0 ? null : monthName.format(best.month),
      delta: growth(months.at(-1)?.cents ?? 0, months.at(-2)?.cents ?? 0),
    },
    byCourse: rankedCourses.flatMap((row) => {
      const course = courseById.get(row.courseId)
      if (!course) return []
      return [
        {
          id: course.id,
          title: course.title,
          thumbnailUrl: course.thumbnailUrl,
          categorySlug: course.category.slug,
          categoryAccent: course.category.accentColor,
          cents: row.cents,
          // Share of the **month's total**, not of the leading course: the
          // export's own top bar fills 34% of its track against $6,180 of an
          // $18,240 month, which is 33.9%. A bar normalised to the leader
          // would make every list's first row full whatever it earned.
          percent:
            monthTotal === 0
              ? 0
              : Math.round((row.cents / monthTotal) * 1000) / 10,
        },
      ]
    }),
    payouts: payoutRows.map((row) => ({
      id: row.id,
      reference: row.reference,
      // The date the money moved where it did, and the run's own date where it
      // did not — a failed transfer never has a `paidAt`, and a blank cell in
      // a history is worse than the day it was attempted.
      date: payoutDate.format(row.paidAt ?? row.createdAt),
      method:
        row.payoutMethod === null
          ? null
          : row.payoutMethod.type === "PAYPAL"
            ? `PayPal · ${row.payoutMethod.label}`
            : `Bank · ••••${row.payoutMethod.last4 ?? "????"}`,
      amountCents: row.amountCents,
      status: row.status,
      failureReason: row.failureReason,
    })),
    hasCourses: courseCount > 0,
    generatedAt: now,
  }
}
