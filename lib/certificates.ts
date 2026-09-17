import { getSession } from "@/lib/auth"
import { CERTIFICATES_PAGE_SIZE } from "@/lib/config/certificates"
import { db } from "@/lib/db"

/**
 * The reads behind `/dashboard/certificates` and the public verification page
 * at `/certificates/[slug]`.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy and the page size live in `lib/config/certificates.ts` so
 * the one client leaf can import them freely.
 *
 * **Nothing on the page is demo data and it needed no migration.**
 * `Certificate` was shaped for this export down to the sentences: `serial` is
 * "the printed ID, human-facing and quoted on the card, so it is stored rather
 * than derived from the cuid", and `publicSlug` is "the Share button's
 * destination — a public verification page, so it must not be guessable from
 * the serial". What nothing had was a single row: no completion flow issues
 * certificates, so `seedCertificates` is the stand-in.
 *
 * Five definitions decide what the page means, and the export settles none of
 * them:
 *
 *  - **"Certificates Earned" is the row count**, which makes it the one tile
 *    that is also the length of the list beneath it — so the headline and the
 *    pager's total can never disagree.
 *  - **"Hours Completed" is the *certified* courses' own length**, summed from
 *    `Course.totalDurationMinutes`, not watch time. A certificate attests to
 *    finishing a course, so the hours it is worth are the course's, and that
 *    is the figure a learner would put on a CV. Watch time is
 *    `Enrollment.progressPercent`' business and the instructor's Analytics
 *    page already draws it under its own name.
 *  - **"Longest Streak" is the longest run of consecutive days on which any
 *    lesson was completed** — over `LessonProgress.completedAt`, which is the
 *    only per-day record a learner has. It is deliberately not a streak of
 *    *certificates* (nobody finishes a course a day) and not of sessions
 *    (`Session.updatedAt` is refreshed by the framework, not by studying).
 *    Days are counted in UTC so the run cannot break when a learner travels.
 *  - **Only certificates whose course still exists are listed**, which
 *    `Certificate.course` being a required relation already guarantees — the
 *    row cascades with the course. Worth knowing because it means a deleted
 *    course silently removes a credential; if that ever matters, the fix is to
 *    denormalise the title the way `ContentReport.targetLabel` does.
 *  - **Newest first.** A credential list is a CV, and the thing you earned
 *    most recently is the thing you want to hand over.
 */

export type CertificateRow = {
  id: string
  /** The printed ID, e.g. "LMN-DS-4821". */
  serial: string
  publicSlug: string
  courseTitle: string
  instructorName: string
  /** Already written, e.g. "Aug 12, 2026" — see `CertificatesPage`. */
  issuedOn: string
  /** `Certificate.grade` is nullable; the banner drops its pill when it is. */
  grade: string | null
  categorySlug: string
  categoryAccent: string
  thumbnailUrl: string | null
}

export type CertificatesPage = {
  rows: CertificateRow[]
  stats: {
    earned: number
    /** Whole hours, from the certified courses' own length. */
    hours: number
    /** Consecutive days — the tile writes it as "46d". */
    streakDays: number
  }
  total: number
  page: number
  pageCount: number
}

export type PublicCertificate = {
  serial: string
  holderName: string
  courseTitle: string
  instructorName: string
  issuedOn: string
  grade: string | null
  scorePercent: number | null
  categorySlug: string
  categoryAccent: string
  thumbnailUrl: string | null
}

const DAY = 24 * 60 * 60 * 1000

/** "Aug 12, 2026" — the export's own spelling. */
const issuedFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
})

/** What every read selects, so the card and the verification page cannot
 *  disagree about what a certificate *is*. */
const certificateSelect = {
  id: true,
  serial: true,
  publicSlug: true,
  grade: true,
  scorePercent: true,
  issuedAt: true,
  user: { select: { name: true, email: true } },
  course: {
    select: {
      title: true,
      thumbnailUrl: true,
      instructor: { select: { name: true } },
      category: { select: { slug: true, accentColor: true } },
    },
  },
} as const

/**
 * The longest run of consecutive days with a completed lesson.
 *
 * A raw query rather than `findMany`, for `getRevenueByMonth`' reason: the
 * alternative pulls one row per lesson a learner has ever finished across the
 * wire to produce a single integer, where `date_trunc` + `DISTINCT` returns
 * one row per *day*. The run itself is walked in JS, which SQL can do with a
 * window function and nobody can read afterwards.
 */
async function longestStreak(userId: string): Promise<number> {
  const rows = await db.$queryRaw<{ day: Date }[]>`
    SELECT DISTINCT date_trunc('day', lp."completedAt" AT TIME ZONE 'UTC') AS day
    FROM "lesson_progress" lp
    JOIN "enrollment" e ON e.id = lp."enrollmentId"
    WHERE e."userId" = ${userId} AND lp."completedAt" IS NOT NULL
    ORDER BY 1
  `
  if (rows.length === 0) return 0

  // `date_trunc(... AT TIME ZONE 'UTC')` returns a naive timestamp, which the
  // driver hands back as a local-time Date — rebuilding each key from its UTC
  // parts is what keeps the day-to-day arithmetic exact across a DST boundary.
  const days = rows.map((row) =>
    Date.UTC(row.day.getFullYear(), row.day.getMonth(), row.day.getDate())
  )

  let longest = 1
  let run = 1
  for (let index = 1; index < days.length; index += 1) {
    run = days[index]! - days[index - 1]! === DAY ? run + 1 : 1
    if (run > longest) longest = run
  }
  return longest
}

export async function getCertificatesPage(
  page: number
): Promise<CertificatesPage | null> {
  const session = await getSession()
  if (!session) return null

  const userId = session.user.id
  const where = { userId }

  const [total, hours, streakDays] = await Promise.all([
    db.certificate.count({ where }),
    // The certified courses' own length. `groupBy` on the certificate's course
    // rather than a sum over a join, because two certificates can never share
    // a course — `Certificate.enrollmentId` is unique and an enrolment is
    // unique per (user, course).
    db.course.aggregate({
      where: { certificates: { some: { userId } } },
      _sum: { totalDurationMinutes: true },
    }),
    longestStreak(userId),
  ])

  const pageCount = Math.max(1, Math.ceil(total / CERTIFICATES_PAGE_SIZE))
  const current = Math.min(Math.max(1, page), pageCount)

  const rows = await db.certificate.findMany({
    where,
    // `id` breaks ties so two issued in the same seed run cannot swap between
    // pages.
    orderBy: [{ issuedAt: "desc" }, { id: "asc" }],
    skip: (current - 1) * CERTIFICATES_PAGE_SIZE,
    take: CERTIFICATES_PAGE_SIZE,
    select: certificateSelect,
  })

  return {
    rows: rows.map((row) => ({
      id: row.id,
      serial: row.serial,
      publicSlug: row.publicSlug,
      courseTitle: row.course.title,
      instructorName: row.course.instructor.name,
      issuedOn: issuedFormat.format(row.issuedAt),
      grade: row.grade,
      categorySlug: row.course.category.slug,
      categoryAccent: row.course.category.accentColor,
      thumbnailUrl: row.course.thumbnailUrl,
    })),
    stats: {
      earned: total,
      hours: Math.round((hours._sum.totalDurationMinutes ?? 0) / 60),
      streakDays,
    },
    total,
    page: current,
    pageCount,
  }
}

/**
 * One certificate by its public slug, for `/certificates/[slug]`.
 *
 * **No session is required and none is read.** That is the point of the page:
 * an employer following a shared link has no Lumen account, and a credential
 * nobody but its holder can check verifies nothing. It is also why the slug is
 * separate from the serial — see `Certificate.publicSlug`'s own note — so
 * quoting an ID on a CV does not hand over a working link to it.
 *
 * The **holder's name** is the one piece of personal data this returns, and it
 * is the piece a verification page exists to state. Nothing else about the
 * account crosses: no email, no other certificate, no way to walk from one
 * credential to another.
 */
export async function getPublicCertificate(
  slug: string
): Promise<PublicCertificate | null> {
  const row = await db.certificate.findUnique({
    where: { publicSlug: slug },
    select: certificateSelect,
  })
  if (!row) return null

  return {
    serial: row.serial,
    holderName: row.user.name?.trim() || row.user.email,
    courseTitle: row.course.title,
    instructorName: row.course.instructor.name,
    issuedOn: issuedFormat.format(row.issuedAt),
    grade: row.grade,
    scorePercent: row.scorePercent,
    categorySlug: row.course.category.slug,
    categoryAccent: row.course.category.accentColor,
    thumbnailUrl: row.course.thumbnailUrl,
  }
}
