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
  learnerNotificationSeeds,
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
  couponSeeds,
  discussionTagPool,
  featuredQuestionSeeds,
  instructorAnswerBodies,
  replyBodies,
  instructorThreadSeeds,
  learnerThreadSeeds,
  questionReplyBodies,
  questionSubjects,
  ownerCourseSeeds,
  ownerEnrolmentSources,
  ownerEnrolmentSpread,
  ownerLastSeen,
  ownerPayoutRuns,
  ownerProgress,
  ownerQuestionSeeds,
  reportedReviewSeeds,
  requiredCategorySlugs,
  SEED_MAX,
  seededCourseSlugs,
  type ThreadMessageSeed,
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
/**
 * How many community threads are left with no replies at all. The instructor
 * Discussions page's "Awaiting your reply" tile and its Unanswered tab both
 * read exactly this state, and at zero they are two dead controls.
 */
const UNANSWERED_RATE = 0.09

/** Generated Q&A questions per course, on top of the export's own three. */
const QUESTIONS_PER_COURSE = 1

/**
 * **Every collection is capped at `SEED_MAX`.** One helper rather than a
 * `.slice()` at each call site, so the cap is greppable and a new seed list
 * cannot quietly opt out of it.
 */
function cap<T>(rows: readonly T[], max = SEED_MAX): T[] {
  return rows.slice(0, max)
}

/**
 * The published catalog rows the seed actually writes.
 *
 * Derived from `seededCourseSlugs` rather than sliced off the front of
 * `browseCourses`, for the reason that list records: the other seeds address
 * courses by slug. A slug that is not in the catalog is a typo worth stopping
 * on rather than a course that silently never appears.
 */
const seededCourses = cap(
  seededCourseSlugs.map((slug) => {
    const course = browseCourses.find((row) => row.slug === slug)
    if (!course) throw new Error(`seededCourseSlugs names no course ${slug}`)
    return course
  })
)

/**
 * Demo learner accounts *generated* on top of the featured ones.
 *
 * Zero, because `featuredLearnerSeeds` already supplies more than `SEED_MAX`
 * and those are the authored rows the exports draw. The generator stays —
 * raise this to get a populated Users table back.
 */
const LEARNER_COUNT = 0
/**
 * How far back the oldest demo signup sits.
 *
 * Short, because the catalog publishes over *two years* and `seedPurchases`
 * refuses an order that predates the course it bought. At the old 540 days a
 * five-account pool landed almost entirely before the catalog existed, and the
 * seed wrote a single order; inside 90 days every account can buy, and the
 * "new signups" card still has a trailing month to compare against the one
 * before it.
 */
const SIGNUP_WINDOW_DAYS = 90

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
  // Both feeds: ids are `seed_notif_*` (admin) and `seed_lnotif_*` (learner),
  // so the one prefix match reclaims them together — including rows written
  // onto a real, unseeded admin account, which would not cascade.
  await db.instructorFollow.deleteMany({ where: seeded })
  await db.notification.deleteMany({ where: seeded })
  await db.promotion.deleteMany({ where: seeded })
  await db.contentReport.deleteMany({ where: seeded })
  // Cascades to `discussion`, `discussion_reply` and `topic_moderator`.
  await db.communityTopic.deleteMany({ where: seeded })
  // Cascades to `conversation_participant` and `message`. Cleared explicitly
  // because a `Conversation` has no owner to cascade from — deleting the
  // accounts below takes the participants and leaves the thread behind.
  await db.conversation.deleteMany({ where: seeded })
  await db.auditLog.deleteMany({ where: seeded })
  await db.refund.deleteMany({ where: seeded })
  await db.instructorEarning.deleteMany({ where: seeded })
  await db.payout.deleteMany({ where: seeded })
  await db.payoutRun.deleteMany({ where: seeded })
  await db.payoutMethod.deleteMany({ where: seeded })
  await db.user.deleteMany({ where: seeded })
  // Cascades from `Course` anyway, but spelled out: `Order.coupon` is SetNull,
  // so an order that used a seeded code would otherwise outlive it silently.
  await db.courseQuestion.deleteMany({ where: seeded })
  await db.coupon.deleteMany({ where: seeded })
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

  // Only the instructors who teach a course the seed writes — an instructor
  // with no courses is the empty workspace `canTeach`'s note warns about.
  for (const name of new Set(
    seededCourses.map((course) => course.instructor)
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
  const last = seededCourses.length - 1

  for (const [index, course] of seededCourses.entries()) {
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
  // Filtered before it is capped: the seeded instructor set is itself a slice
  // now, so a queued course whose author was not written is skipped rather
  // than being the typo the throw below still catches.
  const queued = cap(
    pendingCourseSeeds.filter((seed) => instructors.has(seed.instructorSlug))
  )

  for (const seed of queued) {
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

    // **The curriculum is written whether or not the course was submitted.**
    // It used to sit below the `continue` alongside the submission, which left
    // the one DRAFT in this list carrying `lessonCount: 12` and no lesson rows
    // at all — the exact shape "a counter is the number of rows written" warns
    // about, and invisible until the course editor became the first surface to
    // render a draft's actual syllabus. A draft *has* a syllabus in progress;
    // what it has not got is a submission.
    await seedCurriculum(
      id,
      queueCurriculum(
        seed.lessonCount,
        seed.durationHours,
        seed.status !== "NEEDS_CHANGES"
      )
    )

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

  return queued.length
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
  const featured = cap(featuredLearnerSeeds)
  const dates = signupDates(LEARNER_COUNT + featured.length)
  const learners: LearnerRow[] = []
  const admins: string[] = []
  const users: Prisma.UserCreateManyInput[] = []
  const business: { userId: string; since: Date }[] = []
  const taken = new Set(featured.map((seed) => seed.email))

  // The export's own eight rows first, so page one of the Users table matches
  // it; they take the newest signup dates so they sit at the top by default.
  for (const [index, seed] of featured.entries()) {
    const id = `${SEED}u_f${pad(index, 2)}`
    const createdAt = dates[dates.length - 1 - index]!
    users.push({
      id,
      name: seed.name,
      email: seed.email,
      emailVerified: seed.status !== "PENDING",
      image: seed.image ?? null,
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

  // Capped like everything else: a session row is only ever read as a
  // liveness signal, and five of them answer that as well as two hundred.
  const capped = cap(rows)
  await db.session.createMany({ data: capped })
  return capped.length
}

// ---------------------------------------------------------------------------
// 6 · Coupons
// ---------------------------------------------------------------------------

type CouponRowSeed = {
  id: string
  courseId: string
  instructorId: string
  priceCents: number
  startsAt: Date
  endsAt: Date | null
  redemptionLimit: number | null
}

/**
 * The discount codes behind `coupons-page__main.png`.
 *
 * Written **before** the purchases, which is the whole point: a redemption is
 * an order, not a counter, so `seedPurchases` needs the codes in hand to
 * attach them to real sales. `CouponRedemption`'s own docstring demands
 * exactly that — "both sums over rows, never counters that can drift from the
 * orders they claim to describe" — so nothing here invents a redemption total.
 *
 * `resultingPriceCents` is computed with the same formula
 * `lib/actions/instructor-coupons.ts` uses, so a seeded coupon and one an
 * instructor creates by hand cannot price the same discount two ways. A
 * FIXED_PRICE code stores the price it was given and derives the percentage,
 * which is the direction that action runs it in too.
 */
async function seedCoupons(
  courses: CourseRow[],
  listPriceBySlug: Map<string, number>
) {
  const bySlug = new Map(courses.map((course) => [course.slug, course]))
  const data: Prisma.CouponCreateManyInput[] = []
  const rows: CouponRowSeed[] = []

  for (const seed of cap(couponSeeds)) {
    const course = bySlug.get(seed.courseSlug)
    const listPrice = listPriceBySlug.get(seed.courseSlug)
    if (!course || !listPrice) continue

    const resultingPriceCents =
      seed.discountType === "FIXED_PRICE"
        ? cents(seed.price)
        : Math.round((listPrice * (100 - seed.percentOff)) / 100)
    const percentOff =
      seed.discountType === "FIXED_PRICE"
        ? Math.round(((listPrice - resultingPriceCents) / listPrice) * 100)
        : seed.percentOff

    const id = `${SEED}cp_${seed.code.toLowerCase()}`
    // **Never before the course it discounts was published.** The offsets
    // above are chosen for the shape of the table, and the catalog publishes
    // over two years — so without this clamp a long-running code lands on a
    // course that did not exist yet, which is the one kind of demo data that
    // reads as broken.
    const wanted = ago(-seed.startsInDays * DAY)
    const startsAt = wanted < course.publishedAt ? course.publishedAt : wanted
    const endsAt = seed.endsInDays === null ? null : ago(-seed.endsInDays * DAY)
    // An end date the clamp has just overtaken would leave a coupon that
    // expired before it began; skip it rather than write a contradiction.
    if (endsAt && endsAt <= startsAt) continue

    data.push({
      id,
      code: seed.code,
      courseId: course.id,
      instructorId: course.instructorId,
      discountType: seed.discountType,
      percentOff,
      resultingPriceCents,
      redemptionLimit: seed.redemptionLimit,
      startsAt,
      endsAt,
      // Not `startsAt`: a *scheduled* coupon starts in the future, and a row
      // created after it exists is a contradiction — it is also what the list
      // orders on, which would put the one coupon nobody can use yet at the
      // top of the page.
      createdAt: startsAt > NOW ? ago(3 * DAY) : startsAt,
    })
    rows.push({
      id,
      courseId: course.id,
      instructorId: course.instructorId,
      priceCents: resultingPriceCents,
      startsAt,
      endsAt,
      redemptionLimit: seed.redemptionLimit,
    })
  }

  await db.coupon.createMany({ data })
  return rows
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

async function seedPurchases(
  learners: LearnerRow[],
  courses: CourseRow[],
  coupons: CouponRowSeed[]
) {
  const orders: Prisma.OrderCreateManyInput[] = []
  const items: Prisma.OrderItemCreateManyInput[] = []
  const earnings: Prisma.InstructorEarningCreateManyInput[] = []
  const redemptions: Prisma.CouponRedemptionCreateManyInput[] = []
  const enrollments: EnrollmentRow[] = []
  const netByInstructor = new Map<string, number>()
  const redeemed = new Map<string, number>()
  let orderIndex = 0

  /**
   * A coupon this order could actually have used.
   *
   * Three conditions, and each is the real rule rather than a convenience:
   * the code has to be for **this** course, it has to have been live on the
   * day of the sale (a coupon cannot be redeemed before it starts or after it
   * ends), and it has to have room left under its own `redemptionLimit`. The
   * last one is what stops the table drawing "212 / 150".
   */
  function couponFor(courseId: string, paidAt: Date) {
    const usable = coupons.filter(
      (coupon) =>
        coupon.courseId === courseId &&
        coupon.startsAt <= paidAt &&
        (coupon.endsAt === null || coupon.endsAt >= paidAt) &&
        (coupon.redemptionLimit === null ||
          (redeemed.get(coupon.id) ?? 0) < coupon.redemptionLimit)
    )
    return usable.length === 0 ? null : pick(usable)
  }

  for (const learner of learners) {
    // One course an order, so orders, enrolments and reviews each stay
    // inside `SEED_MAX` rather than multiplying out of it. The multi-course
    // basket is what a real checkout does and is worth restoring alongside a
    // larger learner pool.
    const basket = Number(
      weighted([
        ["0", 20],
        ["1", 80],
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

    /**
     * **A coupon discounts one item, not the whole basket.**
     *
     * `Order.couponId`'s own note says at most one of *coupon or promotion*
     * applies to an order — not that the order must hold one course. A code is
     * issued by an instructor for a specific course, so it comes off that item
     * and the rest of the basket pays list, which is what a real checkout
     * does. `couponCourseId` is the item it lands on.
     */
    let coupon: CouponRowSeed | null = null
    let couponCourseId: string | null = null
    // Most people who could use a code do; the rest pay list, so the table
    // ends up with coupons that are busy and coupons that are barely touched.
    if (rng() < 0.62) {
      for (const course of chosen) {
        const candidate = couponFor(course.id, paidAt)
        if (candidate) {
          coupon = candidate
          couponCourseId = course.id
          break
        }
      }
    }
    const amountTotal = chosen.reduce(
      (sum, course) =>
        sum +
        (coupon && course.id === couponCourseId
          ? coupon.priceCents
          : course.priceCents),
      0
    )

    orders.push({
      id: orderId,
      userId: learner.id,
      stripeSessionId: `cs_test_${orderId}`,
      stripePaymentIntentId: `pi_test_${orderId}`,
      status: "PAID",
      amountTotal,
      subtotalCents: subtotal,
      discountCents: subtotal - amountTotal,
      couponId: coupon ? coupon.id : null,
      email: learner.email,
      createdAt: paidAt,
      paidAt,
    })

    if (coupon) {
      redeemed.set(coupon.id, (redeemed.get(coupon.id) ?? 0) + 1)
      redemptions.push({
        id: `${orderId}_r`,
        couponId: coupon.id,
        orderId,
        userId: learner.id,
        discountCents: subtotal - amountTotal,
        createdAt: paidAt,
      })
    }

    for (const [itemIndex, course] of chosen.entries()) {
      const itemId = `${orderId}_i${itemIndex}`
      // What the learner actually paid for this course. The dialog's callout
      // promises the instructor's share is taken on the discounted price, and
      // this is the row that has to make that true — for the discounted item
      // only, since the rest of the basket paid list.
      const paidCents =
        coupon && course.id === couponCourseId
          ? coupon.priceCents
          : course.priceCents
      items.push({
        id: itemId,
        orderId,
        courseSlug: course.slug,
        courseId: course.id,
        title: course.title,
        unitAmount: paidCents,
        instructorId: course.instructorId,
        revenueShareBps: REVENUE_SHARE_BPS,
      })

      const net = Math.round((paidCents * REVENUE_SHARE_BPS) / 10000)
      const clearsAt = new Date(paidAt.getTime() + 30 * DAY)
      earnings.push({
        id: `${SEED}e_${pad(earnings.length, 6)}`,
        instructorId: course.instructorId,
        courseId: course.id,
        orderItemId: itemId,
        source: "SALE",
        grossCents: paidCents,
        platformFeeCents: paidCents - net,
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
  // After the orders they point at: `CouponRedemption.order` is a required
  // relation, so the rows cannot exist before the sale they record.
  await db.couponRedemption.createMany({ data: redemptions })
  await db.instructorEarning.createMany({ data: earnings })
  await db.refund.createMany({ data: refunds })

  await db.enrollment.createMany({
    data: enrollments.map(({ id, userId, courseId, orderId, paidAt }) => {
      // **A quarter of them finish.** `completedAt` is written *because*
      // progress is 100 and never independently, so the two can never tell
      // different stories about one enrolment — but a flat `rng() * 101` puts
      // exactly 100 one roll in a hundred, so at `SEED_MAX` nothing ever
      // completed and the manage page's **Completion rate** bar read 0% on
      // every course in the catalog. The share is rolled first and the partial
      // ones spread under it.
      const progress = rng() < 0.25 ? 100 : Math.floor(rng() * 100)
      return {
        id,
        userId,
        courseId,
        source: "PURCHASE" as const,
        orderId,
        progressPercent: progress,
        completedAt:
          progress === 100 ? new Date(paidAt.getTime() + 30 * DAY) : null,
        // **Clamped to now.** `paidAt` falls anywhere in the signup window,
        // so a flat "+ up to 40 days" put recent buyers' last visit in the
        // *future* — which the Students page draws as a last-active stamp and
        // the Analytics page counts as an active cohort. The clamp
        // `seedCoupons` needs for its own dates.
        lastAccessedAt: new Date(
          Math.min(
            NOW.getTime(),
            paidAt.getTime() + Math.floor(rng() * 40 * DAY)
          )
        ),
        createdAt: paidAt,
      }
    }),
  })

  return {
    enrollments,
    netByInstructor,
    redemptionCount: redemptions.length,
    orderCount: orders.length,
    refundCount: refunds.length,
  }
}

// ---------------------------------------------------------------------------
// 8 · Reviews, and the three that get reported
// ---------------------------------------------------------------------------

/**
 * What an instructor writes back, for the half of the reviews that get a
 * reply.
 *
 * The first line is `reviews-page.png`'s own, which it draws under *both* of
 * its replied cards — a placeholder in a body slot, so the rest are written
 * rather than repeated five times. **Nothing in the app emits a review reply
 * except an instructor pressing Reply**, so unlike `seedAuditLog` this is not
 * standing in for a missing source; it is here because the export draws two
 * states — "Reply" and "You replied" with the reply inset beneath it — and a
 * database with no `CourseReviewReply` row anywhere opens the page on only one
 * of them. The reading `seedCommunity` settled for its own tags and hearts.
 */
const REVIEW_REPLIES = [
  "Thanks so much for the detailed feedback — I have noted this for the next update.",
  "Really glad it landed. The section you mention is the one I rewrote twice, so that is good to hear.",
  "That is fair, and it comes up often enough that I am re-recording the opening lessons this month.",
  "Thank you for taking the time to write this up — it is genuinely useful for deciding what to build next.",
  "Noted, and thank you. I have added a downloadable summary to that module in the meantime.",
]

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
  for (const seed of cap(reportedReviewSeeds)) {
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
  // Keyed by `Instructor.id` rather than by slug, because a course carries the
  // id — it is what decides who a review reply is written by, below.
  const instructorUserById = new Map(
    [...instructors.values()].map((row) => [row.id, row.userId])
  )
  const reports: Prisma.ContentReportCreateManyInput[] = []

  for (const [index, seed] of cap(reportedReviewSeeds).entries()) {
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

  // Capped last rather than by skipping enrolments, so the reported reviews
  // held back above are still among the rows that survive — the queue at
  // `/dashboard/admin/reviews` is what those exist for.
  const capped = cap(rows, SEED_MAX + reports.length)
  await db.courseReview.createMany({ data: capped })
  await db.contentReport.createMany({ data: reports })

  // **Every other review gets a reply**, which is exactly the alternation
  // `reviews-page.png` draws down its own four cards. A reply is written by
  // the instructor who owns the course, never by an arbitrary account — the
  // page renders it under an `Instructor` pill, so anybody else would be a
  // lie about who answered — and it is dated after the review it answers and
  // never in the future, the clamp `seedCoupons` needs for its own dates.
  const authorByCourse = new Map(
    courses.map((course) => [
      course.id,
      instructorUserById.get(course.instructorId),
    ])
  )
  const replies: Prisma.CourseReviewReplyCreateManyInput[] = []
  for (const [index, review] of capped.entries()) {
    if (index % 2 !== 0) continue
    const authorId = authorByCourse.get(review.courseId)
    if (!authorId) continue
    const written = review.createdAt as Date
    replies.push({
      id: `${SEED}rvr_${pad(replies.length, 6)}`,
      reviewId: review.id as string,
      authorId,
      body: REVIEW_REPLIES[replies.length % REVIEW_REPLIES.length]!,
      createdAt: new Date(Math.min(NOW.getTime(), written.getTime() + 2 * DAY)),
    })
  }
  await db.courseReviewReply.createMany({ data: replies })

  return capped.length
}

// ---------------------------------------------------------------------------
// 8b · Certificates, and the lesson progress behind them
// ---------------------------------------------------------------------------

/**
 * The credentials `/dashboard/certificates` lists, and the `LessonProgress`
 * rows that make its **Longest streak** tile a real number.
 *
 * Nothing in the app issues a certificate yet — there is no completion flow —
 * so this is the stand-in `seedAuditLog` and `seedNotifications` already are
 * for their own sources. Three things about it are load-bearing:
 *
 *  - **It runs last and reads the database rather than taking rows in.**
 *    Whether an enrolment completed is decided inside `seedPurchases`'
 *    `createMany` by a roll this function never sees, and
 *    `seedDeveloperWorkspace` adds more afterwards. Querying for
 *    `completedAt != null` is the only way to catch both.
 *  - **It grants admin accounts a few completed courses of their own.** Every
 *    figure on that page hangs off the signed-in *learner*, and a developer's
 *    account is an admin who has bought nothing — so the page opened
 *    completely empty on the one account they actually use. The call
 *    `seedNotifications` and `seedDeveloperWorkspace` both make.
 *  - **A lesson is completed on its own day**, walking backwards from the
 *    enrolment's completion. That is what gives the streak something to count:
 *    it is the longest run of consecutive days on which *any* lesson was
 *    finished, so a twelve-lesson course is a twelve-day run and two courses
 *    whose windows touch chain into a longer one. `completedLessons` is then
 *    set to the rows that were actually written — a counter is the number of
 *    rows, never the figure the seed asked for.
 */
async function seedCertificates() {
  // **Every admin account, not the seeded one.** The account a developer signs
  // in with is usually their own and carries no `seed_` prefix — the same
  // reason `seedNotifications` queries for its recipients rather than taking
  // the list `seedLearners` returns. The rows written below still carry the
  // prefix, so `clearSeededRows` reclaims them from a real account as cleanly
  // as from a seeded one.
  const admins = await db.user.findMany({
    where: { role: "admin" },
    orderBy: { id: "asc" },
    select: { id: true },
  })

  const catalog = await db.course.findMany({
    where: { id: { startsWith: SEED }, status: "PUBLISHED" },
    orderBy: { id: "asc" },
    select: {
      id: true,
      categoryId: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          lessons: { orderBy: { order: "asc" }, select: { id: true } },
        },
      },
    },
  })
  if (catalog.length === 0) return 0

  // **Granted, not bought** — no order was placed, which is the distinction
  // `seedConversations` draws about its own enrolments. Staggered so the
  // day-sets below chain rather than overlap into one short run.
  const grants: Prisma.EnrollmentCreateManyInput[] = []
  for (const [adminIndex, admin] of admins.entries()) {
    const held = new Set(
      (
        await db.enrollment.findMany({
          where: { userId: admin.id },
          select: { courseId: true },
        })
      ).map((row) => row.courseId)
    )
    const open = catalog.filter((course) => !held.has(course.id))
    for (const [index, course] of open.slice(0, ADMIN_CERTIFICATES).entries()) {
      const finishedAt = ago((9 + index * 26 + adminIndex) * DAY)
      grants.push({
        id: `${SEED}enr_cert_${pad(adminIndex, 2)}${pad(index, 2)}`,
        userId: admin.id,
        courseId: course.id,
        source: "ADMIN_GRANT",
        progressPercent: 100,
        completedAt: finishedAt,
        lastAccessedAt: finishedAt,
        createdAt: new Date(finishedAt.getTime() - 40 * DAY),
      })
    }
  }
  await db.enrollment.createMany({ data: grants })

  const completed = await db.enrollment.findMany({
    where: { completedAt: { not: null }, course: { id: { startsWith: SEED } } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      userId: true,
      courseId: true,
      completedAt: true,
      course: { select: { categoryId: true } },
    },
  })

  const lessonsByCourse = new Map(
    catalog.map((course) => [
      course.id,
      course.sections.flatMap((section) =>
        section.lessons.map((lesson) => lesson.id)
      ),
    ])
  )
  const categorySlug = new Map(
    (await db.category.findMany({ select: { id: true, slug: true } })).map(
      (row) => [row.id, row.slug]
    )
  )

  const progress: Prisma.LessonProgressCreateManyInput[] = []
  const certificates: Prisma.CertificateCreateManyInput[] = []

  for (const [index, enrollment] of completed.entries()) {
    const lessons = lessonsByCourse.get(enrollment.courseId) ?? []
    if (lessons.length === 0) continue
    const finishedAt = enrollment.completedAt!

    // One lesson a day, ending on the day the course was finished — see the
    // note above. `secondsWatched` is what `Enrollment.progressPercent`'s own
    // docstring says that column is computed from, so it is written rather
    // than left at zero.
    lessons.forEach((lessonId, order) => {
      const day = new Date(
        finishedAt.getTime() - (lessons.length - 1 - order) * DAY
      )
      progress.push({
        id: `${SEED}lp_${pad(index, 4)}_${pad(order, 3)}`,
        enrollmentId: enrollment.id,
        lessonId,
        secondsWatched: 540,
        completedAt: day,
      })
    })

    await db.enrollment.update({
      where: { id: enrollment.id },
      data: { completedLessons: lessons.length },
    })

    const score = 78 + ((index * 7) % 22)
    certificates.push({
      id: `${SEED}cert_${pad(index, 4)}`,
      serial: `LMN-${categoryCode(
        categorySlug.get(enrollment.course.categoryId) ?? "general"
      )}-${1000 + ((index * 733) % 9000)}`,
      // **Not derived from the serial.** `Certificate.publicSlug`'s own note
      // says the share link must not be guessable from the printed ID, so it
      // is a random-looking token of its own.
      publicSlug: `${token(enrollment.id)}${pad(index, 2)}`,
      enrollmentId: enrollment.id,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      grade: gradeFor(score),
      scorePercent: score,
      // `pdfStorageKey` is deliberately null: nothing renders a PDF yet, and
      // the page prints the credential rather than claiming a stored file.
      issuedAt: finishedAt,
    })
  }

  await db.lessonProgress.createMany({ data: progress })
  await db.certificate.createMany({ data: certificates })

  return certificates.length
}

/**
 * How many completed courses each admin account is handed, so the page is not
 * empty on the account a developer signs in with.
 *
 * Five rather than a token one or two, because the page pages **four** at a
 * time: at three the pager never appears and the footer's "Showing 1–4 of 6"
 * — the one line the export draws of it — could not be looked at. It is
 * capped by how many published courses the seed has left unenrolled, so a
 * small catalog simply produces fewer.
 */
const ADMIN_CERTIFICATES = 5

/**
 * "WD", "DS", "FN" — the two letters in the middle of a printed serial, from
 * the course's category.
 *
 * The export's own four are `LMN-DS-4821`, `LMN-WD-3390`, `LMN-AI-2274` and
 * `LMN-FN-1180`: a multi-word slug takes the initials of its first two words
 * (web-development → WD) and a single word its first and third letters
 * (design → DS, finance → FN), which is what reproduces all four.
 */
function categoryCode(slug: string): string {
  const words = slug.split("-").filter(Boolean)
  if (words.length >= 2) {
    return `${words[0]![0]}${words[1]![0]}`.toUpperCase()
  }
  const word = words[0] ?? "xx"
  return `${word[0] ?? "x"}${word[2] ?? word[1] ?? "x"}`.toUpperCase()
}

/** A–F from the recorded score, which is the only thing `Certificate.grade`
 *  can honestly be derived from. */
function gradeFor(score: number): string {
  if (score >= 95) return "A+"
  if (score >= 88) return "A"
  if (score >= 82) return "B+"
  if (score >= 75) return "B"
  return "C"
}

/**
 * A short opaque token for `Certificate.publicSlug`, deterministic per
 * enrolment so a re-run does not invalidate a link somebody pasted somewhere.
 *
 * **Two FNV-1a passes with different offsets, not one `hash * 31` loop.** The
 * enrolment ids this is fed differ only in their last character or two
 * (`seed_enr_cert_0000`, `…0001`), and the naive version produced tokens that
 * differed only in their last character too — technically unique and exactly
 * the "guessable" that `publicSlug`'s own docstring rules out. Mixing twice
 * and interleaving the halves is what makes a neighbouring id land somewhere
 * else entirely.
 */
function token(seed: string): string {
  const fnv = (offset: number) => {
    let hash = offset
    for (const character of seed) {
      hash ^= character.charCodeAt(0)
      hash = Math.imul(hash, 16777619) >>> 0
    }
    return hash.toString(36).padStart(7, "0")
  }
  return `${fnv(2166136261)}${fnv(2166136261 ^ 0x5bf03635)}`.slice(0, 12)
}

// ---------------------------------------------------------------------------
// 9 · Instructor applications
// ---------------------------------------------------------------------------

async function seedApplications(
  learners: LearnerRow[],
  reviewerId: string | null
) {
  await db.instructorApplication.createMany({
    data: cap(instructorApplicationSeeds).flatMap((seed, index) => {
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

  // Two destinations each, not one: `payout-settings-page.png` draws a bank
  // marked **Primary** above a PayPal marked **Backup**, and a page whose
  // whole subject is a fallback chain would have nothing to say with a single
  // row. The pair also gives the Edit dialog's "use as my primary" switch
  // something to actually do — with one method it is forced on and inert.
  await db.payoutMethod.createMany({
    data: rows.flatMap((instructor, index) => [
      {
        id: `${SEED}pm_${instructor.slug}`,
        instructorId: instructor.id,
        type: "BANK_TRANSFER" as const,
        label: ["Barclays", "Revolut Bank", "Wise", "Chase", "N26"][index % 5]!,
        last4: String(4000 + index * 7).slice(-4),
        currency: index % 5 === 0 ? "gbp" : "usd",
        role: "PRIMARY" as const,
        verifiedAt: ago(200 * DAY),
        createdAt: ago(220 * DAY),
      },
      {
        id: `${SEED}pm_${instructor.slug}_backup`,
        instructorId: instructor.id,
        type: "PAYPAL" as const,
        label: `${instructor.slug}@lumen.co`,
        // A PayPal address *is* the identifier, so there is no last-4 to
        // render — see `methodDescription`, which draws a different second
        // line for each type because the export does.
        last4: null,
        role: "BACKUP" as const,
        verifiedAt: ago(180 * DAY),
        createdAt: ago(190 * DAY),
      },
    ]),
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
    // `SEED_MAX` days rather than 90. The Platform Overview card sums a
    // window, so it still renders — its month-over-month delta simply has
    // fewer days behind it.
    data: Array.from({ length: SEED_MAX }, (_, index) => {
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
const AUDIT_ENTRY_COUNT = SEED_MAX
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
  const replies: Prisma.DiscussionReplyCreateManyInput[] = []
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
  /** How many threads have been left with no replies — see the forcing rule. */
  let unanswered = 0

  const topicSeeds = cap(communityTopicSeeds)

  for (const [index, seed] of topicSeeds.entries()) {
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
    /**
     * **Who replies is a wider pool than who may start a thread.**
     * `learnersCanStartThreads: false` is what makes Announcements
     * staff-authored — it says nothing about who may answer, and a learner
     * certainly may. Drawing replies from `writers` made every reply in that
     * topic staff-written, which the thread page then tinted end to end and
     * lost the very distinction the tint exists to draw. A staff-only topic is
     * the exception: somebody who cannot see the Instructor Lounge cannot post
     * in it either.
     */
    const repliers =
      seed.visibility === "STAFF_ONLY"
        ? staffPool
        : [...authorPool, ...staffPool]
    /**
     * **The export's own figures are capped here, not in the seed data.**
     * `communityTopicSeeds` still carries the 124/1940, 862/9410 … pairs the
     * admin Community page was measured against, because they are what that
     * export draws — and `SEED_MAX` is what the database actually gets. So
     * the page's columns no longer match the drawing; raising `SEED_MAX` puts
     * them back without re-authoring anything.
     */
    // **`SEED_MAX` threads across the whole community**, not per topic — so
    // every topic pill still opens onto something without the list running to
    // five pages. `Math.max(1, …)` is what keeps a pill that would otherwise
    // round to nothing alive, which is the dead-affordance rule the board's
    // own note states.
    const perTopic = Math.max(1, Math.floor(SEED_MAX / topicSeeds.length))
    const threadCount = Math.min(seed.threadCount, perTopic)
    const postCount = Math.min(seed.postCount, threadCount * (1 + SEED_MAX))
    const replyBudget = Math.max(0, postCount - threadCount)
    const base = Math.floor(replyBudget / Math.max(1, threadCount))
    let remainder = replyBudget - base * threadCount

    for (let n = 0; n < threadCount; n += 1) {
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
        // **Tags and hearts, which the list draws on every card.** Both were
        // left empty when this seed only had to satisfy the admin Community
        // page's two count columns; `discussions-page.png` draws a chip row
        // and a like count per thread, so a feed of untagged, unliked threads
        // would leave two of the card's four lines blank. The topic's own name
        // is *not* among them — `discussion-card.tsx` draws that chip from the
        // relation, so storing it here would be the same fact twice.
        tags: discussionTagPool[seed.slug]
          ? [pick(discussionTagPool[seed.slug]!)]
          : [],
        // Loosely tracks the reply count, the way a busy thread really does,
        // with enough spread that the column is not a constant.
        likeCount: Math.floor((base + extra) * (1.5 + rng() * 4)),
        isPinned: n === 0 && !seed.learnersCanStartThreads,
        replyCount: base + extra,
        status: "PUBLISHED",
        createdAt: ago(Math.floor(rng() * 280) * DAY + n * HOUR),
      })
    }
    // **A few threads are left unanswered**, which is what the instructor
    // page's "Awaiting your reply" tile and its Unanswered tab are *for* —
    // every thread carrying at least `base` replies made both of them
    // permanently zero. The replies taken off them are not lost: they go into
    // `remainder` and are settled below, so `threads + sum(replyCount)` is
    // still exactly the export's post figure.
    const written = discussions.slice(discussions.length - threadCount)
    for (const row of written) {
      // Never the pinned first thread — a pinned announcement with no replies
      // reads as a mistake rather than a fresh question.
      if (row.isPinned) continue
      // **The last topic forces one if nothing has drawn it yet.** At
      // `SEED_MAX` the whole community is a handful of threads, and a 9% roll
      // across five of them usually comes up empty — which leaves the
      // instructor page's "Awaiting your reply" tile and its Unanswered tab
      // the two dead controls `UNANSWERED_RATE` exists to prevent.
      const forced = !unanswered && index === topicSeeds.length - 1
      if (!forced && rng() >= UNANSWERED_RATE) continue
      unanswered += 1
      remainder += row.replyCount as number
      row.replyCount = 0
      row.likeCount = Math.floor(rng() * 4)
    }

    // Anything the jitter left unspent goes on the first thread that still
    // has replies, so `threads + sum(replyCount)` is the export's post figure.
    //
    // **Never onto a thread just left unanswered.** With one thread to a topic
    // the "first" thread *is* the one zeroed above, so the old form handed its
    // replies straight back and the Unanswered tab stayed empty however the
    // roll went. If every thread in the topic is unanswered there is nowhere
    // honest to put the remainder and it is dropped — that sum is a claim
    // about the export's figures, which `SEED_MAX` has already given up.
    if (remainder > 0) {
      const target = written.find((row) => (row.replyCount as number) > 0)
      if (target) target.replyCount = (target.replyCount as number) + remainder
    }

    // -- the replies themselves ---------------------------------------------
    //
    // **Materialised now that a thread has a page.** This seed used to write
    // `replyCount` and no rows, which was right while the only reader was the
    // admin Community page's two count columns — and became wrong the moment
    // `discussion-page__individual.png` shipped, because every thread would
    // have opened on "12 replies" and an empty list. The counter stays the
    // number of rows written, so it is still the cache the model calls it and
    // the Community page's figures do not move.
    for (const row of written) {
      const count = row.replyCount as number
      const opened = (row.createdAt as Date).getTime()
      for (let r = 0; r < count; r += 1) {
        const author = pick(repliers)
        replies.push({
          id: `${row.id}_r${pad(r, 4)}`,
          discussionId: row.id as string,
          authorId: author,
          body: pick(replyBodies),
          likeCount: Math.floor(rng() * 14),
          // Spread through the days after the thread opened, and never into
          // the future — a reply cannot predate the thread it answers.
          createdAt: new Date(
            Math.min(
              NOW.getTime(),
              opened + Math.floor(rng() * 20 * DAY) + r * HOUR
            )
          ),
        })
      }
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
    // Capped by the pool as well as by `SEED_MAX`: the `while` below only
    // exits when `chosen` grows, so asking for more seats than there are
    // accounts to fill them would spin forever.
    const moderatorCount = Math.min(seed.moderatorCount, SEED_MAX, pool.length)
    const chosen: string[] = []
    for (const adminId of admins) {
      if (chosen.length >= moderatorCount) break
      if (pool.includes(adminId)) chosen.push(adminId)
    }
    while (chosen.length < moderatorCount) {
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

  for (const [index, seed] of cap(communityReportSeeds).entries()) {
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
  // After the threads they hang off — `DiscussionReply.discussion` is a
  // required relation — and chunked for the same bind-parameter reason, with
  // ~18,000 of them to write.
  for (let i = 0; i < replies.length; i += 1000) {
    await db.discussionReply.createMany({ data: replies.slice(i, i + 1000) })
  }
  await db.topicModerator.createMany({ data: moderators })
  await db.contentReport.createMany({ data: reports })

  return {
    topics: topics.length,
    threads: discussions.length,
    replies: replies.length,
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

  for (const seed of cap(promotionSeeds)) {
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

  return cap(promotionSeeds).length
}

// ---------------------------------------------------------------------------
// 14 · Notification feeds
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
/**
 * One writer for both feeds — the admin's and the learner's are the same
 * table with a different `audience`, so they are the same loop with a
 * different seed list and a different recipient set.
 */
async function writeNotifications(
  audience: "LEARNER" | "ADMIN",
  recipients: { id: string }[],
  seeds: typeof adminNotificationSeeds | typeof learnerNotificationSeeds,
  instructorList: InstructorRow[],
  courses: CourseRow[]
) {
  const MINUTE = 60 * 1000
  let written = 0

  for (const [personIndex, person] of recipients.entries()) {
    for (const [index, seed] of seeds.entries()) {
      // Deterministic picks, so two runs produce the same feed — the rule
      // every other part of this seed follows through its own PRNG.
      const course = courses[(index * 5 + personIndex) % courses.length]
      const instructor =
        instructorList[(index * 3 + personIndex) % instructorList.length]

      const body = seed.body
        .replace("{course}", course.title)
        .replace("{instructor}", instructor.name)
      const title = seed.title.replace("{instructor}", instructor.name)
      const createdAt = new Date(NOW.getTime() - seed.minutesAgo * MINUTE)
      const prefix = audience === "ADMIN" ? "notif" : "lnotif"
      const id = `${SEED}${prefix}_${personIndex}_${seed.key}`

      await db.notification.create({
        data: {
          id,
          userId: person.id,
          audience,
          category: seed.category,
          title,
          body,
          actorId: seed.withActor ? instructor.userId : null,
          readAt: seed.unread ? null : new Date(createdAt.getTime() + MINUTE),
          createdAt,
          ...(seed.action
            ? {
                action: {
                  create: {
                    id: `${SEED}${prefix}act_${personIndex}_${seed.key}`,
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

async function seedNotifications(
  instructors: Map<string, InstructorRow>,
  courses: CourseRow[]
) {
  if (courses.length === 0) return { admin: 0, learner: 0 }
  const instructorList = [...instructors.values()]
  if (instructorList.length === 0) return { admin: 0, learner: 0 }

  // Ordered, so the rows each person gets are the same on every run — the
  // determinism rule the seeded PRNG enforces everywhere else. `findMany`
  // without an `orderBy` may return them in any order.
  const admins = await db.user.findMany({
    where: { role: "admin" },
    orderBy: { id: "asc" },
    select: { id: true },
  })

  // The learner feed goes to a handful of demo students, not to all 500
  // accounts: ten rows each across the whole pool would be five thousand
  // notifications nobody reads.
  const demoLearners = await db.user.findMany({
    where: { role: "user", id: { startsWith: `${SEED}u_` } },
    orderBy: { id: "asc" },
    take: SEED_MAX,
    select: { id: true },
  })

  // **Every admin gets a learner feed too**, and they are concatenated
  // rather than folded into the query above with a `take`. An admin is also
  // a learner — the two feeds are separate inboxes for one person, which is
  // the whole point of `NotificationAudience` — and the account a developer
  // signs in with is usually a real one whose cuid sorts nowhere near the
  // `seed_` ids, so a single capped query could drop it.
  const learners = [...admins, ...demoLearners]

  const admin = await writeNotifications(
    "ADMIN",
    admins,
    cap(adminNotificationSeeds),
    instructorList,
    courses
  )
  const learner = await writeNotifications(
    "LEARNER",
    learners,
    cap(learnerNotificationSeeds),
    instructorList,
    courses
  )
  return { admin, learner }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * The two Messages exports, made real —
 * `ui-design/light/dashboard/instructor/messages-page.png` and its learner
 * twin. Nothing in the app emits a conversation yet, so this is the stand-in
 * `seedAuditLog` and `seedNotifications` already are for their own sources,
 * and for the same reason: an inbox of nothing leaves the search, the thread
 * and the composer with nothing to do.
 *
 * Four things about it are load-bearing:
 *
 *  - **It grants the enrolment behind every pair it writes.** `resolvePairing`
 *    is what authorises a conversation, and a seeded thread whose composer
 *    rendered read-only would contradict the page it exists to demonstrate.
 *    The grants are `ADMIN_GRANT` rather than `PURCHASE` — no order was
 *    placed, and saying otherwise would put a sale in the ledger that never
 *    happened. Existing enrolments are left alone.
 *  - **One thread is two inboxes.** Nadia's conversation with Simon is a row
 *    in *his* list and a row in *hers*; `MessageAudience` is what sorts them,
 *    so the seed writes each conversation once and both sides get it.
 *  - **Learner threads go to every admin too**, concatenated rather than
 *    folded into one capped query — `seedNotifications` records why: an admin
 *    is also a learner, and the account a developer signs in with is usually
 *    a real one whose cuid sorts nowhere near the `seed_` ids.
 *  - **Unread is a `lastReadAt` placed between two messages**, never a stored
 *    count, because that is the only thing the page reads —
 *    `ConversationParticipant`'s own docstring asks for exactly this.
 */
async function seedConversations(
  instructors: Map<string, InstructorRow>,
  courses: CourseRow[]
) {
  const courseBySlug = new Map(courses.map((course) => [course.slug, course]))
  const coursesByInstructor = new Map<string, CourseRow[]>()
  for (const course of courses) {
    const list = coursesByInstructor.get(course.instructorId) ?? []
    list.push(course)
    coursesByInstructor.set(course.instructorId, list)
  }

  const conversations: Prisma.ConversationCreateManyInput[] = []
  const participants: Prisma.ConversationParticipantCreateManyInput[] = []
  const messages: Prisma.MessageCreateManyInput[] = []
  const grants: Prisma.EnrollmentCreateManyInput[] = []
  const granted = new Set<string>()

  /**
   * Writes one thread and the enrolment that legitimises it.
   *
   * `unreadFor` names the side that has *not* caught up: their `lastReadAt`
   * lands just before the first of the trailing messages they have yet to see,
   * and the other side's is set past the end.
   */
  function thread(options: {
    key: string
    instructorUserId: string
    learnerUserId: string
    course: CourseRow
    agoMinutes: number
    unread: number
    unreadFor: "instructor" | "learner"
    lines: ThreadMessageSeed[]
  }) {
    const {
      key,
      instructorUserId,
      learnerUserId,
      course,
      agoMinutes,
      unread,
      unreadFor,
      lines,
    } = options
    if (instructorUserId === learnerUserId) return

    const conversationId = `${SEED}conv_${key}`
    const lastMessageAt = ago(agoMinutes * 60 * 1000)
    const sentAt = (line: ThreadMessageSeed) =>
      new Date(lastMessageAt.getTime() - line.minutesBefore * 60 * 1000)

    conversations.push({
      id: conversationId,
      courseId: course.id,
      lastMessageAt,
      createdAt: sentAt(lines[0]!),
    })

    lines.forEach((line, index) => {
      messages.push({
        id: `${conversationId}_m${index}`,
        conversationId,
        senderId: line.from === "instructor" ? instructorUserId : learnerUserId,
        body: line.body,
        sentAt: sentAt(line),
      })
    })

    // A second past the newest message: "read everything".
    const caughtUp = new Date(lastMessageAt.getTime() + 1000)
    // A second before the *unread*-th-from-last message **the other side
    // sent**. Counting raw trailing rows instead was wrong wherever a thread
    // ends with a reply in the middle: your own message is never unread
    // against you, so a transcript of [them, you, them] can only ever carry
    // two unread for you, and the naive index made it one.
    let behind = caughtUp
    if (unread > 0) {
      const theirs = lines.filter((line) =>
        unreadFor === "instructor"
          ? line.from === "learner"
          : line.from === "instructor"
      )
      const first = theirs[theirs.length - unread]
      if (first) behind = new Date(sentAt(first).getTime() - 1000)
    }

    participants.push(
      {
        id: `${conversationId}_p_i`,
        conversationId,
        userId: instructorUserId,
        lastReadAt: unreadFor === "instructor" ? behind : caughtUp,
      },
      {
        id: `${conversationId}_p_l`,
        conversationId,
        userId: learnerUserId,
        lastReadAt: unreadFor === "learner" ? behind : caughtUp,
      }
    )

    const grantKey = `${learnerUserId}:${course.id}`
    if (!granted.has(grantKey)) {
      granted.add(grantKey)
      grants.push({
        id: `${SEED}enr_msg_${key}`,
        userId: learnerUserId,
        courseId: course.id,
        source: "ADMIN_GRANT",
        progressPercent: Math.floor(rng() * 80) + 10,
        createdAt: ago(30 * DAY),
      })
    }
  }

  // -- Simon's inbox, from the instructor export ---------------------------
  const flagshipCourse = courseBySlug.get("mastering-illustration")
  const flagship = instructors.get(instructorSlug("Simon Simorangkir"))

  if (flagshipCourse && flagship) {
    const learners = await db.user.findMany({
      where: {
        email: { in: instructorThreadSeeds.map((seed) => seed.learnerEmail) },
      },
      select: { id: true, email: true },
    })
    const learnerByEmail = new Map(
      learners.map((learner) => [learner.email, learner.id])
    )

    for (const [index, seed] of cap(instructorThreadSeeds).entries()) {
      const learnerUserId = learnerByEmail.get(seed.learnerEmail)
      if (!learnerUserId) continue
      thread({
        key: `ins_${pad(index, 2)}`,
        instructorUserId: flagship.userId,
        learnerUserId,
        course: flagshipCourse,
        agoMinutes: seed.agoMinutes,
        unread: seed.unreadForInstructor,
        unreadFor: "instructor",
        lines: seed.messages,
      })
    }
  }

  // -- A learner's inbox, from the student export --------------------------
  //
  // The four featured learners already have a Simon thread from the block
  // above, so `thread` is asked for the other two; everybody else gets all
  // three. Ordered queries, so a re-run writes the same rows — the
  // determinism rule the seeded PRNG enforces everywhere else.
  const admins = await db.user.findMany({
    where: { role: "admin" },
    orderBy: { id: "asc" },
    select: { id: true, email: true },
  })
  const featuredEmails = instructorThreadSeeds.map((seed) => seed.learnerEmail)
  const featuredLearners = await db.user.findMany({
    where: { email: { in: featuredEmails } },
    orderBy: { id: "asc" },
    select: { id: true, email: true },
  })

  // **Admins and the export's own four, and nobody else.** Every learner
  // thread with Simon is also a row in *his* inbox, and the instructor export
  // draws exactly four — so handing one to the wider demo pool would quietly
  // double the list that export is the reference for. The four already have
  // theirs from the block above, which leaves admins as the only accounts this
  // adds to Simon's list: on a clean seed that is Priya Nadar, who is one of
  // the four, so his inbox lands on the drawn four exactly. A developer's own
  // admin account adds one more, which is the same trade `seedNotifications`
  // makes and the honest consequence of one thread being two inboxes.
  const featured = new Set(featuredEmails)
  const recipients = [...admins, ...featuredLearners].filter(
    (user, index, list) =>
      list.findIndex((other) => other.id === user.id) === index
  )

  for (const [recipientIndex, recipient] of cap(recipients).entries()) {
    for (const [seedIndex, seed] of cap(learnerThreadSeeds).entries()) {
      const profile = instructors.get(instructorSlug(seed.instructorName))
      if (!profile) continue

      const course = seed.courseSlug
        ? courseBySlug.get(seed.courseSlug)
        : coursesByInstructor.get(profile.id)?.[0]
      if (!course) continue

      // Simon's thread with a featured learner is already written above, with
      // the instructor export's own transcript — writing a second would give
      // one pair two threads about one course, which `startConversation`
      // deliberately refuses to do.
      if (
        seed.courseSlug === "mastering-illustration" &&
        featured.has(recipient.email)
      ) {
        continue
      }

      thread({
        key: `lrn_${pad(recipientIndex, 2)}_${pad(seedIndex, 2)}`,
        instructorUserId: profile.userId,
        learnerUserId: recipient.id,
        course,
        agoMinutes: seed.agoMinutes,
        unread: seed.unreadForLearner,
        unreadFor: "learner",
        lines: seed.messages,
      })
    }
  }

  // Enrolments first: a conversation is *about* a course, and the rule behind
  // it has to be true before the thread exists rather than after.
  await db.enrollment.createMany({ data: grants, skipDuplicates: true })
  await db.conversation.createMany({ data: conversations })
  await db.conversationParticipant.createMany({ data: participants })
  await db.message.createMany({ data: messages })

  return { threads: conversations.length, messages: messages.length }
}

// ---------------------------------------------------------------------------
// Instructor follows
// ---------------------------------------------------------------------------

/**
 * Followers for the public instructor profile's **Follow** button.
 *
 * The app emits these for real — a learner pressing Follow writes the row — so
 * unlike the audit log or the uptime samples this is not standing in for a
 * missing source. It is written for the reason `seedCommunity` gained its tags
 * and hearts: the header draws a follower count beside the button, and at zero
 * on every profile that figure is a dead control which makes a shipped feature
 * read as broken.
 *
 * Three things about it:
 *  - **Only learners follow.** The pool is `seedLearners`' accounts, never the
 *    `seed_u_ins_*` accounts behind the instructors themselves, so the seed
 *    cannot write the one row `setFollowingInstructor` refuses (an instructor
 *    following their own profile).
 *  - **Each instructor's followers are capped**, not the list as a whole. A
 *    single `cap()` over every row would give the first instructor five
 *    followers and everyone after them none, which is the opposite of what the
 *    page needs to demonstrate.
 *  - **The count on screen is the number of rows written.** Nothing caches it
 *    — `getProfileRelationship` counts the table — so the rule
 *    `CourseQuestion.voteCount` learned the hard way cannot bite here.
 */
async function seedFollows(
  learners: LearnerRow[],
  instructors: Map<string, InstructorRow>
) {
  const instructorUserIds = new Set(
    [...instructors.values()].map((row) => row.userId)
  )
  const pool = learners.filter((learner) => !instructorUserIds.has(learner.id))

  const rows: Prisma.InstructorFollowCreateManyInput[] = []

  for (const instructor of instructors.values()) {
    // Fisher-Yates rather than `sort(() => rng() - 0.5)`: a comparator that
    // ignores its arguments leaves the result up to the engine's sort, which
    // is a poor basis for the seed's promise that two runs are identical.
    const shuffled = [...pool]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
    }
    // A different count per instructor, so the profiles do not all draw the
    // same figure.
    const followers = cap(shuffled, 1 + Math.floor(rng() * SEED_MAX))

    for (const [index, follower] of followers.entries()) {
      rows.push({
        id: `${SEED}follow_${instructor.slug}_${pad(index, 2)}`,
        userId: follower.id,
        instructorId: instructor.id,
        // Somewhere in the last three months, and never before the account
        // existed — a follow by somebody who had not signed up yet is the one
        // kind of demo data that reads as broken.
        createdAt: new Date(
          Math.max(
            follower.createdAt.getTime(),
            ago(rng() * 90 * DAY).getTime()
          )
        ),
      })
    }
  }

  await db.instructorFollow.createMany({ data: rows, skipDuplicates: true })
  return rows.length
}

// ---------------------------------------------------------------------------
// Course Q&A
// ---------------------------------------------------------------------------

/**
 * The instructor Q&A queue, from
 * `ui-design/light/dashboard/instructor/Q&A-page.png` and its thread page.
 *
 * Nothing in the app emits a course question yet, so this is the stand-in
 * `seedCommunity` and `seedNotifications` already are. Four things about it:
 *
 *  - **Every question is anchored to a real lesson.** `CourseQuestion.lesson`
 *    is what draws "Lesson 2 · Mastering Tools", and a queue whose lesson
 *    labels pointed at nothing is the one kind of demo data that reads as
 *    broken — the point `auditTemplates` already makes about its targets.
 *  - **Askers are enrolled learners**, not the whole account pool: the page's
 *    lead says "Questions from students enrolled in your courses", and a
 *    question from somebody who never bought the course would contradict it.
 *  - **`answeredByInstructor` is written, not inferred.** It is the column the
 *    pill, both tabs and the sidebar badge read, so it comes from the seed
 *    rather than from whether a reply happens to be staff-written.
 *  - **`voteCount` is the number of `CourseQuestionVote` rows written**, so
 *    the counter is the cache the model calls it rather than a free-floating
 *    integer.
 */
async function seedCourseQuestions(
  courses: CourseRow[],
  learners: LearnerRow[],
  instructors: Map<string, InstructorRow>
) {
  const bySlug = new Map(courses.map((course) => [course.slug, course]))
  const instructorByCourse = new Map(
    [...instructors.values()].map((row) => [row.id, row.userId])
  )

  // Lessons per course, so a question can name one. Ordered, so a re-run
  // anchors the same questions to the same lessons.
  const lessons = await db.courseLesson.findMany({
    where: { section: { courseId: { in: courses.map((c) => c.id) } } },
    orderBy: [{ sectionId: "asc" }, { order: "asc" }],
    select: { id: true, order: true, section: { select: { courseId: true } } },
  })
  const lessonsByCourse = new Map<string, { id: string; order: number }[]>()
  for (const lesson of lessons) {
    const list = lessonsByCourse.get(lesson.section.courseId) ?? []
    list.push({ id: lesson.id, order: lesson.order })
    lessonsByCourse.set(lesson.section.courseId, list)
  }

  // Who may ask: people actually enrolled, per course.
  const enrolments = await db.enrollment.findMany({
    where: { courseId: { in: courses.map((c) => c.id) } },
    select: { courseId: true, userId: true },
  })
  const askersByCourse = new Map<string, string[]>()
  for (const row of enrolments) {
    const list = askersByCourse.get(row.courseId) ?? []
    list.push(row.userId)
    askersByCourse.set(row.courseId, list)
  }

  const questions: Prisma.CourseQuestionCreateManyInput[] = []
  const replies: Prisma.CourseQuestionReplyCreateManyInput[] = []
  const votes: Prisma.CourseQuestionVoteCreateManyInput[] = []
  const learnerIds = learners.map((learner) => learner.id)

  /** Writes one question plus its replies and votes. */
  function write(options: {
    id: string
    course: CourseRow
    askerId: string
    title: string
    body: string
    answered: boolean
    votes: number
    agoMinutes: number
    lines: {
      from: "instructor" | "learner"
      body: string
      agoMinutes: number
    }[]
  }) {
    const lessonList = lessonsByCourse.get(options.course.id) ?? []
    const lesson = lessonList.length
      ? lessonList[Math.floor(rng() * lessonList.length)]!
      : null
    const createdAt = ago(options.agoMinutes * 60 * 1000)
    const instructorUserId = instructorByCourse.get(options.course.instructorId)

    const question: Prisma.CourseQuestionCreateManyInput = {
      id: options.id,
      courseId: options.course.id,
      lessonId: lesson?.id ?? null,
      authorId: options.askerId,
      title: options.title,
      body: options.body,
      // Filled in below from the rows actually written — see the voter pool.
      voteCount: 0,
      replyCount: options.lines.length,
      answeredByInstructor: options.answered,
      createdAt,
    }
    questions.push(question)

    options.lines.forEach((line, index) => {
      const author =
        line.from === "instructor" && instructorUserId
          ? instructorUserId
          : pick(askersByCourse.get(options.course.id) ?? learnerIds)
      replies.push({
        id: `${options.id}_r${pad(index, 2)}`,
        questionId: options.id,
        authorId: author,
        body: line.body,
        // Measured from *now*, like the question itself — the earlier form
        // computed an offset from the question and inverted the order, so the
        // thread opened on its last reply.
        createdAt: ago(line.agoMinutes * 60 * 1000),
      })
    })

    // One row per voter, which is what `voteCount` is a cache of. Voters are
    // drawn from the course's own enrolment and de-duplicated, because the
    // table is uniquely keyed on (question, user).
    //
    // **It falls back to the whole learner pool when the course's own is too
    // small to supply a single voter.** At `SEED_MAX` a course often has one
    // enrolment — its asker — and the loop below then wrote no rows at all
    // while `voteCount` still claimed seven, which is a counter lying about a
    // table anyone can count.
    const enrolled = askersByCourse.get(options.course.id) ?? []
    const pool = enrolled.length > 1 ? enrolled : learnerIds
    const voters = new Set<string>()
    let guard = 0
    const wanted = Math.min(options.votes, Math.max(0, pool.length - 1))
    while (voters.size < wanted && guard < Math.max(8, wanted * 8)) {
      guard += 1
      const candidate = pick(pool)
      if (candidate !== options.askerId) voters.add(candidate)
    }
    for (const voter of voters) {
      votes.push({
        id: `${options.id}_v_${voter}`,
        questionId: options.id,
        userId: voter,
        createdAt,
      })
    }
    question.voteCount = voters.size
  }

  // -- the export's own three ----------------------------------------------
  for (const [index, seed] of cap(featuredQuestionSeeds).entries()) {
    const course = bySlug.get(seed.courseSlug)
    if (!course) continue
    const askers = askersByCourse.get(course.id)
    if (!askers || askers.length === 0) continue

    write({
      id: `${SEED}cq_f${pad(index, 2)}`,
      course,
      askerId: pick(askers),
      title: seed.title,
      body: seed.body,
      answered: seed.answered,
      votes: seed.votes,
      agoMinutes: seed.agoMinutes,
      lines: seed.replies,
    })
  }

  // -- generated, so the tabs and the pager have something to do -----------
  //
  // Spread across every course that has somebody enrolled, which is what makes
  // the course filter meaningful.
  let generated = 0
  for (const course of courses) {
    // The export's own three already count against the cap, so the generated
    // ones only make the list up to `SEED_MAX` rather than adding to it.
    if (questions.length >= SEED_MAX) break
    const askers = askersByCourse.get(course.id)
    if (!askers || askers.length === 0) continue

    for (let n = 0; n < QUESTIONS_PER_COURSE; n += 1) {
      if (questions.length >= SEED_MAX) break
      // Indexed by the running counter rather than per course, so the four
      // questions on one course are always four *different* subjects. Two
      // courses may share a title, which is what a real catalogue looks like
      // — the card draws the course beside it — so no "(2)" suffix is added.
      const subject = questionSubjects[generated % questionSubjects.length]!
      const answered = rng() < 0.55
      const replyCount = answered
        ? 1 + Math.floor(rng() * 3)
        : Math.floor(rng() * 2)

      const askedAgo = 60 * (2 + Math.floor(rng() * 24 * 40))
      const lines: {
        from: "instructor" | "learner"
        body: string
        agoMinutes: number
      }[] = []
      for (let r = 0; r < replyCount; r += 1) {
        // The instructor's answer comes last, which is what makes the
        // question answered — and what the thread page reads downward to.
        const isAnswer = answered && r === replyCount - 1
        lines.push({
          from: isAnswer ? "instructor" : "learner",
          body: isAnswer
            ? pick(instructorAnswerBodies)
            : pick(questionReplyBodies),
          // Spread between the question and now, oldest first — never before
          // the question it answers.
          agoMinutes: Math.max(
            1,
            Math.round((askedAgo * (replyCount - r)) / (replyCount + 1))
          ),
        })
      }

      write({
        id: `${SEED}cq_g${pad(generated, 4)}`,
        course,
        askerId: pick(askers),
        title: subject,
        body: `${subject.replace(/\?$/, "")} — asking here so the answer is in one place for the cohort.`,
        answered,
        votes: Math.floor(rng() * 14),
        agoMinutes: askedAgo,
        lines,
      })
      generated += 1
    }
  }

  await db.courseQuestion.createMany({ data: questions })
  // After the questions they hang off — both are required relations.
  for (let i = 0; i < replies.length; i += 500) {
    await db.courseQuestionReply.createMany({ data: replies.slice(i, i + 500) })
  }
  for (let i = 0; i < votes.length; i += 500) {
    await db.courseQuestionVote.createMany({ data: votes.slice(i, i + 500) })
  }

  return {
    questions: questions.length,
    replies: replies.length,
    votes: votes.length,
  }
}

// ---------------------------------------------------------------------------
// The developer's own workspace
// ---------------------------------------------------------------------------

/**
 * Courses, enrolments and Q&A for **every instructor profile the seed did not
 * create** — in practice, the one belonging to whoever is developing this.
 *
 * Every instructor surface hangs off `Course.instructorId`, so a profile with
 * no courses opens Q&A, My Courses, Students and Coupons on their empty
 * states. That is a correct rendering of an empty account and a useless one to
 * look at, which is what this fixes. It follows `seedNotifications`' own call
 * about admin accounts: the account a developer signs in with is usually their
 * own rather than a seeded one, so the seed writes for it too.
 *
 * Everything it writes carries the `seed_` prefix, so `clearSeededRows`
 * reclaims it on the next run — the profile itself is never touched.
 */
async function seedDeveloperWorkspace(
  categories: Map<string, string>,
  learners: LearnerRow[]
) {
  const owners = await db.instructor.findMany({
    where: { id: { not: { startsWith: SEED } } },
    orderBy: { id: "asc" },
    select: { id: true, userId: true },
  })
  if (owners.length === 0 || learners.length === 0) {
    return { owners: 0, courses: 0, questions: 0 }
  }

  const courses: CourseRow[] = []
  const questions: Prisma.CourseQuestionCreateManyInput[] = []
  const replies: Prisma.CourseQuestionReplyCreateManyInput[] = []
  const votes: Prisma.CourseQuestionVoteCreateManyInput[] = []
  const enrollments: Prisma.EnrollmentCreateManyInput[] = []
  const reviews: Prisma.CourseReviewCreateManyInput[] = []
  const reviewReplies: Prisma.CourseReviewReplyCreateManyInput[] = []
  // The money half, so the developer's own Revenue & Payouts page has
  // something in it — see `ownerEnrolmentSources`.
  const orders: Prisma.OrderCreateManyInput[] = []
  const orderItems: Prisma.OrderItemCreateManyInput[] = []
  const earnings: Prisma.InstructorEarningCreateManyInput[] = []
  const payoutMethods: Prisma.PayoutMethodCreateManyInput[] = []
  const payouts: Prisma.PayoutCreateManyInput[] = []

  for (const [ownerIndex, owner] of owners.entries()) {
    // `Instructor.userId` is nullable, and an instructor answer needs an
    // account to be written by — a profile with nobody behind it is not the
    // developer's own, which is the only case this exists for.
    const ownerUserId = owner.userId
    if (!ownerUserId) continue
    const own: { id: string; lessonIds: string[] }[] = []

    for (const [courseIndex, seed] of cap(ownerCourseSeeds).entries()) {
      const categoryId = categories.get(seed.categorySlug)
      if (!categoryId) continue

      const key = `${pad(ownerIndex, 2)}${pad(courseIndex, 2)}`
      const id = `${SEED}c_own_${key}`
      // Unique per owner, because `Course.slug` is: two developers sharing a
      // database would otherwise collide on the second one's first course.
      const slug = ownerIndex === 0 ? seed.slug : `${seed.slug}-${ownerIndex}`
      const status = seed.status ?? "PUBLISHED"
      const live = status === "PUBLISHED"
      // The catalog publishes backwards from today; the two unshipped courses
      // are recent instead, which is what puts them where My Courses sorts
      // (`updatedAt desc`) and gives its "Updated 4 hours ago" shape something
      // to render.
      // **The two live courses publish months apart**, not three weeks. The
      // gap used to be 20 days, which left every enrolment on the developer's
      // account inside one month — and the Analytics page's six-month chart
      // drawing one bar and five empty columns, since `seedDeveloperWorkspace`
      // clamps an enrolment to the day after its course went on sale. 95 days
      // keeps the first at the 30 the reviews below are dated against and
      // pushes the second back far enough for the series to have a shape.
      const publishedAt = ago((30 + courseIndex * 95) * DAY)
      const touchedAt = live ? publishedAt : ago((courseIndex - 1) * 6 * HOUR)
      const minutes = seed.lessons.length * 9
      // What the "% built" bar reads — see `ownerCourseSeeds`. A submitted
      // course has every lesson live, which is the state its own In-review row
      // is drawn in.
      const publishedLessons = seed.publishedLessons ?? seed.lessons.length

      await db.course.create({
        data: {
          id,
          slug,
          title: seed.title,
          subtitle: seed.subtitle,
          description: [
            `${seed.subtitle} Written for the seed so a fresh instructor profile has something to open.`,
          ],
          instructorId: owner.id,
          categoryId,
          level: LEVELS[seed.level],
          durationHours: Math.max(1, Math.round(minutes / 60)),
          priceCents: seed.priceCents,
          listPriceCents: seed.listPriceCents,
          requirements: ["No prior experience needed."],
          learningOutcomes: seed.lessons,
          videoHours: Math.max(1, Math.round(minutes / 60)),
          status,
          // A draft was never submitted to anybody; an in-review course was,
          // which is what the console's queue orders on.
          submittedAt: live
            ? new Date(publishedAt.getTime() - 6 * DAY)
            : status === "IN_REVIEW"
              ? ago(2 * DAY)
              : null,
          publishedAt: live ? publishedAt : null,
          createdAt: live ? publishedAt : ago(20 * DAY),
          updatedAt: touchedAt,
          lessonCount: seed.lessons.length,
          totalDurationMinutes: minutes,
          // Nobody can be enrolled in a course that has never been on sale, so
          // the counter and the rows below agree at zero.
          enrollmentCount: live ? Math.min(learners.length, SEED_MAX) : 0,
          sections: {
            create: {
              id: `${SEED}sec_own_${key}`,
              title: "Getting started",
              order: 0,
              lessons: {
                create: seed.lessons.map((title, order) => ({
                  id: `${SEED}les_own_${key}_${pad(order, 2)}`,
                  title,
                  type: "VIDEO" as const,
                  durationMinutes: 9,
                  order,
                  isPublished: order < publishedLessons,
                  isPreview: live && order === 0,
                })),
              },
            },
          },
        },
      })

      courses.push({
        id,
        slug,
        title: seed.title,
        priceCents: seed.priceCents,
        instructorId: owner.id,
        publishedAt,
      })
      // **Only published courses become Q&A anchors and take enrolments.** A
      // question needs a student, and a student needs a course that was on
      // sale; anchoring one to a draft would put a learner inside something
      // nobody could have bought.
      if (!live) continue
      own.push({
        id,
        lessonIds: seed.lessons.map(
          (_, order) => `${SEED}les_own_${key}_${pad(order, 2)}`
        ),
      })

      // **An `ADMIN_GRANT`, not a `PURCHASE`** — no order was placed, which is
      // the distinction `seedConversations` already draws about its own
      // enrolments. It is what makes these learners askers rather than
      // strangers to the course.
      const ratings: number[] = []
      for (const [seat, learner] of cap(learners).entries()) {
        const enrollmentId = `${SEED}enr_own_${key}_${learner.id.slice(-6)}`
        // **Progress is spread across the seats rather than left at the
        // column default**, because it is what the manage page's Course health
        // card averages for **Avg. watch time** — a pool of grants at 0 draws
        // an empty bar on the one account a developer actually signs in with,
        // which is the same gap the ratings below were added to close.
        // `completedAt` follows from 100 and nothing else, and is clamped to
        // now for the reason `seedCoupons` clamps its own dates.
        const progress = ownerProgress[seat % ownerProgress.length]!
        const source =
          ownerEnrolmentSources[seat % ownerEnrolmentSources.length]!
        // **Spread across the months since publication, not all on day one.**
        // Every seat used to enrol on `publishedAt + 1 day`, which drew the
        // Analytics page's six-month chart as one spike and five empty
        // columns. `ownerEnrolmentSpread` walks them backwards from the run so
        // the series has a shape, clamped so nobody enrols before the course
        // existed.
        const enrolledAt = new Date(
          Math.max(
            publishedAt.getTime() + DAY,
            NOW.getTime() -
              ownerEnrolmentSpread[seat % ownerEnrolmentSpread.length]! * DAY
          )
        )
        enrollments.push({
          id: enrollmentId,
          userId: learner.id,
          courseId: id,
          // **Not all `ADMIN_GRANT`.** These are grants rather than sales — no
          // order was placed, which is the distinction `seedConversations`
          // draws — but `FREE` and `BUSINESS_PLAN` are equally order-less, and
          // spreading the seats across the three is what gives the Analytics
          // page's "Where enrolments come from" card more than one row on the
          // account a developer signs in with. `PURCHASE` and `COUPON` are
          // deliberately not used: `Enrollment.orderId`'s own note says those
          // two carry an order "so a refund can find what to revoke", and one
          // without would be a lie in a table somebody reconciles money
          // against.
          source,
          progressPercent: progress,
          completedAt:
            progress === 100
              ? new Date(
                  Math.min(NOW.getTime(), enrolledAt.getTime() + 21 * DAY)
                )
              : null,
          // **Written, not left null.** Without it every one of these reads
          // "Not started" in the Students table's Last active column while
          // `progressPercent` says the learner is 40–100% through, and the
          // Analytics page — whose Completion rate and Avg. watch time are
          // measured over enrolments *active* in the window — had no cohort at
          // all and drew two em dashes. Never before the enrolment and never
          // after now.
          lastAccessedAt: new Date(
            Math.min(
              NOW.getTime(),
              enrolledAt.getTime() +
                ownerLastSeen[seat % ownerLastSeen.length]! * DAY
            )
          ),
          createdAt: enrolledAt,
        })

        // **A `PURCHASE` seat carries a real sale.** `Enrollment.orderId`'s own
        // note reserves that source for rows an order can be found from, and
        // the Revenue & Payouts page reads nothing *but* the ledger those
        // orders produce — so without this the whole surface is empty states
        // on the one account a developer signs in with. The status ladder is
        // `seedPurchases`' exactly (paid and swept, cleared, or still inside
        // its 30 days), so the two halves of the platform age money the same
        // way.
        if (source === "PURCHASE") {
          const orderId = `${SEED}o_own_${key}_${pad(seat, 2)}`
          const itemId = `${orderId}_i0`
          const net = Math.round((seed.priceCents * REVENUE_SHARE_BPS) / 10000)
          const clearsAt = new Date(enrolledAt.getTime() + 30 * DAY)
          orders.push({
            id: orderId,
            userId: learner.id,
            stripeSessionId: `cs_test_${orderId}`,
            stripePaymentIntentId: `pi_test_${orderId}`,
            status: "PAID",
            amountTotal: seed.priceCents,
            subtotalCents: seed.priceCents,
            discountCents: 0,
            email: learner.email,
            createdAt: enrolledAt,
            paidAt: enrolledAt,
          })
          orderItems.push({
            id: itemId,
            orderId,
            courseSlug: slug,
            courseId: id,
            title: seed.title,
            unitAmount: seed.priceCents,
            instructorId: owner.id,
            revenueShareBps: REVENUE_SHARE_BPS,
          })
          earnings.push({
            id: `${SEED}e_own_${key}_${pad(seat, 2)}`,
            instructorId: owner.id,
            courseId: id,
            orderItemId: itemId,
            source: "SALE",
            grossCents: seed.priceCents,
            platformFeeCents: seed.priceCents - net,
            netCents: net,
            status:
              clearsAt < ago(40 * DAY)
                ? "PAID"
                : clearsAt < NOW
                  ? "AVAILABLE"
                  : "PENDING",
            clearsAt,
            createdAt: enrolledAt,
          })
        }

        // Roughly two thirds of them leave one, which is what lights the row's
        // star chip and the Avg. rating tile on My Courses. Without any, both
        // draw an em dash on the one account a developer actually signs in
        // with — the same reason this whole function exists.
        if (seat % 3 === 2) continue
        const copy = pick(REVIEW_BODIES)
        const rating = rng() < 0.7 ? 5 : 4
        ratings.push(rating)
        const reviewId = `${SEED}rv_own_${key}_${pad(seat, 2)}`
        const writtenAt = ago((7 + seat * 5) * DAY)
        reviews.push({
          id: reviewId,
          courseId: id,
          userId: learner.id,
          enrollmentId,
          rating,
          title: copy.title,
          body: copy.body,
          createdAt: writtenAt,
        })

        // **Every other one is answered**, so the Reviews page opens on both
        // of the states `reviews-page.png` draws — "Reply" and "You replied"
        // with the reply inset beneath it — on the one account a developer
        // actually signs in with. The author is the owner, which is who the
        // `Instructor` pill on that block claims wrote it.
        if (seat % 2 !== 0) continue
        reviewReplies.push({
          id: `${SEED}rvr_own_${key}_${pad(seat, 2)}`,
          reviewId,
          authorId: ownerUserId,
          body: REVIEW_REPLIES[reviewReplies.length % REVIEW_REPLIES.length]!,
          createdAt: new Date(
            Math.min(NOW.getTime(), writtenAt.getTime() + 2 * DAY)
          ),
        })
      }

      // **The counters are the rows that were written**, never the figure the
      // seed asked for — the rule `CourseQuestion.voteCount` learned the hard
      // way. A learner pool smaller than the cap simply produces fewer.
      if (ratings.length > 0) {
        await db.course.update({
          where: { id },
          data: {
            // Written back explicitly: `updatedAt` is `@updatedAt`, so leaving
            // it out would stamp this housekeeping write onto the column My
            // Courses sorts on and draws — every seeded course would open
            // "Updated 1 minute ago" and the list would be in run order.
            updatedAt: touchedAt,
            reviewsCount: ratings.length,
            rating:
              Math.round(
                (ratings.reduce((sum, value) => sum + value, 0) /
                  ratings.length) *
                  10
              ) / 10,
          },
        })
      }
    }

    if (own.length === 0) continue

    // **Two payout destinations and two payouts, so the money surfaces are not
    // empty on a developer's own account.** `seedPayouts` writes both for the
    // *seeded* instructors only, which left this profile with no
    // `PayoutMethod` at all — Payout settings opened on its empty state, and
    // Revenue & Payouts had no primary method to name and no history to list.
    // The pair is the one `payout-settings-page.png` draws, for that export's
    // own reason: a page whose subject is a fallback chain has nothing to say
    // with a single row.
    const primaryMethodId = `${SEED}pm_own_${pad(ownerIndex, 2)}`
    payoutMethods.push(
      {
        id: primaryMethodId,
        instructorId: owner.id,
        type: "BANK_TRANSFER",
        label: "Monzo",
        last4: String(4471 + ownerIndex).slice(-4),
        currency: "usd",
        role: "PRIMARY",
        verifiedAt: ago(150 * DAY),
        createdAt: ago(160 * DAY),
      },
      {
        id: `${SEED}pm_own_${pad(ownerIndex, 2)}_backup`,
        instructorId: owner.id,
        type: "PAYPAL",
        // A PayPal address *is* the identifier, so there is no last-4 —
        // `methodDescription` draws a different second line for each type.
        label: `payouts+${ownerIndex}@lumen.co`,
        last4: null,
        role: "BACKUP",
        verifiedAt: ago(140 * DAY),
        createdAt: ago(145 * DAY),
      }
    )

    // Attached to the runs `seedPayouts` already created, because a payout is
    // "one instructor's slice of a run" (the model's own words) and inventing
    // a run of one would put a row in the admin console's Reports table that
    // no batch produced. **One paid and one failed**, which is what gives the
    // history table both of the pills the export draws — and a failed transfer
    // rolling into the next run is the behaviour `admin/reports.ts` already
    // describes.
    for (const [index, run] of ownerPayoutRuns.entries()) {
      const scheduledFor = new Date(
        Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - run.monthsBack, 1, 9)
      )
      const reference = `RUN-${scheduledFor.getUTCFullYear()}-${pad(
        scheduledFor.getUTCMonth() + 1,
        2
      )}`
      payouts.push({
        id: `${SEED}po_own_${pad(ownerIndex, 2)}_${index}`,
        reference: `PO-${reference.slice(4).replace("-", "")}-${9000 + ownerIndex * 10 + index}`,
        payoutRunId: `${SEED}run_${reference}`,
        instructorId: owner.id,
        payoutMethodId: primaryMethodId,
        amountCents: run.amountCents,
        status: run.failed ? "FAILED" : "PAID",
        failureReason: run.failed
          ? "The bank rejected the transfer: account details could not be verified."
          : null,
        paidAt: run.failed ? null : new Date(scheduledFor.getTime() + 3 * HOUR),
        createdAt: scheduledFor,
      })
    }

    for (const [index, seed] of cap(ownerQuestionSeeds).entries()) {
      const course = own[seed.courseIndex % own.length]!
      const qid = `${SEED}cq_own_${pad(ownerIndex, 2)}${pad(index, 2)}`
      const asker = learners[index % learners.length]!

      questions.push({
        id: qid,
        courseId: course.id,
        lessonId: course.lessonIds[index % course.lessonIds.length] ?? null,
        authorId: asker.id,
        title: seed.title,
        body: seed.body,
        voteCount: seed.votes,
        replyCount: seed.replies.length,
        answeredByInstructor: seed.answered,
        createdAt: ago(seed.agoMinutes * 60 * 1000),
      })

      seed.replies.forEach((line, replyIndex) => {
        const others = learners.filter((row) => row.id !== asker.id)
        replies.push({
          id: `${qid}_r${pad(replyIndex, 2)}`,
          questionId: qid,
          authorId:
            line.from === "instructor"
              ? ownerUserId
              : (others[replyIndex % Math.max(1, others.length)]?.id ??
                asker.id),
          body: line.body,
          // Measured from now, like the question — see `seedCourseQuestions`.
          createdAt: ago(line.agoMinutes * 60 * 1000),
        })
      })

      // One row per voter, which is what `voteCount` caches. Capped by the
      // pool: a vote needs a real account behind it.
      for (const voter of learners.slice(0, seed.votes)) {
        if (voter.id === asker.id) continue
        votes.push({
          id: `${qid}_v_${voter.id}`,
          questionId: qid,
          userId: voter.id,
          createdAt: ago(seed.agoMinutes * 60 * 1000),
        })
      }
    }
  }

  // Orders before their items and earnings, which are required relations on
  // them; methods before payouts, which point at one.
  await db.order.createMany({ data: orders })
  await db.orderItem.createMany({ data: orderItems })
  await db.instructorEarning.createMany({ data: earnings })
  await db.payoutMethod.createMany({ data: payoutMethods })
  await db.payout.createMany({ data: payouts })
  await db.enrollment.createMany({ data: enrollments })
  await db.courseReview.createMany({ data: reviews })
  await db.courseReviewReply.createMany({ data: reviewReplies })
  await db.courseQuestion.createMany({ data: questions })
  await db.courseQuestionReply.createMany({ data: replies })
  await db.courseQuestionVote.createMany({ data: votes })

  // `voteCount` is a cache of rows, so it has to be the number actually
  // written rather than the figure the seed asked for — a small learner pool
  // cannot supply nine distinct voters.
  for (const question of questions) {
    const written = votes.filter((row) => row.questionId === question.id).length
    if (written !== question.voteCount) {
      await db.courseQuestion.update({
        where: { id: question.id as string },
        data: { voteCount: written },
      })
    }
  }

  return {
    owners: owners.length,
    courses: courses.length,
    questions: questions.length,
  }
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

  const queuedCourses = await seedPendingCourses(
    categories,
    instructors,
    reviewerId
  )
  console.log(`queued courses    ${queuedCourses}`)

  // Before the purchases, not after: a redemption is an order, so the codes
  // have to exist for `seedPurchases` to attach them to real sales. See
  // `seedCoupons`.
  const listPriceBySlug = new Map(
    seededCourses.map((course) => [course.slug, cents(course.listPrice)])
  )
  const coupons = await seedCoupons(courses, listPriceBySlug)
  console.log(`coupons           ${coupons.length}`)

  const {
    enrollments,
    netByInstructor,
    orderCount,
    refundCount,
    redemptionCount,
  } = await seedPurchases(learners, courses, coupons)
  console.log(
    `orders            ${orderCount} (${refundCount} refunded, ${redemptionCount} used a coupon)`
  )
  console.log(`enrolments        ${enrollments.length}`)

  const reviews = await seedReviews(enrollments, courses, instructors)
  console.log(`reviews           ${reviews}`)

  await seedApplications(learners, reviewerId)

  const qa = await seedCourseQuestions(courses, learners, instructors)
  console.log(
    `course Q&A        ${qa.questions} questions, ${qa.replies} replies, ${qa.votes} votes`
  )

  // **Before `seedDeveloperWorkspace`, not after.** It is where the two
  // `PayoutRun` rows are created, and that function attaches the developer's
  // own payouts to them — a payout is "one instructor's slice of a run" (the
  // model's own words), so a run of one would put a batch in the console's
  // Reports table that nothing scheduled. It reads `netByInstructor`, which
  // `seedPurchases` produced well above, and draws no randomness, so moving it
  // earlier changes nothing else about the run.
  await seedPayouts(instructors, netByInstructor)

  const own = await seedDeveloperWorkspace(categories, learners)
  console.log(
    `your workspace    ${own.courses} courses, ${own.questions} questions ` +
      `across ${own.owners} non-seeded instructor profile(s)`
  )

  const community = await seedCommunity(learners, instructors, admins)
  console.log(
    `community         ${community.topics} topics, ${community.threads} threads, ` +
      `${community.replies} replies, ${community.moderators} moderator rows, ` +
      `${community.reports} reports`
  )

  const promotions = await seedPromotions(categories)
  console.log(`promotions        ${promotions}`)

  const notifications = await seedNotifications(instructors, courses)
  console.log(
    `notifications     ${notifications.admin} admin, ${notifications.learner} learner`
  )

  const conversations = await seedConversations(instructors, courses)
  console.log(
    `conversations     ${conversations.threads} threads, ${conversations.messages} messages`
  )

  const follows = await seedFollows(learners, instructors)
  console.log(`instructor follows ${follows}`)

  // **After `seedDeveloperWorkspace`**, because it reads the database for
  // every completed enrolment and that function writes more of them.
  const certificates = await seedCertificates()
  console.log(`certificates      ${certificates}`)

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
