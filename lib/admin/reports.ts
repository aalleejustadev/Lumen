import { cache } from "react"

import { db } from "@/lib/db"

/**
 * Reads for `/dashboard/admin/reports`, from
 * `ui-design/light/dashboard/admin/reports-page__admin.png`.
 *
 * Pulls in `lib/db`, so the same "never import this from a Client Component"
 * rule as `lib/admin/overview.ts` applies — and the same split: this module
 * returns *facts*, and `lib/config/admin-reports.ts` holds every word the page
 * says about them.
 *
 * Nothing on the page is demo data. Four definitions are worth stating,
 * because each is a choice and the export's own mock numbers don't settle
 * them:
 *
 *  - **"Gross revenue" means gross**, i.e. before refunds — that is what the
 *    word means, and it is the identical figure Platform Overview draws, read
 *    the identical way (all-time `amountTotal` over PAID orders, delta month
 *    over month on the running total). The two admin pages must not show two
 *    different numbers under the same label, so the definition is shared
 *    rather than re-derived. It follows that a refund does **not** reduce it;
 *    the refund rate card is where refunds show up.
 *  - **"Platform share" excludes reversed earnings.** It sums
 *    `InstructorEarning.platformFeeCents`, which is the platform's own cut of
 *    each sale — but a refunded sale's earning is flipped to REVERSED and its
 *    fee was handed back, so it is no longer the platform's share. This is the
 *    one figure on the page that refunds do move.
 *  - **"New signups" is a period figure, not a running total**, so its delta is
 *    the one comparison of two periods' activity on either admin page: the
 *    trailing 30 days against the 30 before them. The running-total rule the
 *    other cards follow would be meaningless here — accounts created in a
 *    month is already a rate.
 *  - **The refund rate is a rate over rows**, refunds against paid orders in
 *    the same window, which is what `Refund`'s own schema note calls for. Its
 *    delta is in percentage *points*, like uptime's, because a "relative
 *    change in a percentage" is not a thing an operator means.
 */

const DAY = 24 * 60 * 60 * 1000
/** The comparison window every delta on the page uses, as on Platform Overview. */
const WINDOW_DAYS = 30
/** How many months the revenue chart draws — the export's own six columns. */
export const REVENUE_MONTHS = 6

export type ReportStat = {
  /** A cents amount, a count, or a fraction, per the card's `format`. */
  value: number | null
  /**
   * `null` when there is no earlier figure to compare against, which renders
   * as no chip at all rather than a misleading +100%.
   */
  delta: number | null
}

export type ReportStats = {
  revenue: ReportStat
  platformShare: ReportStat
  signups: ReportStat
  /** A fraction (0.021 for 2.1%); its `delta` is in points. */
  refundRate: ReportStat
}

export type RevenueMonth = {
  /** First instant of the month, UTC. */
  month: Date
  cents: number
}

export type RevenueSeries = {
  months: RevenueMonth[]
  /** Sum across the drawn period — the card's "Total $6.11M" subtitle. */
  totalCents: number
  /**
   * Last month against the one before it. The pill in the card's corner; the
   * export draws the same figure the Gross revenue card carries, but a chart
   * of six months should report the trend it actually plots.
   */
  delta: number | null
}

export type PayoutRunRow = {
  id: string
  reference: string
  scheduledFor: Date
  status: "SCHEDULED" | "PROCESSING" | "COMPLETED" | "PARTIALLY_FAILED"
  totalCents: number
  recipientCount: number
  /** How many of the run's payouts failed — what the "1 failed" pill counts. */
  failedCount: number
}

export type PayoutRunRecipient = {
  id: string
  name: string
  imageUrl: string | null
  /** "Bank · ••••4471" is built from these two by the dialog. */
  methodLabel: string | null
  methodLast4: string | null
  methodType: "BANK_TRANSFER" | "PAYPAL" | "STRIPE" | null
  amountCents: number
  status: "PENDING" | "PAID" | "FAILED"
}

export type PayoutRunDetail = PayoutRunRow & {
  recipients: PayoutRunRecipient[]
  /** Total ÷ recipients, in cents. `null` when a run has paid out nothing. */
  averageCents: number | null
}

/** `(now − then) ÷ then`, or `null` when there was nothing to grow from. */
function growth(now: number, then: number) {
  if (then <= 0) return null
  return (now - then) / then
}

// ---------------------------------------------------------------------------
// The four stat cards
// ---------------------------------------------------------------------------

export const getReportStats = cache(
  async function getReportStats(): Promise<ReportStats> {
    const cutoff = new Date(Date.now() - WINDOW_DAYS * DAY)
    const previousCutoff = new Date(cutoff.getTime() - WINDOW_DAYS * DAY)

    const [
      revenue,
      revenueBefore,
      share,
      shareBefore,
      signups,
      signupsBefore,
      refunds,
      refundsBefore,
      paidOrders,
      paidOrdersBefore,
    ] = await Promise.all([
      db.order.aggregate({
        where: { status: "PAID" },
        _sum: { amountTotal: true },
      }),
      db.order.aggregate({
        where: { status: "PAID", paidAt: { lt: cutoff } },
        _sum: { amountTotal: true },
      }),
      // Reversed rows are excluded: their fee went back to the customer with the
      // refund, so it was never the platform's to keep.
      db.instructorEarning.aggregate({
        where: { status: { not: "REVERSED" } },
        _sum: { platformFeeCents: true },
      }),
      db.instructorEarning.aggregate({
        where: { status: { not: "REVERSED" }, createdAt: { lt: cutoff } },
        _sum: { platformFeeCents: true },
      }),
      db.user.count({ where: { createdAt: { gte: cutoff } } }),
      db.user.count({
        where: { createdAt: { gte: previousCutoff, lt: cutoff } },
      }),
      db.refund.count({ where: { createdAt: { gte: cutoff } } }),
      db.refund.count({
        where: { createdAt: { gte: previousCutoff, lt: cutoff } },
      }),
      db.order.count({ where: { status: "PAID", paidAt: { gte: cutoff } } }),
      db.order.count({
        where: { status: "PAID", paidAt: { gte: previousCutoff, lt: cutoff } },
      }),
    ])

    const revenueTotal = revenue._sum.amountTotal ?? 0
    const revenueThen = revenueBefore._sum.amountTotal ?? 0
    const shareTotal = share._sum.platformFeeCents ?? 0
    const shareThen = shareBefore._sum.platformFeeCents ?? 0

    const rate = paidOrders > 0 ? refunds / paidOrders : null
    const rateBefore =
      paidOrdersBefore > 0 ? refundsBefore / paidOrdersBefore : null

    return {
      revenue: {
        value: revenueTotal,
        delta: growth(revenueTotal, revenueThen),
      },
      platformShare: {
        value: shareTotal,
        delta: growth(shareTotal, shareThen),
      },
      signups: { value: signups, delta: growth(signups, signupsBefore) },
      refundRate: {
        value: rate,
        // Percentage points, not a relative change — see the note above.
        delta: rate !== null && rateBefore !== null ? rate - rateBefore : null,
      },
    }
  }
)

// ---------------------------------------------------------------------------
// Gross revenue by month
// ---------------------------------------------------------------------------

/** First instant of the UTC month `monthsBack` months before this one. */
function monthStart(monthsBack: number) {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1)
  )
}

/**
 * One bar per month for the last `REVENUE_MONTHS` **complete** months. The
 * current month is excluded, which is what the export draws: its six columns
 * run Mar–Aug while its own payout table puts "today" in September.
 *
 * That exclusion is the whole point rather than a detail. A partial month
 * plotted beside complete ones reads as a collapse — on real seeded data the
 * ninth-of-the-month bar came in at a fifth of August's and turned the card's
 * trend pill into −76.8%, which is a fact about the calendar, not about the
 * platform. Six finished months compare like with like.
 *
 * A raw query rather than `groupBy`, because Prisma cannot group by a date
 * truncation and the alternative — pulling six months of orders back and
 * bucketing them in JS — moves thousands of rows across the wire to produce
 * six numbers. `date_trunc` runs in UTC here because `paidAt` is stored as a
 * `timestamptz` and the month boundaries below are built in UTC; picking one
 * zone for both is what stops an order landing in a different bar than the
 * boundary that selected it.
 *
 * Months with no orders come back missing from the group, so the series is
 * built from the boundaries and filled from the result — a quiet month has to
 * draw a zero bar, not vanish and leave five columns.
 */
export const getRevenueByMonth = cache(
  async function getRevenueByMonth(): Promise<RevenueSeries> {
    // The window runs from the start of the oldest complete month up to (but
    // not including) the start of this one.
    const from = monthStart(REVENUE_MONTHS)
    const until = monthStart(0)

    const rows = await db.$queryRaw<{ month: Date; cents: bigint | number }[]>`
    SELECT date_trunc('month', "paidAt" AT TIME ZONE 'UTC') AS month,
           SUM("amountTotal")::bigint AS cents
    FROM "order"
    WHERE status = 'PAID' AND "paidAt" >= ${from} AND "paidAt" < ${until}
    GROUP BY 1
    ORDER BY 1
  `

    const byMonth = new Map<number, number>()
    for (const row of rows) {
      // `date_trunc(... AT TIME ZONE 'UTC')` returns a naive timestamp, which the
      // driver hands back as a local-time Date; rebuilding the key from its UTC
      // parts is what keeps it comparable with the boundaries below.
      const month = Date.UTC(row.month.getFullYear(), row.month.getMonth(), 1)
      byMonth.set(month, Number(row.cents))
    }

    const months: RevenueMonth[] = Array.from(
      { length: REVENUE_MONTHS },
      (_, index) => {
        const month = monthStart(REVENUE_MONTHS - index)
        return { month, cents: byMonth.get(month.getTime()) ?? 0 }
      }
    )

    const totalCents = months.reduce((sum, entry) => sum + entry.cents, 0)
    const last = months.at(-1)?.cents ?? 0
    const previous = months.at(-2)?.cents ?? 0

    return { months, totalCents, delta: growth(last, previous) }
  }
)

// ---------------------------------------------------------------------------
// Instructor payout runs
// ---------------------------------------------------------------------------

/**
 * Most recent first. The export's own four rows are in no order at all
 * (RUN-08, RUN-07, RUN-09, RUN-06); a table of disbursements has one obvious
 * order and this is it, so the drawn sequence is a mock artefact rather than a
 * design decision to reproduce.
 *
 * `failedCount` is what the "1 failed" pill counts, and it is a grouped count
 * over `payout` rather than a column on the run: a run's failures are its
 * payouts' business, and a stored counter would be a second place for the same
 * fact to be wrong.
 */
export const getPayoutRuns = cache(async function getPayoutRuns(
  limit = 12
): Promise<PayoutRunRow[]> {
  const runs = await db.payoutRun.findMany({
    orderBy: { scheduledFor: "desc" },
    take: limit,
    select: {
      id: true,
      reference: true,
      scheduledFor: true,
      status: true,
      totalCents: true,
      recipientCount: true,
    },
  })

  if (runs.length === 0) return []

  const failures = await db.payout.groupBy({
    by: ["payoutRunId"],
    where: { status: "FAILED", payoutRunId: { in: runs.map((run) => run.id) } },
    _count: { _all: true },
  })

  const failedByRun = new Map(
    failures.map((row) => [row.payoutRunId, row._count._all])
  )

  return runs.map((run) => ({
    ...run,
    failedCount: failedByRun.get(run.id) ?? 0,
  }))
})

/**
 * One run with its recipients, for the dialog in
 * `payout-run__dialog_admin.png`.
 *
 * The instructor's picture comes from `Instructor.imageUrl`, falling back to
 * the linked account's avatar — a teaching profile need not have its own, and
 * `Instructor.userId` is nullable precisely because a profile can exist before
 * the account does.
 */
export const getPayoutRun = cache(async function getPayoutRun(
  id: string
): Promise<PayoutRunDetail | null> {
  const run = await db.payoutRun.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      scheduledFor: true,
      status: true,
      totalCents: true,
      recipientCount: true,
      payouts: {
        orderBy: { amountCents: "desc" },
        select: {
          id: true,
          amountCents: true,
          status: true,
          instructor: {
            select: {
              name: true,
              imageUrl: true,
              user: { select: { image: true } },
            },
          },
          payoutMethod: { select: { type: true, label: true, last4: true } },
        },
      },
    },
  })

  if (!run) return null

  const { payouts, ...rest } = run
  const recipients: PayoutRunRecipient[] = payouts.map((payout) => ({
    id: payout.id,
    name: payout.instructor.name,
    imageUrl:
      payout.instructor.imageUrl ?? payout.instructor.user?.image ?? null,
    methodType: payout.payoutMethod?.type ?? null,
    methodLabel: payout.payoutMethod?.label ?? null,
    methodLast4: payout.payoutMethod?.last4 ?? null,
    amountCents: payout.amountCents,
    status: payout.status,
  }))

  return {
    ...rest,
    failedCount: recipients.filter((row) => row.status === "FAILED").length,
    recipients,
    // A SCHEDULED run carries a recipient count but no money and no payout
    // rows yet, so there is no average to state — "$0.00" would read as a run
    // that paid nobody rather than one that hasn't run.
    averageCents:
      run.recipientCount > 0 && run.totalCents > 0
        ? Math.round(run.totalCents / run.recipientCount)
        : null,
  }
})
