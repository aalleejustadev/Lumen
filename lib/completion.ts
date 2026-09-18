import "server-only"

import { db } from "@/lib/db"
import { notifyCourseCompleted, notifyStudentCompleted } from "@/lib/notify"

/**
 * Finishing a course: progress, completion, and the certificate that follows.
 *
 * **Nothing wrote `LessonProgress` before this.** The column appeared exactly
 * once in the whole application, as a `count()` in `lib/course-player.ts`, so
 * `Enrollment.completedAt` was never set by anything a learner could do — and
 * because a certificate hangs off completion, `Certificate` had no writer
 * either. The certificates page, its stats, the streak, the public
 * verification page and the PNG download were all built against rows only
 * `prisma/seed.ts` produced.
 *
 * The chain this closes: complete a lesson → recount the enrolment → when the
 * last one lands, stamp `completedAt`, issue the certificate, send the
 * instructor's congratulations note and tell both sides.
 */

/** "LMN-DS-4665" — the printed id, matching `seedCertificates`' own shape so
 *  a seeded and an issued certificate are indistinguishable on the card. */
function buildSerial(categorySlug: string, seed: string): string {
  const letters = categorySlug
    .split("-")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2)
    .padEnd(2, "X")

  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `LMN-${letters}-${String(Math.abs(hash) % 10000).padStart(4, "0")}`
}

/**
 * The public verification slug.
 *
 * **Two FNV-1a passes, not a `hash * 31` loop** — the trap `seedCertificates`
 * records: the ids being hashed differ only in their last characters, and the
 * naive version produced slugs that did too, which is exactly the "guessable
 * from the serial" that `Certificate.publicSlug`'s own note rules out.
 */
function buildPublicSlug(seed: string): string {
  let a = 2166136261
  let b = 1099511628211
  for (let i = 0; i < seed.length; i += 1) {
    a ^= seed.charCodeAt(i)
    a = Math.imul(a, 16777619)
    b ^= seed.charCodeAt(seed.length - 1 - i)
    b = Math.imul(b, 16777619)
  }
  return (
    Math.abs(a).toString(36).padStart(7, "0") +
    Math.abs(b).toString(36).padStart(7, "0")
  ).slice(0, 14)
}

/** A percentage band, which is what the certificate's grade pill draws. */
function gradeFor(percent: number): string | null {
  if (percent >= 90) return "A"
  if (percent >= 80) return "B"
  if (percent >= 70) return "C"
  return null
}

/**
 * The instructor's closing note, sent the way the welcome one is.
 *
 * `Course.congratulationsMessage` is the other half of the pair that was
 * stored and never sent; completion is the event it names.
 */
async function sendCongratulations(input: {
  learnerUserId: string
  instructorUserId: string
  courseId: string
  body: string
}) {
  const existing = await db.conversation.findFirst({
    where: {
      courseId: input.courseId,
      AND: [
        { participants: { some: { userId: input.learnerUserId } } },
        { participants: { some: { userId: input.instructorUserId } } },
      ],
    },
    select: { id: true },
  })

  const conversationId =
    existing?.id ??
    (
      await db.conversation.create({
        data: {
          courseId: input.courseId,
          participants: {
            create: [
              { userId: input.learnerUserId },
              { userId: input.instructorUserId, lastReadAt: new Date() },
            ],
          },
        },
        select: { id: true },
      })
    ).id

  await db.message.create({
    data: {
      conversationId,
      senderId: input.instructorUserId,
      body: input.body,
    },
  })
  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  })
}

/**
 * Issue the certificate for a finished enrolment, once.
 *
 * `Certificate.enrollmentId` is unique, so a second call is a no-op rather
 * than a duplicate credential — the same idempotence every webhook-reachable
 * write here has.
 */
async function issueCertificate(enrollmentId: string) {
  const existing = await db.certificate.findUnique({
    where: { enrollmentId },
    select: { publicSlug: true },
  })
  if (existing) return existing.publicSlug

  const enrolment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      userId: true,
      progressPercent: true,
      course: {
        select: { id: true, title: true, category: { select: { slug: true } } },
      },
    },
  })
  if (!enrolment) return null

  const serial = buildSerial(enrolment.course.category.slug, enrolment.id)
  const publicSlug = buildPublicSlug(enrolment.id + enrolment.course.id)

  try {
    await db.certificate.create({
      data: {
        serial,
        publicSlug,
        enrollmentId: enrolment.id,
        userId: enrolment.userId,
        courseId: enrolment.course.id,
        grade: gradeFor(enrolment.progressPercent),
        scorePercent: enrolment.progressPercent,
      },
    })
  } catch {
    // Lost a race, or a serial collided. Either way the credential either
    // exists or can be re-issued on the next completion read; never throw at
    // a learner who has just finished a course.
    return (
      (
        await db.certificate.findUnique({
          where: { enrollmentId },
          select: { publicSlug: true },
        })
      )?.publicSlug ?? null
    )
  }

  return publicSlug
}

/**
 * Recount an enrolment from its `LessonProgress` rows and, if that finishes
 * the course, close it out.
 *
 * **The counters are rewritten from the rows, never incremented.** A counter
 * that drifts is wrong on four screens at once — the rule
 * `CourseQuestion.voteCount` learned the hard way and the seed's own note
 * states: a counter is the number of rows written.
 *
 * `progressPercent` is completed lessons over total here, which is a
 * deliberate simplification of what the column documents (time-weighted, from
 * watch seconds). Nothing measures watch time yet; when something does, this
 * is the one place that changes.
 */
export async function recountEnrolment(enrollmentId: string): Promise<void> {
  const enrolment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      userId: true,
      completedAt: true,
      course: {
        select: {
          id: true,
          title: true,
          congratulationsMessage: true,
          instructor: { select: { userId: true } },
          sections: { select: { lessons: { select: { id: true } } } },
        },
      },
    },
  })
  if (!enrolment) return

  const total = enrolment.course.sections.reduce(
    (sum, section) => sum + section.lessons.length,
    0
  )
  const done = await db.lessonProgress.count({
    where: { enrollmentId: enrolment.id, NOT: { completedAt: null } },
  })

  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const finished = total > 0 && done >= total
  // Only stamped on the transition, so a re-count never moves the date on a
  // course somebody finished last year.
  const completedAt = enrolment.completedAt ?? (finished ? new Date() : null)

  await db.enrollment.update({
    where: { id: enrolment.id },
    data: {
      completedLessons: done,
      progressPercent: percent,
      lastAccessedAt: new Date(),
      completedAt,
    },
  })

  // Everything below is the *transition* into completion, so it runs once.
  if (!finished || enrolment.completedAt) return

  const publicSlug = await issueCertificate(enrolment.id)

  const learner = await db.user.findUnique({
    where: { id: enrolment.userId },
    select: { name: true, email: true },
  })
  const learnerName = learner?.name?.trim() || learner?.email || "A student"

  const closing = enrolment.course.congratulationsMessage?.trim()
  if (closing && enrolment.course.instructor.userId) {
    await sendCongratulations({
      learnerUserId: enrolment.userId,
      instructorUserId: enrolment.course.instructor.userId,
      courseId: enrolment.course.id,
      body: closing,
    }).catch((error) => {
      console.error("[completion] congratulations message failed", error)
    })
  }

  await notifyCourseCompleted({
    learnerUserId: enrolment.userId,
    courseId: enrolment.course.id,
    courseTitle: enrolment.course.title,
    certificateSlug: publicSlug,
  })
  await notifyStudentCompleted({
    instructorUserId: enrolment.course.instructor.userId,
    learnerUserId: enrolment.userId,
    learnerName,
    courseId: enrolment.course.id,
    courseTitle: enrolment.course.title,
  })
}

/**
 * Mark one lesson complete (or not) for a learner, then recount.
 *
 * Idempotent in both directions: the unique on `(enrollmentId, lessonId)` is
 * what makes a second click write the same row rather than a second one.
 */
export async function setLessonComplete(input: {
  enrollmentId: string
  lessonId: string
  complete: boolean
}): Promise<void> {
  const completedAt = input.complete ? new Date() : null

  await db.lessonProgress.upsert({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: input.enrollmentId,
        lessonId: input.lessonId,
      },
    },
    create: {
      enrollmentId: input.enrollmentId,
      lessonId: input.lessonId,
      completedAt,
    },
    update: { completedAt },
  })

  await recountEnrolment(input.enrollmentId)
}
