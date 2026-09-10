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
  type CourseLesson as DetailLesson,
  type CourseSection as DetailSection,
} from "@/lib/config/course-details"
import {
  getInstructorProfile,
  instructorSlug,
} from "@/lib/config/instructor-profiles"
import {
  categorySlugByBrowseCategory,
  adminNotificationSeeds,
  communityReportSeeds,
  communityTopicSeeds,
  countryWeights,
  coursePromotionOptIn,
  extraInstructorSeeds,
  featuredLearnerSeeds,
  firstNames,
  instructorApplicationSeeds,
  lastNames,
  pendingCourseSeeds,
  promotionOptOutInstructorSlugs,
  promotionSeeds,
  reportedReviewSeeds,
  requiredCategorySlugs,
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

  // Before the courses and accounts, though the order is not forced:
  // `Order.promotion` is SetNull, so a promotion can go at any point without
  // taking an order with it.
  await db.notification.deleteMany({ where: seeded })
  await db.promotion.deleteMany({ where: seeded })
  await db.contentReport.deleteMany({ where: seeded })
  // Cascades to `discussion`, `discussion_reply` and `topic_moderator`.
  await db.communityTopic.deleteMany({ where: seeded })
  await db.auditLog.deleteMany({ where: seeded })
  await db.refund.deleteMany({ where: seeded })
  await db.instructorEarning.deleteMany({ where: seeded })
  await db.payout.deleteMany({ where: seeded })
  await db.payoutRun.deleteMany({ where: seeded })
  await db.payoutMethod.deleteMany({ where: seeded })
  await db.user.deleteMany({ where: seeded })
  await db.course.deleteMany({ where: seeded })
  await db.instructor.deleteMany({ where: seeded })
  // **Categories are deliberately not cleared.** They are no longer seeded —
  // an admin owns them, through `/dashboard/admin/categories` — so a re-run
  // must leave the taxonomy exactly as it found it. See `resolveCategories`.
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
// 2 · Categories — resolved, never written
// ---------------------------------------------------------------------------

/**
 * Returns slug -> row id for the categories the seeded courses need.
 *
 * **This reads; it does not write.** The seed used to author its own six
 * categories with `seed_`-prefixed ids, and that was a mistake in two ways:
 * `Course.category` is RESTRICT, so every category it created was pinned by
 * the courses it created alongside them and could never be deleted from the
 * console; and a re-run would silently replace whatever an admin had since
 * changed about the taxonomy. Categories are now owned by the admin — see
 * `seed-data.ts`' note — so the seed's job is to find them.
 *
 * A missing slug stops the run **before anything is written**, listing what to
 * create, rather than failing on a null relation somewhere in the middle of
 * `seedPublishedCourses`.
 */
async function resolveCategories() {
  const rows = await db.category.findMany({ select: { id: true, slug: true } })
  const ids = new Map(rows.map((row) => [row.slug, row.id]))

  const missing = requiredCategorySlugs().filter((slug) => !ids.has(slug))
  if (missing.length > 0) {
    throw new Error(
      `The seed needs these categories to exist first: ${missing.join(", ")}.\n` +
        `Create them at /dashboard/admin/categories — the slug is derived from ` +
        `the name, so "Data & AI" gives "data-ai" — then run the seed again.`
    )
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
      // The participation switch on `/dashboard/admin/promotions`. On for
      // everyone but the export's own opted-out row — see the seed-data note.
      promotionOptIn: !promotionOptOutInstructorSlugs.includes(seed.slug),
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
      // `null` means *inherit* from the instructor, which is what all but two
      // courses do — see `coursePromotionOptIn`.
      promotionOptIn: coursePromotionOptIn[course.slug] ?? null,
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

/**
 * A curriculum for a course in the review queue.
 *
 * `pendingCourseSeeds` gives a lesson *count* and no lessons, which was fine
 * while nothing rendered them — but the admin course view
 * (`course-view-page__admin.png`) draws a **Curriculum preview**, and a review
 * page that shows an empty syllabus for every course awaiting review is a
 * review page that cannot do its job. So the rows are generated here rather
 * than hand-authored ten times over: the export's own preview titles
 * ("Introduction & course overview", "Setting up your workspace", "Core
 * concepts, part 1", "Knowledge check") are generic scaffolding that reads
 * plausibly under any subject, which is presumably why the designer chose
 * them.
 *
 * Two things it has to keep true, because the card and the checklist both read
 * them off `Course`: the lesson rows total exactly `lessonCount`, and their
 * minutes total roughly `durationHours * 60`. A course sent back for a
 * **missing quiz** gets no quiz lesson, so the syllabus agrees with the
 * `closes_with_quiz` check that failed it.
 */
function queueCurriculum(
  lessonCount: number,
  durationHours: number,
  withQuizzes: boolean
): DetailSection[] {
  const sectionTitles = [
    "Getting started",
    "Core concepts",
    "Putting it to work",
    "Going further",
    "Wrapping up",
  ]
  // Roughly six lessons a section, capped at the five titles above.
  const sectionCount = Math.max(1, Math.min(5, Math.round(lessonCount / 6)))
  const perSection = Math.floor(lessonCount / sectionCount)
  const remainder = lessonCount % sectionCount

  const sections: DetailSection[] = []
  let taken = 0

  for (let index = 0; index < sectionCount; index++) {
    const size = perSection + (index < remainder ? 1 : 0)
    const lessons: DetailLesson[] = []

    for (let position = 0; position < size; position++) {
      const isLast = index === sectionCount - 1 && position === size - 1
      // One knowledge check at the end of every section but the first, and
      // never on a course whose whole problem is that it has no quiz.
      const isQuiz =
        withQuizzes && index > 0 && position === size - 1 && !isLast

      if (isQuiz) {
        lessons.push({ title: "Knowledge check", type: "quiz", questions: 5 })
      } else if (taken === 0) {
        lessons.push({
          title: "Introduction & course overview",
          type: "video",
          minutes: 6,
        })
      } else if (taken === 1) {
        lessons.push({
          title: "Setting up your workspace",
          type: "video",
          minutes: 14,
        })
      } else if (isLast) {
        lessons.push({ title: "Where to go next", type: "video", minutes: 8 })
      } else {
        lessons.push({
          title: `${sectionTitles[index]}, part ${position + 1}`,
          type: "video",
          // Deterministic, from the one seeded PRNG, so two runs produce the
          // same syllabus and a figure in a screenshot stays put.
          minutes: 12 + Math.floor(rng() * 13),
        })
      }
      taken += 1
    }

    sections.push({
      title: sectionTitles[index]!,
      lessonsLabel: `${lessons.length} lessons`,
      durationLabel: "",
      lessons,
    })
  }

  // Scale the video minutes so the syllabus adds up to the duration the card
  // and the catalog already advertise, rather than to whatever the random
  // draws happened to make.
  //
  // **Only the generated "part N" lessons are scaled.** The three named ones
  // are the export's own rows at the export's own lengths — an introduction is
  // six minutes because that is what an introduction is, not because of how
  // long the rest of the course runs — so they are held fixed and the
  // remainder is spread across the others.
  //
  // There is no upper cap on the rest: a course whose `durationHours` and
  // `lessonCount` imply 70-minute lessons gets 70-minute lessons. Capping them
  // would be tidier per row and would leave the syllabus adding up to less
  // than the duration the card advertises, which is the inconsistency that
  // actually shows.
  const scalable = sections.flatMap((section) =>
    section.lessons.filter(
      (lesson) => lesson.type === "video" && lesson.title.includes(", part ")
    )
  )
  const fixed = sections
    .flatMap((section) => section.lessons)
    .filter((lesson) => !scalable.includes(lesson))
    .reduce((sum, lesson) => sum + (lesson.minutes ?? 0), 0)

  const drawn = scalable.reduce((sum, lesson) => sum + (lesson.minutes ?? 0), 0)
  const target = durationHours * 60 - fixed
  if (drawn > 0 && target > 0) {
    for (const lesson of scalable) {
      lesson.minutes = Math.max(
        4,
        Math.round(((lesson.minutes ?? 0) * target) / drawn)
      )
    }
  }

  return sections
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

    // The syllabus the admin course view previews. Generated rather than
    // hand-authored — see `queueCurriculum`.
    await seedCurriculum(
      id,
      queueCurriculum(
        seed.lessonCount,
        seed.durationHours,
        seed.status !== "NEEDS_CHANGES"
      )
    )

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
// 12 · Community
// ---------------------------------------------------------------------------

/**
 * The six topics, their threads, their moderators and the five open reports
 * behind `/dashboard/admin/community`.
 *
 * **Replies are not materialised.** Each `Discussion` carries the
 * denormalised `replyCount` its own schema note calls for, and the seed
 * distributes each topic's `postCount - threadCount` across them rather than
 * writing ~18,000 `DiscussionReply` rows nothing reads yet — the arrangement
 * `Course.enrollmentCount` is already in. Write real replies when a thread
 * view exists to draw them.
 *
 * Moderators are drawn from instructor accounts and the admins, and the pool
 * is walked with a stride rather than sampled, so a person picks up a second
 * topic only once every account has one — which is what keeps the distinct
 * head-count near the assignment count and the export's own 18 close to both.
 * Every admin moderates every topic, which is what renders **All topics** in
 * the Scope column.
 */
async function seedCommunity(
  learners: LearnerRow[],
  instructors: Map<string, InstructorRow>,
  admins: string[]
) {
  const topics: Prisma.CommunityTopicCreateManyInput[] = []
  const discussions: Prisma.DiscussionCreateManyInput[] = []
  const moderators: Prisma.TopicModeratorCreateManyInput[] = []
  const reports: Prisma.ContentReportCreateManyInput[] = []

  const instructorUserIds = [...instructors.values()].map((row) => row.userId)
  const authorPool = learners.map((learner) => learner.id)
  const staffPool = [...new Set([...instructorUserIds, ...admins])]
  // **Learners can moderate**, which is not an assumption — the Moderators
  // dialog's own "Add a moderator" list offers "Nadia Rahman · Student" and
  // "Mei Tanaka · Student · top contributor". Staff lead the pool because the
  // export's table is three instructors and an admin, and there are only nine
  // staff accounts, so a staff-only pool could never reach the 18 distinct
  // moderators its tile draws.
  const trustedLearners = learners
    .filter((learner) => learner.signedIn)
    .slice(0, 14)
    .map((learner) => learner.id)
  const modPool = [...new Set([...staffPool, ...trustedLearners])]

  // Where the next topic starts drawing from `modPool`, so assignments spread
  // across accounts instead of piling onto the first few.
  let modCursor = 0
  /** The first discussion of each topic, for the report rows below. */
  const firstDiscussionByTopic = new Map<string, string>()

  for (const [index, seed] of communityTopicSeeds.entries()) {
    const topicId = `${SEED}ct_${seed.slug}`

    topics.push({
      id: topicId,
      slug: seed.slug,
      name: seed.name,
      description: seed.description,
      accentColor: seed.accentColor,
      visibility: seed.visibility,
      learnersCanStartThreads: seed.learnersCanStartThreads,
      requiresModeratorApproval: seed.requiresModeratorApproval,
      order: index,
      createdAt: ago((300 - index * 12) * DAY),
    })

    // --- threads -----------------------------------------------------------
    // A staff-post-only topic is written by staff; everywhere else it is the
    // learners, which is what the pill on the row is telling you.
    const writers = seed.learnersCanStartThreads ? authorPool : staffPool
    const replyBudget = Math.max(0, seed.postCount - seed.threadCount)
    const base = Math.floor(replyBudget / Math.max(1, seed.threadCount))
    let remainder = replyBudget - base * seed.threadCount

    for (let n = 0; n < seed.threadCount; n += 1) {
      const id = `${SEED}dsc_${seed.slug}_${pad(n, 4)}`
      if (n === 0) firstDiscussionByTopic.set(seed.slug, id)

      const subject = seed.subjects[n % seed.subjects.length]!
      const pass = Math.floor(n / seed.subjects.length)
      // A little jitter around the mean, settled up at the end so the topic
      // hits its drawn post count exactly.
      const extra = remainder > 0 && rng() < 0.4 ? 1 : 0
      remainder -= extra

      discussions.push({
        id,
        topicId,
        authorId: pick(writers),
        title: pass === 0 ? subject : `${subject} (${pass + 1})`,
        body: `${subject} — opening the thread so we can keep the discussion in one place.`,
        tags: [],
        isPinned: n === 0 && !seed.learnersCanStartThreads,
        replyCount: base + extra,
        status: "PUBLISHED",
        createdAt: ago(Math.floor(rng() * 280) * DAY + n * HOUR),
      })
    }
    // Anything the jitter left unspent goes on the first thread, so
    // `threads + sum(replyCount)` is exactly the export's post figure.
    if (remainder > 0 && discussions.length > 0) {
      const first = discussions[discussions.length - seed.threadCount]
      if (first) first.replyCount = (first.replyCount as number) + remainder
    }

    // --- moderators --------------------------------------------------------
    // `moderatorCount` is the **total** the export draws beside the row, not
    // a number of extras: writing 3/6/4/3/2/0 is what reproduces its counts
    // and, at zero, its **No moderators** state on Rules & Guidelines.
    //
    // A staff-only topic keeps a staff-only list: a learner who cannot see
    // the Instructor Lounge cannot moderate it either. Admins take the first
    // seat wherever there is one, so a single account accumulates the wide
    // scope and the **Full control** permission set the export's admin row
    // draws.
    const pool = seed.visibility === "STAFF_ONLY" ? staffPool : modPool
    const chosen: string[] = []
    for (const adminId of admins) {
      if (chosen.length >= seed.moderatorCount) break
      if (pool.includes(adminId)) chosen.push(adminId)
    }
    while (chosen.length < seed.moderatorCount) {
      const userId = pool[modCursor % pool.length]!
      modCursor += 1
      if (!chosen.includes(userId)) chosen.push(userId)
    }

    for (const [n, userId] of chosen.entries()) {
      const isAdmin = admins.includes(userId)
      moderators.push({
        id: `${SEED}tm_${seed.slug}_${pad(n, 2)}`,
        topicId,
        userId,
        canPin: true,
        canLock: isAdmin || n % 3 !== 2,
        canDelete: isAdmin || n % 2 === 0,
        canSuspend: isAdmin,
      })
    }
  }

  for (const [index, seed] of communityReportSeeds.entries()) {
    const targetId = firstDiscussionByTopic.get(seed.topicSlug)
    if (!targetId) continue
    const topic = communityTopicSeeds.find((row) => row.slug === seed.topicSlug)
    reports.push({
      id: `${SEED}crep_${index}`,
      reporterId: pick(authorPool),
      targetType: "DISCUSSION",
      targetId,
      targetLabel: `Thread in ${topic?.name ?? seed.topicSlug}`,
      reason: seed.reason,
      note: seed.note,
      status: "OPEN",
      createdAt: ago((1 + index) * DAY),
    })
  }

  await db.communityTopic.createMany({ data: topics })
  // Chunked: Postgres caps a statement at 65,535 bind parameters and these
  // rows carry a dozen columns each, so ~1,800 of them go over in one insert.
  for (let i = 0; i < discussions.length; i += 500) {
    await db.discussion.createMany({ data: discussions.slice(i, i + 500) })
  }
  await db.topicModerator.createMany({ data: moderators })
  await db.contentReport.createMany({ data: reports })

  return {
    topics: topics.length,
    threads: discussions.length,
    moderators: moderators.length,
    reports: reports.length,
  }
}

// ---------------------------------------------------------------------------
// 13 · Promotions
// ---------------------------------------------------------------------------

/**
 * The platform-wide sales behind `/dashboard/admin/promotions` — one running
 * and four in the history table, from `promotionSeeds`.
 *
 * Two things it has to get right, because the page derives everything else
 * from them:
 *
 *  - **Every window is anchored to the run**, so the running sale is still
 *    running and the four past ones are still past however long from now this
 *    is executed. A promotion has no status column — the page reads
 *    `startsAt`/`endsAt` against the clock — so an absolute date would decide
 *    the page's state, and the card the export is built around would vanish
 *    the day it expired.
 *  - **A day boundary, not the moment of the run.** `startsAt` is the start of
 *    its UTC day and `endsAt` the last millisecond of its own, which is what
 *    `lib/actions/admin-promotions.ts` writes when an admin picks the same days
 *    in the dialog. Seeding the raw offset instead would put "Ends 01 Oct" on
 *    a sale that actually stopped at 14:32 that afternoon.
 *
 * `categorySlugs` is resolved against the admin-owned taxonomy, the same way
 * every course is — `requiredCategorySlugs()` includes these, so a database
 * missing Development or Design is told before anything is written.
 */
async function seedPromotions(categories: Map<string, string>) {
  /** Midnight UTC, `days` from the run. */
  function dayStart(days: number) {
    const date = new Date(NOW.getTime() + days * DAY)
    date.setUTCHours(0, 0, 0, 0)
    return date
  }

  for (const seed of promotionSeeds) {
    await db.promotion.create({
      data: {
        id: `${SEED}promo_${seed.key}`,
        name: seed.name,
        discountType: seed.discountType,
        value: seed.value,
        scope: seed.categorySlugs.length > 0 ? "CATEGORIES" : "ALL_COURSES",
        startsAt: dayStart(seed.startsInDays),
        // The end of the chosen day, so "Ends 01 Oct" includes the 1st.
        endsAt: new Date(dayStart(seed.endsInDays).getTime() + DAY - 1),
        forceOnAllCourses: seed.forceOnAllCourses,
        redemptionCount: seed.redemptionCount,
        revenueCents: seed.revenueCents,
        createdAt: dayStart(seed.startsInDays - 3),
        categories: {
          connect: seed.categorySlugs.map((slug) => ({
            id: categories.get(slug)!,
          })),
        },
      },
    })
  }

  return promotionSeeds.length
}

// ---------------------------------------------------------------------------
// 14 · Admin notifications
// ---------------------------------------------------------------------------

/**
 * The console's notification feed, from `adminNotificationSeeds`.
 *
 * **Written for every admin account, not just the seeded one.** The feed is
 * per-user, and the account a developer actually signs in with is usually
 * their own rather than `priya.nadar@example.com` — seeding only the demo
 * admin would leave the page empty for the person looking at it. The rows
 * still carry the `seed_` prefix, so `clearSeededRows` reclaims them from a
 * real account as cleanly as from a seeded one.
 *
 * Two things it has to get right:
 *
 *  - **Every row is anchored to the run**, so "5 minutes ago" is still five
 *    minutes ago whenever this executes. The feed's whole content is relative
 *    time, and absolute dates would have it open on a wall of "8 months ago".
 *    Same arrangement `seedAuditLog`, `seedUptime` and `seedPromotions` use.
 *  - **`{course}` and `{instructor}` resolve against real rows**, for the
 *    reason `auditTemplates` gives — a notification about a course nobody can
 *    open reads as a bug rather than as sample data.
 */
async function seedNotifications(
  instructors: Map<string, InstructorRow>,
  courses: CourseRow[]
) {
  // Ordered, so the row each admin gets is the same on every run — the
  // determinism rule the seeded PRNG enforces everywhere else. `findMany`
  // without an `orderBy` is free to return them in any order, which would
  // shuffle the content between two otherwise identical runs.
  const admins = await db.user.findMany({
    where: { role: "admin" },
    orderBy: { id: "asc" },
    select: { id: true },
  })
  if (admins.length === 0 || courses.length === 0) return 0

  const instructorList = [...instructors.values()]
  const MINUTE = 60 * 1000

  let written = 0
  for (const [adminIndex, admin] of admins.entries()) {
    for (const [index, seed] of adminNotificationSeeds.entries()) {
      // Deterministic picks, so two runs produce the same feed — the rule
      // every other part of this seed follows through its own PRNG.
      const course = courses[(index * 5 + adminIndex) % courses.length]
      const instructor =
        instructorList[(index * 3 + adminIndex) % instructorList.length]

      const body = seed.body
        .replace("{course}", course.title)
        .replace("{instructor}", instructor.name)
      const title = seed.title.replace("{instructor}", instructor.name)
      const createdAt = new Date(NOW.getTime() - seed.minutesAgo * MINUTE)
      const id = `${SEED}notif_${adminIndex}_${seed.key}`

      await db.notification.create({
        data: {
          id,
          userId: admin.id,
          audience: "ADMIN",
          category: seed.category,
          title,
          body,
          // The feed renders an avatar for a row with an actor — see
          // `Notification.actorId`'s own note.
          actorId: seed.withActor ? instructor.userId : null,
          readAt: seed.unread ? null : new Date(createdAt.getTime() + MINUTE),
          createdAt,
          ...(seed.action
            ? {
                action: {
                  create: {
                    id: `${SEED}notifact_${adminIndex}_${seed.key}`,
                    actionType: seed.action,
                  },
                },
              }
            : {}),
        },
      })
      written += 1
    }
  }

  return written
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  // **Resolved before anything is cleared.** The seed no longer creates
  // categories, so a database missing one has to be told that *before* the
  // previous run's rows are deleted — otherwise a mistake here would leave the
  // catalog empty and the run half-done.
  const categories = await resolveCategories()
  console.log(`categories        ${categories.size} (resolved, not seeded)`)

  console.log("clearing previously seeded rows…")
  await clearSeededRows()

  await seedPlatformSettings()

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

  const community = await seedCommunity(learners, instructors, admins)
  console.log(
    `community         ${community.topics} topics, ${community.threads} threads, ` +
      `${community.moderators} moderator rows, ${community.reports} reports`
  )

  const promotions = await seedPromotions(categories)
  console.log(`promotions        ${promotions}`)

  const notifications = await seedNotifications(instructors, courses)
  console.log(`notifications     ${notifications}`)

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
