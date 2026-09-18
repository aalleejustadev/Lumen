import "dotenv/config"

import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/lib/generated/prisma/client"

/**
 * The platform seed — **scaffolding only**.
 *
 * It used to write ~40 tables of demo data: accounts, an 18-course catalog,
 * orders, enrolments, certificates, notifications, a community, coupons and
 * payouts. All of that is gone, at the user's instruction: the application
 * shows what is actually in the database or an empty state, and nothing in
 * between. A course exists because an instructor made one; a student exists
 * because somebody signed up; a notification exists because something
 * happened. The previous seed is kept in git history if it is ever wanted
 * back.
 *
 * What survives is the three things a single developer cannot produce by
 * using the app:
 *
 *  - **Categories are resolved, never written.** A course cannot exist without
 *    one and `Course.category` is RESTRICT, so the seed's job is to check they
 *    are there and say so clearly if they are not. An admin owns them, through
 *    `/dashboard/admin/categories`.
 *  - **The `PlatformSetting` singleton**, which the revenue share, the support
 *    address and the Help Center's FAQ answers all read.
 *  - **Uptime samples**, because availability is a property of the
 *    infrastructure rather than of anything in the app: no amount of using
 *    Lumen produces a health check, and Platform Overview's card needs a
 *    window of them to draw a delta at all.
 *
 * It still **clears every `seed_`-prefixed row first**, which is what makes
 * running it the way to get from a demo database to a real one. Rows a human
 * made carry no such prefix and are never touched.
 */

const db = new PrismaClient({
  // The CLI's direct endpoint, for the reason `prisma7.config.ts` gives: a
  // long-running script wants session state, not PgBouncer's transaction mode.
  adapter: new PrismaPg({
    connectionString: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  }),
})

const SEED = "seed_"
const DAY = 24 * 60 * 60 * 1000
const NOW = new Date()

/** Platform revenue share in basis points — `PlatformSetting`'s own default. */
const REVENUE_SHARE_BPS = 7000

/** How many days of health checks Platform Overview's card has to average. */
const UPTIME_DAYS = 90

/**
 * Remove everything a previous seed wrote.
 *
 * Order matters where a relation is RESTRICT rather than CASCADE — courses
 * before instructors, most importantly. It is kept in full even though this
 * seed writes almost nothing now, because its job is precisely to clean up
 * after the *old* one: this is what turns a database full of demo rows into
 * an empty app.
 */
async function clearSeededRows() {
  const seeded = { id: { startsWith: SEED } }

  await db.instructorFollow.deleteMany({ where: seeded })
  await db.notification.deleteMany({ where: seeded })
  await db.promotion.deleteMany({ where: seeded })
  await db.contentReport.deleteMany({ where: seeded })
  // Cascades to `discussion`, `discussion_reply` and `topic_moderator`.
  await db.communityTopic.deleteMany({ where: seeded })
  // Cascades to `conversation_participant` and `message`. Cleared explicitly
  // because a `Conversation` has no owner to cascade from.
  await db.conversation.deleteMany({ where: seeded })
  await db.auditLog.deleteMany({ where: seeded })
  await db.refund.deleteMany({ where: seeded })
  await db.instructorEarning.deleteMany({ where: seeded })
  await db.payout.deleteMany({ where: seeded })
  await db.payoutRun.deleteMany({ where: seeded })
  await db.payoutMethod.deleteMany({ where: seeded })
  await db.subscription.deleteMany({ where: seeded })
  await db.certificate.deleteMany({ where: seeded })
  await db.user.deleteMany({ where: seeded })
  await db.courseQuestion.deleteMany({ where: seeded })
  await db.coupon.deleteMany({ where: seeded })
  await db.course.deleteMany({ where: seeded })
  await db.instructor.deleteMany({ where: seeded })
  // **Categories are deliberately not cleared** — an admin owns them, so a
  // re-run must leave the taxonomy exactly as it found it.
  await db.uptimeSample.deleteMany({})
}

async function seedPlatformSettings() {
  await db.platformSetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", defaultRevenueShareBps: REVENUE_SHARE_BPS },
  })
}

/**
 * Check the taxonomy exists, and say what is missing rather than failing on a
 * null relation later.
 *
 * Nothing here creates a category: `Course.category` is RESTRICT, so a
 * category the seed created would be pinned by the courses created alongside
 * it and could never be deleted from the console.
 */
async function checkCategories(): Promise<number> {
  const rows = await db.category.findMany({ select: { id: true } })
  if (rows.length === 0) {
    console.warn(
      "\n  No categories exist yet.\n" +
        "  A course cannot be created without one — add them at\n" +
        "  /dashboard/admin/categories before an instructor starts.\n"
    )
  }
  return rows.length
}

/**
 * One row per day of health checks, which is what the availability card
 * averages over a window. The stand-in for a monitor nobody has written.
 */
async function seedUptime() {
  const CHECKS_PER_DAY = 1440
  /** Which day — counting back from yesterday — absorbed how many failures. */
  const failures = new Map<number, number>([
    [6, 5],
    [19, 4],
    [33, 21],
    [41, 12],
    [48, 9],
    [55, 10],
    [67, 14],
    [78, 7],
  ])

  await db.uptimeSample.createMany({
    data: Array.from({ length: UPTIME_DAYS }, (_, index) => {
      const daysAgo = index + 1
      const day = new Date(NOW.getTime() - daysAgo * DAY)
      day.setUTCHours(0, 0, 0, 0)
      return {
        id: `${SEED}up_${day.toISOString().slice(0, 10)}`,
        day,
        checksTotal: CHECKS_PER_DAY,
        checksOk: CHECKS_PER_DAY - (failures.get(daysAgo) ?? 0),
      }
    }),
  })
}

async function main() {
  console.log("Clearing previously seeded rows…")
  await clearSeededRows()

  await seedPlatformSettings()
  const categories = await checkCategories()
  await seedUptime()

  console.log(
    [
      "",
      "Seeded platform scaffolding only:",
      `  categories        ${categories} (read, never written)`,
      "  platform settings 1",
      `  uptime samples    ${UPTIME_DAYS}`,
      "",
      "Everything else — courses, accounts, orders, enrolments, notifications,",
      "certificates — is now created by using the application.",
      "",
    ].join("\n")
  )
}

main()
  .catch(async (error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
