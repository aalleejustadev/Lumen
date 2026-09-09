/**
 * Seeds the platform tables.
 *
 * Run with `npm run db:seed`. Every row it writes carries a `seed_` id prefix
 * and it deletes only rows with that prefix before re-inserting, so it is
 * re-runnable and cannot touch an account, order or cart a human created. The
 * one exception is `uptime_sample`, which is cleared wholesale — nothing but a
 * health monitor ever writes it, and the seed *is* the stand-in monitor.
 *
 * The published catalog is read out of `lib/config/browse-courses.ts` and its
 * two companion files rather than re-authored here, so the student surfaces
 * that still read those files and the admin surfaces that read the database
 * describe the same 18 courses. Everything the student surfaces never needed —
 * the review queue, categories, accounts, orders, the payout ledger, uptime —
 * is in `prisma/seed-data.ts` or generated below.
 *
 * Two things about how it writes:
 *  - All randomness runs through one seeded PRNG, so two runs produce
 *    identical data and a number on a screenshot stays put.
 *  - Ids are generated here rather than left to `@default(cuid())` even where
 *    nothing needs to reference them, because that is what lets every table go
 *    in through `createMany`. Roughly 8,000 rows over a single connection is
 *    seconds batched and minutes row-by-row.
 */

import "dotenv/config"

import { PrismaPg } from "@prisma/adapter-pg"

import { Prisma, PrismaClient } from "@/lib/generated/prisma/client"
import {
  browseCourses,
  type CourseLevel as BrowseLevel,
} from "@/lib/config/browse-courses"
import {
  getCourseDetail,
  type CourseSection as DetailSection,
} from "@/lib/config/course-details"
import {
  getInstructorProfile,
  instructorSlug,
} from "@/lib/config/instructor-profiles"
import {
  categorySeeds,
  categorySlugByBrowseCategory,
  countryWeights,
  extraInstructorSeeds,
  featuredLearnerSeeds,
  firstNames,
  instructorApplicationSeeds,
  lastNames,
  pendingCourseSeeds,
  reportedReviewSeeds,
} from "./seed-data"

const db = new PrismaClient({
  // The CLI's direct endpoint, for the reason `prisma7.config.ts` gives: a
  // long-running script wants session state, not PgBouncer's transaction mode.
  adapter: new PrismaPg({
    connectionString: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  }),
})

const SEED = "seed_"
const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
const NOW = new Date()

/** Platform revenue share in basis points — `PlatformSetting`'s own default. */
const REVENUE_SHARE_BPS = 7000

/**
 * How many paid orders get refunded. The admin Reports card draws 2.1% and
 * `Refund`'s own schema note names that figure, so this is the rate the seed
 * has to produce for that card to have anything to say. The marketing site's
 * 30-day guarantee is the window they land in.
 */
const REFUND_RATE = 0.021
const REFUND_WINDOW_DAYS = 30
/** Demo learner accounts, on top of the featured eight from the export. */
const LEARNER_COUNT = 500
/** How far back the oldest demo signup sits. */
const SIGNUP_WINDOW_DAYS = 540

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

/** mulberry32 — small, fast, and identical across runs and platforms. */
function makeRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = makeRandom(0x6c756d65)

function ago(ms: number) {
  return new Date(NOW.getTime() - ms)
}

function pick<T>(items: readonly T[]) {
  return items[Math.floor(rng() * items.length)]!
}

function weighted<T extends string>(entries: readonly [T, number][]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = rng() * total
  for (const [value, weight] of entries) {
    roll -= weight
    if (roll <= 0) return value
  }
  return entries[entries.length - 1]![0]
}

function cents(dollars: number) {
  return Math.round(dollars * 100)
}

function pad(value: number, width: number) {
  return String(value).padStart(width, "0")
}

const LEVELS = {
  Beginner: "BEGINNER",
  Intermediate: "INTERMEDIATE",
  Advanced: "ADVANCED",
  "All Levels": "ALL_LEVELS",
} as const satisfies Record<BrowseLevel, string>

const LESSON_TYPES = {
  video: "VIDEO",
  article: "ARTICLE",
  quiz: "QUIZ",
  practice: "PRACTICE",
} as const

// ---------------------------------------------------------------------------
// 0 · Clear what a previous run wrote
// ---------------------------------------------------------------------------

/**
 * Order matters: `Course.instructor` and `Course.category` are required
 * relations with no `onDelete`, which Postgres enforces as RESTRICT — so
 * courses have to go before the rows they point at. Everything not listed here
 * cascades from `User` or `Course`.
 */
async function clearSeededRows() {
  const seeded = { id: { startsWith: SEED } }

  await db.contentReport.deleteMany({ where: seeded })
  await db.auditLog.deleteMany({ where: seeded })
  await db.refund.deleteMany({ where: seeded })
  await db.instructorEarning.deleteMany({ where: seeded })
  await db.payout.deleteMany({ where: seeded })
  await db.payoutRun.deleteMany({ where: seeded })
  await db.payoutMethod.deleteMany({ where: seeded })
  await db.user.deleteMany({ where: seeded })
  await db.course.deleteMany({ where: seeded })
  await db.instructor.deleteMany({ where: seeded })
  await db.category.deleteMany({ where: seeded })
  await db.uptimeSample.deleteMany({})
}

// ---------------------------------------------------------------------------
// 1 · Platform settings
// ---------------------------------------------------------------------------

async function seedPlatformSettings() {
  await db.platformSetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", defaultRevenueShareBps: REVENUE_SHARE_BPS },
  })
}

// ---------------------------------------------------------------------------
// 2 · Categories
// ---------------------------------------------------------------------------

/** Returns slug -> row id. Parents come before children by list order. */
async function seedCategories() {
  const ids = new Map<string, string>()

  for (const [index, seed] of categorySeeds.entries()) {
    const id = `${SEED}cat_${seed.slug}`
    await db.category.create({
      data: {
        id,
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        accentColor: seed.accentColor,
        // Only top-level categories are offered in the browse menu.
        showInNav: !seed.parentSlug,
        order: index,
        parentId: seed.parentSlug ? (ids.get(seed.parentSlug) ?? null) : null,
      },
    })
    ids.set(seed.slug, id)
  }

  return ids
}

// ---------------------------------------------------------------------------
// 3 · Instructors, and the accounts behind them
// ---------------------------------------------------------------------------

type InstructorRow = { id: string; slug: string; name: string; userId: string }

type InstructorSeed = {
  slug: string
  name: string
  title: string
  bio: string
  about: string[]
  skills: string[]
  avatarUrl?: string
  teachingSince: number
  rating: number
  reviewsCount: number
  studentsCount: number
}

async function seedInstructors() {
  const seeds: InstructorSeed[] = []

  for (const name of new Set(
    browseCourses.map((course) => course.instructor)
  )) {
    const slug = instructorSlug(name)
    const profile = getInstructorProfile(slug)
    if (!profile) throw new Error(`No profile for instructor ${name}`)

    // The one-line bio belongs to the sale page's instructor card, which
    // `course-details.ts` builds; the profile page's `about` is the long form.
    const first = profile.courses[0]
    const bio = first
      ? (getCourseDetail(first.slug)?.instructorProfile.bio ?? "")
      : ""

    seeds.push({ ...profile, slug, bio })
  }

  seeds.push(...extraInstructorSeeds)

  await db.user.createMany({
    data: seeds.map((seed) => ({
      id: `${SEED}u_ins_${seed.slug}`,
      name: seed.name,
      email: `${seed.slug}@lumen.co`,
      emailVerified: true,
      image: seed.avatarUrl ?? null,
      role: "instructor",
      status: "ACTIVE" as const,
      urls: [],
      createdAt: new Date(Date.UTC(seed.teachingSince, 0, 15)),
    })),
  })

  await db.instructor.createMany({
    data: seeds.map((seed) => ({
      id: `${SEED}ins_${seed.slug}`,
      slug: seed.slug,
      userId: `${SEED}u_ins_${seed.slug}`,
      name: seed.name,
      title: seed.title,
      bio: seed.bio,
      about: seed.about,
      skills: seed.skills,
      imageUrl: seed.avatarUrl ?? null,
      teachingSince: seed.teachingSince,
      rating: seed.rating,
      reviewsCount: seed.reviewsCount,
      studentsCount: seed.studentsCount,
    })),
  })

  return new Map<string, InstructorRow>(
    seeds.map((seed) => [
      seed.slug,
      {
        id: `${SEED}ins_${seed.slug}`,
        slug: seed.slug,
        name: seed.name,
        userId: `${SEED}u_ins_${seed.slug}`,
      },
    ])
  )
}

// ---------------------------------------------------------------------------
// 4 · The published catalog
// ---------------------------------------------------------------------------

type CourseRow = {
  id: string
  slug: string
  title: string
  priceCents: number
  instructorId: string
  publishedAt: Date
}

async function seedPublishedCourses(
  categories: Map<string, string>,
  instructors: Map<string, InstructorRow>
) {
  const rows: CourseRow[] = []
  const courseData: Prisma.CourseCreateManyInput[] = []
  const submissions: Prisma.CourseSubmissionCreateManyInput[] = []
  const curricula: { courseId: string; sections: DetailSection[] }[] = []
  const last = browseCourses.length - 1

  for (const [index, course] of browseCourses.entries()) {
    const detail = getCourseDetail(course.slug)
    if (!detail) throw new Error(`No detail for course ${course.slug}`)

    const instructor = instructors.get(instructorSlug(course.instructor))!
    const categoryId = categories.get(
      categorySlugByBrowseCategory[course.category]
    )!

    // Spread publication back over ~two years, newest first, so "live courses
    // grew N%" is a real month-over-month comparison rather than every course
    // landing on the same day. The newest lands inside the last 30 days.
    const publishedAt = ago((12 + (last - index) * 40) * DAY)
    const submittedAt = new Date(publishedAt.getTime() - 6 * DAY)
    const lessons = detail.sections.flatMap((section) => section.lessons)
    const id = `${SEED}c_${course.slug}`

    courseData.push({
      id,
      slug: course.slug,
      title: course.title,
      subtitle: detail.subtitle,
      description: detail.description,
      instructorId: instructor.id,
      categoryId,
      level: LEVELS[course.level],
      durationHours: course.durationHours,
      rating: course.rating,
      // The written-review count, far smaller than the student count in
      // `BrowseCourse.reviews` — see `CourseDetail.reviewsCount`.
      reviewsCount: detail.reviewsCount,
      priceCents: cents(course.price),
      listPriceCents: cents(course.listPrice),
      saleEndsAt: new Date(NOW.getTime() + detail.saleEndsInDays * DAY),
      requirements: detail.requirements,
      learningOutcomes: detail.learningOutcomes,
      videoHours: detail.includes.videoHours,
      articlesCount: detail.includes.articlesCount,
      quizzesCount: detail.includes.quizzesCount,
      hasDownloadableResources: detail.includes.downloadableResources,
      hasCertificate: detail.includes.certificate,
      lifetimeAccess: detail.includes.lifetimeAccess,
      status: "PUBLISHED",
      submittedAt,
      publishedAt,
      // `BrowseCourse.reviews` is the catalog's student count — what the sale
      // page's "students" stat and the admin overview's top-courses table both
      // draw. It is the denormalised total the schema documents, and it
      // therefore carries history the demo `enrollment` rows below do not
      // reproduce: those only exist for the 508 demo accounts.
      enrollmentCount: course.reviews,
      lessonCount: lessons.length,
      totalDurationMinutes: course.durationHours * 60,
      createdAt: submittedAt,
    })

    submissions.push({
      id: `${SEED}sub_${course.slug}`,
      courseId: id,
      submittedById: instructor.userId,
      submittedAt,
      decision: "APPROVED",
      reviewedAt: publishedAt,
      changeReasons: [],
    })

    curricula.push({ courseId: id, sections: detail.sections })

    rows.push({
      id,
      slug: course.slug,
      title: course.title,
      priceCents: cents(course.price),
      instructorId: instructor.id,
      publishedAt,
    })
  }

  await db.course.createMany({ data: courseData })
  await db.courseSubmission.createMany({ data: submissions })
  for (const { courseId, sections } of curricula) {
    await seedCurriculum(courseId, sections)
  }

  return rows
}

async function seedCurriculum(courseId: string, sections: DetailSection[]) {
  const lessons: Prisma.CourseLessonCreateManyInput[] = []

  await db.courseSection.createMany({
    data: sections.map((section, index) => ({
      id: `${SEED}sec_${courseId.slice(SEED.length)}_${index}`,
      courseId,
      title: section.title,
      order: index,
    })),
  })

  for (const [sectionIndex, section] of sections.entries()) {
    const sectionId = `${SEED}sec_${courseId.slice(SEED.length)}_${sectionIndex}`
    for (const [lessonIndex, lesson] of section.lessons.entries()) {
      lessons.push({
        id: `${sectionId}_${lessonIndex}`,
        sectionId,
        title: lesson.title,
        type: LESSON_TYPES[lesson.type],
        durationMinutes: lesson.minutes ?? null,
        questionsCount: lesson.questions ?? null,
        isPreview: lesson.preview ?? false,
        previewSeconds: lesson.previewSeconds ?? null,
        isPublished: true,
        order: lessonIndex,
      })
    }
  }

  await db.courseLesson.createMany({ data: lessons })
}

// ---------------------------------------------------------------------------
// 5 · The review queue
// ---------------------------------------------------------------------------

async function seedPendingCourses(
  categories: Map<string, string>,
  instructors: Map<string, InstructorRow>,
  reviewerId: string | null
) {
  for (const seed of pendingCourseSeeds) {
    const instructor = instructors.get(seed.instructorSlug)
    if (!instructor)
      throw new Error(`Unknown instructor slug ${seed.instructorSlug}`)

    const submittedAt =
      seed.submittedHoursAgo === undefined
        ? null
        : ago(seed.submittedHoursAgo * HOUR)

    const id = `${SEED}c_${seed.slug}`
    await db.course.create({
      data: {
        id,
        slug: seed.slug,
        title: seed.title,
        subtitle: seed.subtitle,
        description: seed.description,
        instructorId: instructor.id,
        categoryId: categories.get(seed.categorySlug)!,
        level: LEVELS[seed.level],
        durationHours: seed.durationHours,
        priceCents: seed.priceCents,
        listPriceCents: seed.listPriceCents,
        requirements: seed.requirements,
        learningOutcomes: seed.learningOutcomes,
        videoHours: Math.max(1, Math.round(seed.durationHours * 0.8)),
        articlesCount: Math.max(1, Math.round(seed.lessonCount * 0.15)),
        quizzesCount: seed.status === "NEEDS_CHANGES" ? 0 : 2,
        status: seed.status,
        submittedAt,
        lessonCount: seed.lessonCount,
        totalDurationMinutes: seed.durationHours * 60,
        createdAt: submittedAt
          ? new Date(submittedAt.getTime() - 21 * DAY)
          : ago(9 * DAY),
      },
    })

    if (!submittedAt) continue

    const decided =
      seed.status === "NEEDS_CHANGES" || seed.status === "REJECTED"
    const submissionId = `${SEED}sub_${seed.slug}`
    await db.courseSubmission.create({
      data: {
        id: submissionId,
        courseId: id,
        submittedById: instructor.userId,
        submittedAt,
        decision: decided
          ? seed.status === "REJECTED"
            ? "REJECTED"
            : "CHANGES_REQUESTED"
          : null,
        reviewedById: decided ? reviewerId : null,
        reviewedAt: decided
          ? new Date(submittedAt.getTime() + 20 * HOUR)
          : null,
        changeReasons: seed.changeReasons ?? [],
        noteToInstructor: seed.noteToInstructor ?? null,
      },
    })

    // The submission checklist from the admin course view: three rows computed
    // off the curriculum, and the audio verdict, which is a human one.
    const longEnough = seed.lessonCount >= 10 && seed.durationHours >= 5
    await db.courseSubmissionCheck.createMany({
      data: [
        {
          submissionId,
          key: "min_lessons_and_video",
          label: "At least 10 lessons and 5 hours of video",
          passed: longEnough,
        },
        {
          submissionId,
          key: "cover_resolution",
          label: "Cover image is at least 1280 × 720",
          passed: true,
        },
        {
          submissionId,
          key: "closes_with_quiz",
          label: "Closes with a graded quiz or project",
          passed: seed.status !== "NEEDS_CHANGES",
        },
        {
          submissionId,
          key: "audio_quality",
          label: "Audio is clear with no background noise",
          passed: true,
          automated: false,
        },
      ],
    })
  }
}

// ---------------------------------------------------------------------------
// 6 · Accounts
// ---------------------------------------------------------------------------

type LearnerRow = {
  id: string
  name: string
  email: string
  createdAt: Date
  /** Whether this account could have a session — see `seedSessions`. */
  signedIn: boolean
}

/**
 * Signups ramp from ~0.4/day to ~1.8/day across the window, which is what
 * makes the overview's month-over-month deltas mean anything: a flat
 * distribution puts the same number in every window and every card reads
 * +0.0%.
 */
function signupDates(count: number) {
  const weights = Array.from({ length: SIGNUP_WINDOW_DAYS }, (_, day) => {
    const progress = day / (SIGNUP_WINDOW_DAYS - 1)
    return 0.4 + 1.4 * progress
  })
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  const dates: Date[] = []
  let carry = 0
  for (const [day, weight] of weights.entries()) {
    carry += (weight / total) * count
    while (carry >= 1) {
      const daysAgo = SIGNUP_WINDOW_DAYS - 1 - day
      dates.push(ago(daysAgo * DAY + Math.floor(rng() * DAY)))
      carry -= 1
    }
  }
  // Rounding remainder — park it on today rather than dropping accounts.
  while (dates.length < count) dates.push(ago(Math.floor(rng() * DAY)))
  return dates
}

async function seedLearners() {
  const dates = signupDates(LEARNER_COUNT + featuredLearnerSeeds.length)
  const learners: LearnerRow[] = []
  const admins: string[] = []
  const users: Prisma.UserCreateManyInput[] = []
  const business: { userId: string; since: Date }[] = []
  const taken = new Set(featuredLearnerSeeds.map((seed) => seed.email))

  // The export's own eight rows first, so page one of the Users table matches
  // it; they take the newest signup dates so they sit at the top by default.
  for (const [index, seed] of featuredLearnerSeeds.entries()) {
    const id = `${SEED}u_f${pad(index, 2)}`
    const createdAt = dates[dates.length - 1 - index]!
    users.push({
      id,
      name: seed.name,
      email: seed.email,
      emailVerified: seed.status !== "PENDING",
      role: seed.role,
      status: seed.status,
      country: seed.country,
      urls: [],
      createdAt,
    })
    if (seed.role === "admin") admins.push(id)
    if (seed.plan === "business")
      business.push({ userId: id, since: createdAt })
    learners.push({
      id,
      name: seed.name,
      email: seed.email,
      createdAt,
      signedIn: seed.status === "ACTIVE",
    })
  }

  for (let index = 0; index < LEARNER_COUNT; index++) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`
    const base = name.toLowerCase().replace(/[^a-z]+/g, ".")
    let email = `${base}@example.com`
    let suffix = 2
    while (taken.has(email)) email = `${base}${suffix++}@example.com`
    taken.add(email)

    // Roughly the mix the Users export draws: mostly active, a few invited
    // accounts that never signed in, some dormant, a handful suspended.
    const status = weighted([
      ["ACTIVE", 86],
      ["PENDING", 5],
      ["INACTIVE", 7],
      ["SUSPENDED", 2],
    ] as const)

    const id = `${SEED}u_l${pad(index, 4)}`
    const createdAt = dates[index]!
    users.push({
      id,
      name,
      email,
      emailVerified: status !== "PENDING",
      role: "user",
      status,
      banned: status === "SUSPENDED",
      banReason: status === "SUSPENDED" ? "Repeated review spam" : null,
      country: weighted(countryWeights as [string, number][]),
      urls: [],
      createdAt,
    })

    if (rng() < 0.18) business.push({ userId: id, since: createdAt })
    learners.push({ id, name, email, createdAt, signedIn: status === "ACTIVE" })
  }

  await db.user.createMany({ data: users })
  await db.subscription.createMany({
    data: business.map(({ userId, since }, index) => ({
      userId,
      stripeSubscriptionId: `sub_${SEED}${pad(index, 5)}`,
      stripePriceId:
        index % 3 === 0 ? "price_business_year" : "price_business_month",
      plan: "business",
      status: "ACTIVE" as const,
      interval: (index % 3 === 0 ? "YEAR" : "MONTH") as "YEAR" | "MONTH",
      currentPeriodEnd: new Date(NOW.getTime() + 20 * DAY),
      createdAt: since,
    })),
  })

  return { learners, admins }
}

// ---------------------------------------------------------------------------
// 6b · Sessions, so "Active this week" is a real number
// ---------------------------------------------------------------------------

/**
 * The **Active this week** tile on `/dashboard/admin/users` is
 * `count(distinct session.userId)` over the last seven days — Better Auth
 * refreshes a live session's `updatedAt` once a day (`session.updateAge`), so
 * that table is the only place on the platform that knows who is still
 * around. Without any rows the tile reads 0, which is not "no data", it is a
 * platform nobody uses.
 *
 * So the seed stands in for the traffic, the way `seedUptime` stands in for a
 * health monitor. Roughly a fifth of accounts were seen in the last week and
 * another slice earlier in the month, which is the shape of a real weekly
 * active count against a total.
 *
 * The tokens are random and belong to nobody: a session row is only usable by
 * whoever holds its cookie, and nothing here ever printed one. Suspended and
 * invited accounts get none — a PENDING account has by definition never signed
 * in, which is what that status means.
 */
async function seedSessions(learners: LearnerRow[]) {
  const rows: Prisma.SessionCreateManyInput[] = []

  for (const [index, learner] of learners.entries()) {
    if (!learner.signedIn) continue

    // 22% seen inside the last week, another 20% earlier in the month, the
    // rest not for a while — a session older than its 30-day expiry is simply
    // not written, because Better Auth would have dropped it.
    const bucket = rng()
    if (bucket > 0.42) continue
    const daysAgo = bucket <= 0.22 ? rng() * 7 : 7 + rng() * 21

    const seen = ago(daysAgo * DAY)
    rows.push({
      id: `${SEED}sess_${pad(index, 4)}`,
      userId: learner.id,
      token: `${SEED}tok_${pad(index, 4)}_${Math.floor(rng() * 1e12).toString(36)}`,
      // 30 days from when it was created, matching `session.expiresIn`.
      createdAt: seen,
      updatedAt: seen,
      expiresAt: new Date(seen.getTime() + 30 * DAY),
      ipAddress: null,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141.0 Safari/537.36",
    })
  }

  await db.session.createMany({ data: rows })
  return rows.length
}

// ---------------------------------------------------------------------------
// 7 · Orders, enrolments and the earnings ledger
// ---------------------------------------------------------------------------

type EnrollmentRow = {
  id: string
  userId: string
  courseId: string
  orderId: string
  paidAt: Date
}

async function seedPurchases(learners: LearnerRow[], courses: CourseRow[]) {
  const orders: Prisma.OrderCreateManyInput[] = []
  const items: Prisma.OrderItemCreateManyInput[] = []
  const earnings: Prisma.InstructorEarningCreateManyInput[] = []
  const enrollments: EnrollmentRow[] = []
  const netByInstructor = new Map<string, number>()
  let orderIndex = 0

  for (const learner of learners) {
    const basket = Number(
      weighted([
        ["0", 22],
        ["1", 30],
        ["2", 22],
        ["3", 13],
        ["4", 8],
        ["5", 5],
      ] as const)
    )
    if (basket === 0) continue

    // Only courses that were already live — an order cannot predate the thing
    // it bought, and the catalog was published over two years.
    const available = courses.filter(
      (course) => course.publishedAt < learner.createdAt
    )
    if (available.length === 0) continue

    const chosen: CourseRow[] = []
    const wanted = Math.min(basket, available.length)
    while (chosen.length < wanted) {
      const candidate = pick(available)
      if (!chosen.some((course) => course.id === candidate.id))
        chosen.push(candidate)
    }

    const paidAt = new Date(
      learner.createdAt.getTime() + Math.floor(rng() * 6 * DAY)
    )
    if (paidAt > NOW) continue

    const subtotal = chosen.reduce((sum, course) => sum + course.priceCents, 0)
    const orderId = `${SEED}o_${pad(orderIndex++, 5)}`

    orders.push({
      id: orderId,
      userId: learner.id,
      stripeSessionId: `cs_test_${orderId}`,
      stripePaymentIntentId: `pi_test_${orderId}`,
      status: "PAID",
      amountTotal: subtotal,
      subtotalCents: subtotal,
      email: learner.email,
      createdAt: paidAt,
      paidAt,
    })

    for (const [itemIndex, course] of chosen.entries()) {
      const itemId = `${orderId}_i${itemIndex}`
      items.push({
        id: itemId,
        orderId,
        courseSlug: course.slug,
        courseId: course.id,
        title: course.title,
        unitAmount: course.priceCents,
        instructorId: course.instructorId,
        revenueShareBps: REVENUE_SHARE_BPS,
      })

      const net = Math.round((course.priceCents * REVENUE_SHARE_BPS) / 10000)
      const clearsAt = new Date(paidAt.getTime() + 30 * DAY)
      earnings.push({
        id: `${SEED}e_${pad(earnings.length, 6)}`,
        instructorId: course.instructorId,
        courseId: course.id,
        orderItemId: itemId,
        source: "SALE",
        grossCents: course.priceCents,
        platformFeeCents: course.priceCents - net,
        netCents: net,
        // Cleared and old enough to have been swept up by one of the monthly
        // runs below; cleared but recent; or still inside its 30 days.
        status:
          clearsAt < ago(40 * DAY)
            ? "PAID"
            : clearsAt < NOW
              ? "AVAILABLE"
              : "PENDING",
        clearsAt,
        createdAt: paidAt,
      })
      netByInstructor.set(
        course.instructorId,
        (netByInstructor.get(course.instructorId) ?? 0) + net
      )

      enrollments.push({
        id: `${orderId}_e${itemIndex}`,
        userId: learner.id,
        courseId: course.id,
        orderId,
        paidAt,
      })
    }
  }

  // -- Refunds -------------------------------------------------------------
  //
  // A refund is a `Refund` row and a REVERSED earning; the order itself stays
  // PAID. That is deliberate: "gross revenue" on both admin pages means gross,
  // i.e. before refunds, and flipping the order would quietly move a figure
  // whose label says it shouldn't move. What a refund does move is the
  // platform's share — that fee went back to the customer with the money — and
  // the instructor's payout pool below.
  const refunds: Prisma.RefundCreateManyInput[] = []
  const reversedItems = new Set<string>()

  for (const order of orders) {
    if (rng() >= REFUND_RATE) continue

    // Inside the 30-day guarantee, and never in the future.
    const paidAt = order.paidAt as Date
    const createdAt = new Date(
      paidAt.getTime() + Math.floor(rng() * REFUND_WINDOW_DAYS * DAY)
    )
    if (createdAt > NOW) continue

    refunds.push({
      id: `${SEED}rf_${pad(refunds.length, 5)}`,
      orderId: order.id as string,
      stripeRefundId: `re_test_${order.id}`,
      amountCents: order.amountTotal,
      reason: pick([
        "requested_by_customer",
        "course_not_as_described",
        "duplicate_purchase",
      ] as const),
      createdAt,
    })

    for (const item of items) {
      if (item.orderId === order.id) reversedItems.add(item.id as string)
    }
  }

  for (const earning of earnings) {
    if (!reversedItems.has(earning.orderItemId as string)) continue
    earning.status = "REVERSED"
    // A reversed sale never reaches a payout run, so take it back out of the
    // pool the runs below divide up.
    netByInstructor.set(
      earning.instructorId,
      (netByInstructor.get(earning.instructorId) ?? 0) - earning.netCents
    )
  }

  await db.order.createMany({ data: orders })
  await db.orderItem.createMany({ data: items })
  await db.instructorEarning.createMany({ data: earnings })
  await db.refund.createMany({ data: refunds })

  await db.enrollment.createMany({
    data: enrollments.map(({ id, userId, courseId, orderId, paidAt }) => {
      const progress = Math.floor(rng() * 101)
      return {
        id,
        userId,
        courseId,
        source: "PURCHASE" as const,
        orderId,
        progressPercent: progress,
        completedAt:
          progress === 100 ? new Date(paidAt.getTime() + 30 * DAY) : null,
        lastAccessedAt: new Date(
          paidAt.getTime() + Math.floor(rng() * 40 * DAY)
        ),
        createdAt: paidAt,
      }
    }),
  })

  return {
    enrollments,
    netByInstructor,
    orderCount: orders.length,
    refundCount: refunds.length,
  }
}

// ---------------------------------------------------------------------------
// 8 · Reviews, and the three that get reported
// ---------------------------------------------------------------------------

const REVIEW_BODIES = [
  {
    title: "Finally clicked for me",
    body: "I had tried two other courses on this and bounced off both. The order things are introduced in here is what made the difference.",
  },
  {
    title: "Worth every minute",
    body: "Dense but never rushed. I did the exercises properly and came out with something I actually use at work.",
  },
  {
    title: "Great pacing",
    body: "Short lessons that each do one thing, so it is easy to pick back up after a few days away.",
  },
  {
    title: "Good, with caveats",
    body: "Excellent first two thirds. The last section assumes a bit more than the requirements suggest, so budget extra time.",
  },
  {
    title: "Exactly what I needed",
    body: "I came in for one specific topic and left with a much better mental model of the whole area.",
  },
  {
    title: "Solid but dated in places",
    body: "The fundamentals hold up completely. A couple of the tool screens have moved since recording.",
  },
]

async function seedReviews(
  enrollments: EnrollmentRow[],
  courses: CourseRow[],
  instructors: Map<string, InstructorRow>
) {
  const bySlug = new Map(courses.map((course) => [course.slug, course]))

  // Hold one enrolment per reported course back, so its review can be the
  // reported one rather than colliding on `@@unique([courseId, userId])`.
  const reservations = new Map<string, EnrollmentRow>()
  for (const seed of reportedReviewSeeds) {
    const course = bySlug.get(seed.courseSlug)
    if (!course) continue
    const match = enrollments.find(
      (enrollment) =>
        enrollment.courseId === course.id &&
        ![...reservations.values()].some((held) => held.id === enrollment.id)
    )
    if (match) reservations.set(seed.courseSlug, match)
  }
  const reserved = new Set([...reservations.values()].map((row) => row.id))

  const rows: Prisma.CourseReviewCreateManyInput[] = []
  for (const enrollment of enrollments) {
    if (reserved.has(enrollment.id)) continue
    if (rng() > 0.32) continue

    const copy = pick(REVIEW_BODIES)
    rows.push({
      id: `${SEED}rv_${pad(rows.length, 6)}`,
      courseId: enrollment.courseId,
      userId: enrollment.userId,
      enrollmentId: enrollment.id,
      rating: rng() < 0.72 ? 5 : rng() < 0.75 ? 4 : 3,
      title: copy.title,
      body: copy.body,
      createdAt: ago(Math.floor(rng() * 300) * DAY),
    })
  }

  const instructorUserIds = [...instructors.values()].map((row) => row.userId)
  const reports: Prisma.ContentReportCreateManyInput[] = []

  for (const [index, seed] of reportedReviewSeeds.entries()) {
    const reservation = reservations.get(seed.courseSlug)
    const course = bySlug.get(seed.courseSlug)
    if (!reservation || !course) continue

    const reviewId = `${SEED}rv_flagged_${index}`
    rows.push({
      id: reviewId,
      courseId: course.id,
      userId: reservation.userId,
      enrollmentId: reservation.id,
      rating: seed.rating,
      title: seed.title,
      body: seed.body,
      reportCount: 1,
      createdAt: ago((3 + index) * DAY),
    })

    // Reporters are instructor accounts, which is what makes the overview's
    // "Flagged by instructors" a fact about the rows rather than a caption.
    reports.push({
      id: `${SEED}rep_${index}`,
      reporterId: instructorUserIds[index % instructorUserIds.length]!,
      targetType: "REVIEW",
      targetId: reviewId,
      targetLabel: `Review on ${course.title}`,
      reason: seed.reason,
      note: seed.note,
      status: "OPEN",
      createdAt: ago((2 + index) * DAY),
    })
  }

  await db.courseReview.createMany({ data: rows })
  await db.contentReport.createMany({ data: reports })

  return rows.length
}

// ---------------------------------------------------------------------------
// 9 · Instructor applications
// ---------------------------------------------------------------------------

async function seedApplications(
  learners: LearnerRow[],
  reviewerId: string | null
) {
  await db.instructorApplication.createMany({
    data: instructorApplicationSeeds.flatMap((seed, index) => {
      const applicant = learners[learners.length - 1 - index]
      if (!applicant) return []
      const createdAt = ago(seed.hoursAgo * HOUR)
      const decided = seed.status !== "PENDING"
      return [
        {
          id: `${SEED}app_${pad(index, 2)}`,
          userId: applicant.id,
          pitch: seed.pitch,
          portfolioUrls: seed.portfolioUrls,
          status: seed.status,
          reviewedById: decided ? reviewerId : null,
          reviewedAt: decided ? new Date(createdAt.getTime() + 3 * DAY) : null,
          decisionNote:
            seed.status === "REJECTED"
              ? "Guaranteed-return claims are not permitted on Lumen."
              : null,
          createdAt,
        },
      ]
    }),
  })
}

// ---------------------------------------------------------------------------
// 10 · Payout runs
// ---------------------------------------------------------------------------

/**
 * Three monthly runs: two settled, and next month's still scheduled. The
 * failed payout in the most recent settled run is what the overview's "1
 * failed payout" counts, and the scheduled run's date is the "retry scheduled
 * for" beside it — a failed transfer rolls into the next run rather than
 * carrying a retry column of its own.
 */
async function seedPayouts(
  instructors: Map<string, InstructorRow>,
  netByInstructor: Map<string, number>
) {
  const rows = [...instructors.values()]

  await db.payoutMethod.createMany({
    data: rows.map((instructor, index) => ({
      id: `${SEED}pm_${instructor.slug}`,
      instructorId: instructor.id,
      type: (index % 4 === 3 ? "PAYPAL" : "BANK_TRANSFER") as
        "PAYPAL" | "BANK_TRANSFER",
      label:
        index % 4 === 3
          ? `${instructor.slug}@lumen.co`
          : ["Revolut Bank", "Wise", "Chase", "N26"][index % 4]!,
      last4: index % 4 === 3 ? null : String(4000 + index * 7).slice(-4),
      role: "PRIMARY" as const,
      verifiedAt: ago(200 * DAY),
      createdAt: ago(220 * DAY),
    })),
  })

  const firstOfMonth = (monthsBack: number) =>
    new Date(
      Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - monthsBack, 1, 9)
    )

  const reference = (date: Date) =>
    `RUN-${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1, 2)}`

  for (const run of [
    { monthsBack: 2, status: "COMPLETED" as const, failIndex: -1 },
    { monthsBack: 1, status: "PARTIALLY_FAILED" as const, failIndex: 2 },
  ]) {
    const scheduledFor = firstOfMonth(run.monthsBack)
    const ref = reference(scheduledFor)

    const slices = rows.map((instructor, index) => ({
      instructor,
      index,
      // Half the cleared ledger per run, with a floor so an instructor with
      // almost no sales still appears as a recipient.
      amountCents: Math.max(
        2500,
        Math.round((netByInstructor.get(instructor.id) ?? 0) * 0.5)
      ),
    }))

    await db.payoutRun.create({
      data: {
        id: `${SEED}run_${ref}`,
        reference: ref,
        scheduledFor,
        status: run.status,
        totalCents: slices.reduce((sum, slice) => sum + slice.amountCents, 0),
        recipientCount: slices.length,
        completedAt: new Date(scheduledFor.getTime() + 4 * HOUR),
        createdAt: new Date(scheduledFor.getTime() - DAY),
      },
    })

    await db.payout.createMany({
      data: slices.map((slice) => {
        const failed = slice.index === run.failIndex
        return {
          id: `${SEED}po_${ref}_${slice.instructor.slug}`,
          reference: `PO-${ref.slice(4).replace("-", "")}-${10428 + slice.index}`,
          payoutRunId: `${SEED}run_${ref}`,
          instructorId: slice.instructor.id,
          payoutMethodId: `${SEED}pm_${slice.instructor.slug}`,
          amountCents: slice.amountCents,
          status: (failed ? "FAILED" : "PAID") as "FAILED" | "PAID",
          failureReason: failed
            ? "The bank rejected the transfer: account details could not be verified."
            : null,
          paidAt: failed ? null : new Date(scheduledFor.getTime() + 3 * HOUR),
          createdAt: scheduledFor,
        }
      }),
    })
  }

  const next = firstOfMonth(-1)
  await db.payoutRun.create({
    data: {
      id: `${SEED}run_${reference(next)}`,
      reference: reference(next),
      scheduledFor: next,
      status: "SCHEDULED",
      recipientCount: rows.length,
    },
  })
}

// ---------------------------------------------------------------------------
// 11 · Uptime
// ---------------------------------------------------------------------------

/**
 * Ninety days of minute-by-minute health checks, rolled up per day. The recent
 * month is deliberately cleaner than the one before it, so the card's delta is
 * a real improvement rather than noise.
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
    data: Array.from({ length: 90 }, (_, index) => {
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

// ---------------------------------------------------------------------------
// 12 · Audit log
// ---------------------------------------------------------------------------

/**
 * The rows behind `/dashboard/admin/audit-log`.
 *
 * The page filters by category, searches across member/action/target/IP and
 * pages through the result, so a handful of rows would leave every one of
 * those controls with nothing to do. This writes `AUDIT_ENTRY_COUNT` entries
 * spread over the retention window instead, drawn from real actors, real
 * courses and real learner addresses — an audit log whose targets don't exist
 * is the one kind of demo data that reads as broken.
 *
 * Three actor kinds appear, which is what the export's three role pills draw:
 * the admin accounts, instructors acting on their own courses, and a **System**
 * actor with no `actorId` for the automatic entries. `actorName`/`actorRole`
 * are snapshots on every row, per the model's own note.
 */
const AUDIT_ENTRY_COUNT = 160
/** How far back entries run. Retention is 24 months; this is the active slice. */
const AUDIT_WINDOW_DAYS = 120

type AuditActorKind = "admin" | "instructor" | "system"

type AuditTemplate = {
  action: string
  category: "MEMBERS" | "COURSES" | "BILLING" | "SECURITY"
  actor: AuditActorKind
  /** Which pool the target label is drawn from. */
  target: "course" | "learner" | "instructor" | "payout" | "promotion" | "self"
  weight: number
}

const auditTemplates: AuditTemplate[] = [
  // Members
  {
    action: "Approved instructor application",
    category: "MEMBERS",
    actor: "admin",
    target: "learner",
    weight: 8,
  },
  {
    action: "Rejected instructor application",
    category: "MEMBERS",
    actor: "admin",
    target: "learner",
    weight: 3,
  },
  {
    action: "Changed role to Instructor",
    category: "MEMBERS",
    actor: "admin",
    target: "learner",
    weight: 6,
  },
  {
    action: "Deactivated member",
    category: "MEMBERS",
    actor: "admin",
    target: "learner",
    weight: 4,
  },
  {
    action: "Reinstated member",
    category: "MEMBERS",
    actor: "admin",
    target: "learner",
    weight: 2,
  },
  {
    action: "Removed reported review",
    category: "MEMBERS",
    actor: "admin",
    target: "course",
    weight: 5,
  },
  {
    action: "Invited a new admin",
    category: "MEMBERS",
    actor: "admin",
    target: "learner",
    weight: 1,
  },

  // Courses
  {
    action: "Published course",
    category: "COURSES",
    actor: "admin",
    target: "course",
    weight: 8,
  },
  {
    action: "Rejected course submission",
    category: "COURSES",
    actor: "admin",
    target: "course",
    weight: 4,
  },
  {
    action: "Requested changes on submission",
    category: "COURSES",
    actor: "admin",
    target: "course",
    weight: 5,
  },
  {
    action: "Unpublished course",
    category: "COURSES",
    actor: "admin",
    target: "course",
    weight: 2,
  },
  {
    action: "Submitted course for review",
    category: "COURSES",
    actor: "instructor",
    target: "course",
    weight: 7,
  },
  {
    action: "Updated course curriculum",
    category: "COURSES",
    actor: "instructor",
    target: "course",
    weight: 6,
  },
  {
    action: "Created a new category",
    category: "COURSES",
    actor: "admin",
    target: "course",
    weight: 1,
  },

  // Billing
  {
    action: "Updated course pricing",
    category: "BILLING",
    actor: "instructor",
    target: "course",
    weight: 7,
  },
  {
    action: "Launched platform promotion",
    category: "BILLING",
    actor: "admin",
    target: "promotion",
    weight: 3,
  },
  {
    action: "Ended platform promotion",
    category: "BILLING",
    actor: "admin",
    target: "promotion",
    weight: 2,
  },
  {
    action: "Retried failed payout",
    category: "BILLING",
    actor: "admin",
    target: "payout",
    weight: 4,
  },
  {
    action: "Approved payout run",
    category: "BILLING",
    actor: "admin",
    target: "payout",
    weight: 4,
  },
  {
    action: "Issued a refund",
    category: "BILLING",
    actor: "admin",
    target: "learner",
    weight: 5,
  },
  {
    action: "Changed default revenue share",
    category: "BILLING",
    actor: "admin",
    target: "self",
    weight: 1,
  },

  // Security
  {
    action: "Suspended account after 5 failed sign-ins",
    category: "SECURITY",
    actor: "system",
    target: "learner",
    weight: 6,
  },
  {
    action: "Blocked sign-in from a new location",
    category: "SECURITY",
    actor: "system",
    target: "learner",
    weight: 4,
  },
  {
    action: "Enabled two-factor authentication",
    category: "SECURITY",
    actor: "admin",
    target: "self",
    weight: 3,
  },
  {
    action: "Reset a member password",
    category: "SECURITY",
    actor: "admin",
    target: "learner",
    weight: 4,
  },
  {
    action: "Revoked all active sessions",
    category: "SECURITY",
    actor: "admin",
    target: "learner",
    weight: 2,
  },
  {
    action: "Rotated API credentials",
    category: "SECURITY",
    actor: "admin",
    target: "self",
    weight: 1,
  },
  {
    action: "Turned on maintenance mode",
    category: "SECURITY",
    actor: "admin",
    target: "self",
    weight: 1,
  },
]

const promotionLabels = [
  "Back to Skills Sale · 70% off",
  "New Year Kickstart · 60% off",
  "Summer Learning · 50% off",
  "Black Friday · 80% off",
]

/**
 * A stable IP per actor, so the same person shows the same address across
 * their entries the way the export draws it — and a documentation-range
 * address for the System rows (RFC 5737, never routable).
 */
function auditIp(key: string, index: number) {
  if (key === "system") return `203.0.113.${7 + (index % 40)}`
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) % 100000
  return `81.132.${hash % 200}.${(hash >> 3) % 250}`
}

async function seedAuditLog(
  admins: { id: string; name: string }[],
  instructors: InstructorRow[],
  learners: LearnerRow[],
  courses: CourseRow[]
) {
  if (admins.length === 0) return 0

  const weighted: AuditTemplate[] = auditTemplates.flatMap((template) =>
    Array.from({ length: template.weight }, () => template)
  )

  const rows: Prisma.AuditLogCreateManyInput[] = Array.from(
    { length: AUDIT_ENTRY_COUNT },
    (_, index) => {
      const template = pick(weighted)
      const course = pick(courses)
      const learner = pick(learners)
      const instructor = pick(instructors)

      const actor =
        template.actor === "system"
          ? { id: null, name: "System", role: null, key: "system" }
          : template.actor === "instructor"
            ? {
                id: instructor.userId,
                name: instructor.name,
                role: "instructor",
                key: instructor.slug,
              }
            : (() => {
                const admin = pick(admins)
                return {
                  id: admin.id,
                  name: admin.name,
                  role: "admin",
                  key: admin.id,
                }
              })()

      const targetLabel = {
        course: course.title,
        learner: learner.email,
        instructor: instructor.name,
        payout: `PO-2026${pad(1 + (index % 9), 2)}-${10428 + (index % 40)}`,
        promotion: pick(promotionLabels),
        self: "Own account",
      }[template.target]

      const targetType = {
        course: "course",
        learner: "user",
        instructor: "instructor",
        payout: "payout",
        promotion: "promotion",
        self: "user",
      }[template.target]

      return {
        id: `${SEED}audit_${pad(index, 4)}`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: template.action,
        targetType,
        targetId: template.target === "course" ? course.id : null,
        targetLabel,
        category: template.category,
        ipAddress: auditIp(actor.key, index),
        userAgent:
          template.actor === "system"
            ? null
            : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141.0 Safari/537.36",
        createdAt: ago(
          Math.floor(rng() * AUDIT_WINDOW_DAYS * DAY * 0.999) + 6 * 60 * 1000
        ),
      }
    }
  )

  await db.auditLog.createMany({ data: rows })
  return rows.length
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  console.log("clearing previously seeded rows…")
  await clearSeededRows()

  await seedPlatformSettings()

  const categories = await seedCategories()
  console.log(`categories        ${categories.size}`)

  const instructors = await seedInstructors()
  console.log(`instructors       ${instructors.size}`)

  const courses = await seedPublishedCourses(categories, instructors)
  console.log(`published courses ${courses.length}`)

  const { learners, admins } = await seedLearners()
  const reviewerId = admins[0] ?? null
  // `seedLearners` hands back admin *ids*; the audit log needs their names too,
  // because it snapshots the actor's name on every row.
  const adminAccounts = learners
    .filter((learner) => admins.includes(learner.id))
    .map(({ id, name }) => ({ id, name }))
  console.log(`accounts          ${learners.length} (${admins.length} admin)`)

  const sessions = await seedSessions(learners)
  console.log(`sessions          ${sessions}`)

  await seedPendingCourses(categories, instructors, reviewerId)
  console.log(`queued courses    ${pendingCourseSeeds.length}`)

  const { enrollments, netByInstructor, orderCount, refundCount } =
    await seedPurchases(learners, courses)
  console.log(`orders            ${orderCount} (${refundCount} refunded)`)
  console.log(`enrolments        ${enrollments.length}`)

  const reviews = await seedReviews(enrollments, courses, instructors)
  console.log(`reviews           ${reviews}`)

  await seedApplications(learners, reviewerId)
  await seedPayouts(instructors, netByInstructor)
  await seedUptime()
  const auditEntries = await seedAuditLog(
    adminAccounts,
    [...instructors.values()],
    learners,
    courses
  )
  console.log(`audit entries     ${auditEntries}`)

  console.log("done")
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await db.$disconnect()
    process.exit(1)
  })
