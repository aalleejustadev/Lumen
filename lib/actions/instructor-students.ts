"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import {
  MESSAGE_ALL_LIMIT,
  STUDENTS_EXPORT_LIMIT,
  studentStatusLabel,
} from "@/lib/config/instructor-students"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import { getAllStudents, parseStudentsQuery } from "@/lib/instructor-students"
import { startConversation } from "@/lib/actions/messages"

/**
 * The three writes behind `/dashboard/instructor/students`.
 *
 * All three **re-resolve the instructor from the session and re-scope every
 * row by `instructorId`**, and none of them trusts an id the browser sent. A
 * Server Action is a public endpoint, and the ids on this page name other
 * people's accounts — an action that acted on the one it was handed would let
 * any instructor message, or export, somebody else's cohort. It is the check
 * `lib/actions/instructor-payouts.ts` makes inline for the same reason.
 *
 * The filter arrives as the **raw query string** rather than a parsed object,
 * so it goes back through `parseStudentsQuery` here: a caller cannot hand in a
 * shape that skipped the caps.
 */

export type StudentsActionResult = { ok: boolean; message: string }

const MESSAGE_MAX = 4000

/** The filter as it travels from the board to an action. */
export type StudentsFilter = {
  tab?: string
  course?: string
  q?: string
}

// ---------------------------------------------------------------------------
// Export CSV
// ---------------------------------------------------------------------------

export type StudentsCsvResult = {
  ok: boolean
  message: string
  csv?: string
  /** True when `STUDENTS_EXPORT_LIMIT` bit, so the toast can say so rather
   *  than handing over a quietly short file — `admin-audit.ts`' rule. */
  truncated?: boolean
  rows?: number
}

/**
 * **Exports what is on screen, not the whole table** — the filter row exists to
 * narrow a list, and the export follows it, which is the call
 * `lib/actions/admin-audit.ts` already made about the audit log.
 *
 * Progress is written as a plain integer percent and the dates as ISO, not as
 * the table's "3 weeks ago": a relative stamp says nothing in a file that
 * outlives the moment it was saved.
 */
export async function exportStudentsCsv(
  filter: StudentsFilter
): Promise<StudentsCsvResult> {
  const query = parseStudentsQuery(filter)
  const rows = await getAllStudents(query, STUDENTS_EXPORT_LIMIT + 1)
  if (rows === null) {
    return { ok: false, message: "You need a teaching profile to do that." }
  }

  const truncated = rows.length > STUDENTS_EXPORT_LIMIT
  const kept = truncated ? rows.slice(0, STUDENTS_EXPORT_LIMIT) : rows

  const header = [
    "Student",
    "Email",
    "Course",
    "Progress %",
    "Lessons completed",
    "Lessons total",
    "Status",
    "Last active",
  ]
  const body = kept.map((row) => [
    row.name,
    row.email,
    row.courseTitle,
    String(row.progressPercent),
    String(row.completedLessons),
    String(row.totalLessons),
    studentStatusLabel[row.status],
    row.lastActive,
  ])

  return {
    ok: true,
    message: "",
    csv: [header, ...body]
      .map((line) => line.map(csvCell).join(","))
      .join("\n"),
    truncated,
    rows: kept.length,
  }
}

/**
 * RFC 4180 quoting, and a guard against the one thing a CSV export can do that
 * a table cannot: a cell beginning `=`, `+`, `-` or `@` is run as a **formula**
 * by Excel and Sheets, and these cells hold names an unknown person typed into
 * a sign-up form. Prefixing a single quote is the documented defusal.
 */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export type OpenConversationResult = StudentsActionResult & {
  conversationId?: string
}

/**
 * The trailing mail button on a row — opens the thread with that student about
 * that course.
 *
 * It takes the **enrolment** id rather than a user id and a course id, and
 * resolves both from it under this instructor's own courses: the enrolment is
 * the row, and looking it up that way is what proves the pair before anything
 * is written, rather than trusting two ids the browser sent.
 *
 * Then it **hands over to `startConversation`** rather than opening the thread
 * itself. That function runs `resolvePairing` again, reuses an existing thread
 * instead of duplicating it and revalidates the inbox, and it is what every
 * other entry into the messaging system already calls — a second
 * implementation here would be a second answer to "does this conversation
 * already exist", which is exactly what `lib/messages.ts` keeps in one place.
 */
export async function openStudentConversation(
  enrollmentId: string
): Promise<OpenConversationResult> {
  const found = await ownedEnrolment(enrollmentId)
  if (!found)
    return { ok: false, message: "That student isn't in your cohort." }

  return startConversation(
    "INSTRUCTOR",
    found.enrolment.userId,
    found.enrolment.courseId
  )
}

export type MessageAllResult = StudentsActionResult & { sent?: number }

/**
 * **Message all** — one message into every student matching the current
 * filter.
 *
 * Three things make it safe to offer at all:
 *
 *  - **It is capped at `MESSAGE_ALL_LIMIT`**, and the dialog has already told
 *    the instructor how many it will reach. See that constant.
 *  - **The recipients are read server-side from the filter**, never sent by
 *    the browser, so the page cannot be talked into messaging somebody who is
 *    not enrolled — the posture `addWishlistToCart` takes with its own rows.
 *  - **A thread is reused, never duplicated.** A learner already talking to
 *    you about a course gets the message in that conversation rather than a
 *    second one beside it, which is what `startConversation` does for a single
 *    recipient and what `Conversation.courseId` makes answerable.
 *
 * It is deliberately **not** a transaction. A bulk send that fails on recipient
 * 180 should leave the first 179 delivered and say how many landed, because
 * the alternative is rolling back messages people have already been notified
 * about; the count it reports is the number of rows that actually landed, the
 * rule the seed's own counters follow.
 */
export async function messageAllStudents(
  filter: StudentsFilter,
  body: string
): Promise<MessageAllResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to send a message." }

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) {
    return { ok: false, message: "You need a teaching profile to do that." }
  }

  const text = body.trim().slice(0, MESSAGE_MAX)
  if (text === "") return { ok: false, message: "Write a message first." }

  const query = parseStudentsQuery(filter)
  const rows = await getAllStudents(query, MESSAGE_ALL_LIMIT)
  if (rows === null) {
    return { ok: false, message: "You need a teaching profile to do that." }
  }
  if (rows.length === 0) {
    return { ok: false, message: "No student matches that filter." }
  }

  const meId = session.user.id
  // One query for every thread that already exists across these courses, so
  // the loop below is a write per recipient rather than a read *and* a write.
  const existing = new Map<string, string>(
    (
      await db.conversation.findMany({
        where: {
          courseId: { in: [...new Set(rows.map((row) => row.courseId))] },
          participants: { some: { userId: meId } },
        },
        select: {
          id: true,
          courseId: true,
          participants: { select: { userId: true } },
        },
      })
    ).flatMap((conversation) =>
      conversation.participants
        .filter((participant) => participant.userId !== meId)
        .map((participant): [string, string] => [
          `${participant.userId}:${conversation.courseId}`,
          conversation.id,
        ])
    )
  )

  let sent = 0
  for (const row of rows) {
    // Never message yourself, which an instructor enrolled in their own course
    // would otherwise do — `resolvePairing` refuses that pair outright.
    if (row.userId === meId) continue
    try {
      const key = `${row.userId}:${row.courseId}`
      const conversationId =
        existing.get(key) ??
        (
          await db.conversation.create({
            data: {
              courseId: row.courseId,
              participants: {
                create: [
                  { userId: meId, lastReadAt: new Date() },
                  { userId: row.userId },
                ],
              },
            },
            select: { id: true },
          })
        ).id

      await db.message.create({
        data: { conversationId, senderId: meId, body: text },
      })
      sent += 1
    } catch {
      // One bad recipient must not cost the rest — see the note above.
    }
  }

  revalidatePath("/dashboard/instructor/messages", "layout")
  return {
    ok: sent > 0,
    message:
      sent === 0
        ? "Nothing was sent."
        : `Sent to ${sent} ${sent === 1 ? "student" : "students"}.`,
    sent,
  }
}

/**
 * Resolves an enrolment id **under the caller's own courses**, which is the
 * ownership check rather than a comparison made afterwards. A row from another
 * instructor's cohort comes back as nothing.
 */
async function ownedEnrolment(enrollmentId: string) {
  const session = await getSession()
  if (!session) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  const enrolment = await db.enrollment.findFirst({
    where: { id: enrollmentId, course: { instructorId: profile.id } },
    select: { userId: true, courseId: true },
  })
  if (!enrolment) return null

  return { meId: session.user.id, enrolment }
}
