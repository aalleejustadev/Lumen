import { format } from "date-fns"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import { initialsOf } from "@/lib/user"
import {
  CONVERSATION_LIMIT,
  MESSAGE_SEARCH_MAX,
  PRESENCE_WINDOW_HOURS,
  THREAD_MESSAGE_LIMIT,
  type MessageAudience,
} from "@/lib/config/messages"
import type { Prisma } from "@/lib/generated/prisma/client"

/**
 * The reads behind the Messages page, in **both** modes — the learner's
 * `/dashboard/messages` and the instructor's `/dashboard/instructor/messages`
 * are one query path with a different `audience`, the arrangement
 * `lib/notification-feed.ts` already has.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy and the limits live in `lib/config/messages.ts` so the
 * list and the composer can import them freely.
 *
 * Five things decide what this module means:
 *
 *  - **`resolvePairing` is the whole permission rule, and it lives here once.**
 *    An instructor may write to somebody enrolled in a course they teach, and
 *    a learner to the instructor of a course they are enrolled in — that is
 *    the same sentence read from either end, so it is one function. The
 *    New-message dialog's list, the composer's writable flag and
 *    `lib/actions/messages.ts`' every write all consult it, which is what
 *    stops the page offering a conversation the action would then refuse —
 *    the arrangement `canTeach` has with the instructor shell's guard.
 *  - **`Conversation.courseId` is what authorises the pair**, so a thread is
 *    always *about* a course. That is also why the audience needs no column
 *    of its own: the course carries its instructor, so which side you are
 *    standing on is a fact the rows answer. See `MessageAudience`.
 *  - **Unread is counted, never stored** — messages sent after
 *    `ConversationParticipant.lastReadAt` by somebody other than you. The
 *    model's own docstring asks for exactly that, and gives the reason: a
 *    stored integer drifts the first time a write fails halfway.
 *  - **Losing enrolment closes a thread, it does not delete one.** A refund
 *    revokes the enrolment that authorised the pair, so the composer goes
 *    inert with the reason on it while the history stays readable. Destroying
 *    the history instead would be the one thing an audit-shaped table must
 *    never do.
 *  - **Timestamps are formatted here, on the server**, and cross as strings,
 *    measured against one `now` captured at the top of the read. Both of the
 *    audit log's reasons apply: it keeps `date-fns` out of the client bundle,
 *    and a relative time computed on both sides of the boundary is a
 *    hydration mismatch waiting for a row to sit on a minute boundary.
 */

export type MessagesQuery = {
  /** `?c=` — which thread is open. Resolved against the reader's own rows, so
   *  a hand-edited id opens nothing rather than somebody else's inbox. */
  conversationId: string | null
  search: string
}

export type Counterpart = {
  id: string
  name: string
  image: string | null
  initials: string
  /** A session refreshed inside `PRESENCE_WINDOW_HOURS` — see that constant. */
  online: boolean
}

export type ConversationSummary = {
  id: string
  counterpart: Counterpart
  courseTitle: string | null
  /** The last message's body, whoever sent it. Empty for a thread with none. */
  preview: string
  /** "20m", "1h", "4h", "1d" — the export's own compact form. */
  age: string
  unread: number
}

export type ThreadMessage = {
  id: string
  body: string
  /** "10:10 AM". */
  time: string
  /** Drawn as the dark right-hand bubble rather than the white left-hand one. */
  mine: boolean
}

export type ActiveThread = {
  id: string
  counterpart: Counterpart
  courseTitle: string | null
  messages: ThreadMessage[]
  /** False once the enrolment behind the pair has ended — see the module note. */
  writable: boolean
}

export type MessagesPage = {
  conversations: ConversationSummary[]
  active: ActiveThread | null
  /** Across the whole inbox, not the current search: it is a count of work
   *  outstanding, and narrowing it by a filter the reader just typed would
   *  make the number jump about for no reason. */
  unread: number
  query: MessagesQuery
}

// ---------------------------------------------------------------------------
// The permission rule
// ---------------------------------------------------------------------------

export type Pairing = {
  courseId: string
  courseTitle: string
  instructorUserId: string
  learnerUserId: string
}

/**
 * Whether these two people may hold a conversation about this course, and
 * which of them is the teacher.
 *
 * The one gate. Every surface that offers a conversation and every action that
 * writes into one calls it, so "who may message whom" has exactly one answer.
 *
 * The test is an `Enrollment` row on one side and `Course.instructorId` on the
 * other — never a role string. `Instructor.userId` is nullable, so a teaching
 * profile with no account behind it simply cannot be written to, which is the
 * honest outcome rather than a thread nobody can read.
 */
export async function resolvePairing(
  meId: string,
  counterpartId: string,
  courseId: string
): Promise<Pairing | null> {
  if (meId === counterpartId) return null

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      instructor: { select: { userId: true } },
      // Both candidates' enrolments in the same row. Which of the two is the
      // learner depends on which is the instructor, and that is decided from
      // this very result — so asking about both here is one round trip where
      // deciding first and then checking would be two.
      enrollments: {
        where: { userId: { in: [meId, counterpartId] } },
        select: { userId: true },
      },
    },
  })
  const instructorUserId = course?.instructor.userId
  if (!course || !instructorUserId) return null

  // Exactly one of the two has to be the course's instructor; the other is
  // then the person whose enrolment we check.
  let learnerUserId: string
  if (instructorUserId === meId) learnerUserId = counterpartId
  else if (instructorUserId === counterpartId) learnerUserId = meId
  else return null

  if (!course.enrollments.some((row) => row.userId === learnerUserId)) {
    return null
  }

  return {
    courseId,
    courseTitle: course.title,
    instructorUserId,
    learnerUserId,
  }
}

// ---------------------------------------------------------------------------
// Query string
// ---------------------------------------------------------------------------

/**
 * Turns whatever arrived in the URL into a query this module will act on.
 *
 * Selection and search both live in the query string rather than in `useState`
 * for the reason the notification feed's do: an open thread is then a link you
 * can paste, the back button walks it, and a reload keeps it. The id is not
 * trusted here — it is only resolved against the reader's own participant rows
 * further down.
 */
export function parseMessagesQuery(params: {
  c?: string | string[]
  q?: string | string[]
}): MessagesQuery {
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const conversationId = (one(params.c) ?? "").trim()
  return {
    conversationId: conversationId === "" ? null : conversationId.slice(0, 64),
    search: (one(params.q) ?? "").trim().slice(0, MESSAGE_SEARCH_MAX),
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * "20m", "1h", "4h", "1d" — the export's own compact ages, which `date-fns`'
 * `formatDistanceStrict` ("20 minutes") will not produce and which would not
 * fit the 40px the row leaves for them anyway.
 */
function compactAge(then: Date, now: Date) {
  const seconds = Math.max(
    0,
    Math.round((now.getTime() - then.getTime()) / 1000)
  )
  if (seconds < 60) return "now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 52) return `${weeks}w`
  return `${Math.floor(days / 365)}y`
}

/** The audience filter. See `MessageAudience` for why it is derived from the
 *  course rather than stored. */
function audienceWhere(
  audience: MessageAudience,
  instructorProfileId: string | null
): Prisma.ConversationWhereInput {
  if (audience === "INSTRUCTOR") {
    // No profile means no courses taught, so no thread can qualify. `null`
    // would match every conversation whose course is unset, which is the
    // opposite of what this asks.
    return instructorProfileId
      ? { course: { is: { instructorId: instructorProfileId } } }
      : { id: { in: [] } }
  }
  // Everything that is *not* about a course I teach. A relation filter does
  // not match a null relation, so a thread whose course has since been deleted
  // lands here — read-only, which is what it is.
  return instructorProfileId
    ? { NOT: { course: { is: { instructorId: instructorProfileId } } } }
    : {}
}

/**
 * The per-conversation "unread" cutoff, as one `where` rather than a query per
 * row: each branch is that thread's own `lastReadAt`, and a participant who
 * has never opened a thread has every message in it unread.
 */
function unreadWhere(
  rows: { conversationId: string; lastReadAt: Date | null }[],
  meId: string
): Prisma.MessageWhereInput | null {
  if (rows.length === 0) return null
  return {
    deletedAt: null,
    senderId: { not: meId },
    OR: rows.map((row) => ({
      conversationId: row.conversationId,
      ...(row.lastReadAt ? { sentAt: { gt: row.lastReadAt } } : {}),
    })),
  }
}

/** Who has a live session refreshed inside the presence window. See
 *  `PRESENCE_WINDOW_HOURS` for what the dot is actually claiming. */
async function presentUsers(userIds: string[], now: Date) {
  if (userIds.length === 0) return new Set<string>()
  const since = new Date(now.getTime() - PRESENCE_WINDOW_HOURS * 60 * 60 * 1000)
  const sessions = await db.session.findMany({
    where: {
      userId: { in: userIds },
      expiresAt: { gt: now },
      updatedAt: { gt: since },
    },
    select: { userId: true },
    distinct: ["userId"],
  })
  return new Set(sessions.map((session) => session.userId))
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

export async function getMessagesPage(
  audience: MessageAudience,
  query: MessagesQuery
): Promise<MessagesPage | null> {
  const session = await getSession()
  if (!session) return null

  const meId = session.user.id
  const now = new Date()
  const profile = await getInstructorProfile(meId)
  const scope = audienceWhere(audience, profile?.id ?? null)
  const mine: Prisma.ConversationWhereInput = {
    participants: { some: { userId: meId } },
    ...scope,
  }

  // A search field that only decorates is the promise `dashboard-search.tsx`
  // refuses to make, so this matches the three things "search conversations"
  // can sensibly mean: who it is with, what it is about, and what was said.
  const searched: Prisma.ConversationWhereInput = query.search
    ? {
        ...mine,
        OR: [
          {
            participants: {
              some: {
                userId: { not: meId },
                user: {
                  name: { contains: query.search, mode: "insensitive" },
                },
              },
            },
          },
          {
            course: {
              is: { title: { contains: query.search, mode: "insensitive" } },
            },
          },
          {
            messages: {
              some: {
                deletedAt: null,
                body: { contains: query.search, mode: "insensitive" },
              },
            },
          },
        ],
      }
    : mine

  // **Wave one.** The visible list and the reader's own participant rows are
  // independent, so they go together. The participant rows are deliberately
  // *not* narrowed by the search: they are what the whole-inbox unread total
  // is counted from, and a number that fell every time somebody typed would
  // be measuring the wrong thing.
  const [rows, myRows] = await Promise.all([
    db.conversation.findMany({
      where: searched,
      orderBy: { lastMessageAt: "desc" },
      take: CONVERSATION_LIMIT,
      select: {
        id: true,
        lastMessageAt: true,
        course: { select: { id: true, title: true } },
        participants: {
          select: {
            userId: true,
            lastReadAt: true,
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { sentAt: "desc" },
          take: 1,
          select: { body: true, sentAt: true },
        },
      },
    }),
    db.conversationParticipant.findMany({
      where: { userId: meId, archivedAt: null, conversation: scope },
      orderBy: { conversation: { lastMessageAt: "desc" } },
      take: CONVERSATION_LIMIT,
      select: { conversationId: true, lastReadAt: true },
    }),
  ])

  // The export opens on a thread, and an inbox that opened on nothing would
  // leave three quarters of the page blank. A `?c=` naming a row the reader is
  // not in falls through to the newest rather than erroring — a bad link
  // should show the inbox, not a crash.
  const selected =
    rows.find((row) => row.id === query.conversationId) ?? rows[0] ?? null
  const selectedOther = selected
    ? selected.participants.find((entry) => entry.userId !== meId)
    : undefined

  const counterpartIds = [
    ...new Set(
      rows
        .map((row) => row.participants.find((p) => p.userId !== meId)?.userId)
        .filter((id): id is string => typeof id === "string")
    ),
  ]
  const scoped = unreadWhere(myRows, meId)

  // **Wave two.** Everything left depends only on wave one, so none of it
  // needs to wait on any of the rest. Flattening the read this way is what
  // takes the page from eight sequential round trips to three — worth the
  // shape, because each one is a network hop to the database.
  const [grouped, present, threadRows, pairing] = await Promise.all([
    scoped
      ? db.message.groupBy({
          by: ["conversationId"],
          where: scoped,
          _count: { _all: true },
        })
      : Promise.resolve(
          [] as { conversationId: string; _count: { _all: number } }[]
        ),
    presentUsers(counterpartIds, now),
    selected
      ? db.message.findMany({
          where: { conversationId: selected.id, deletedAt: null },
          // Newest first and reversed below: a long thread opens on its end,
          // so the last N are the ones worth fetching.
          orderBy: { sentAt: "desc" },
          take: THREAD_MESSAGE_LIMIT,
          select: { id: true, body: true, sentAt: true, senderId: true },
        })
      : Promise.resolve(
          [] as { id: string; body: string; sentAt: Date; senderId: string }[]
        ),
    selected?.course && selectedOther
      ? resolvePairing(meId, selectedOther.userId, selected.course.id)
      : Promise.resolve(null),
  ])

  const unreadById = new Map(
    grouped.map((entry) => [entry.conversationId, entry._count._all])
  )

  const conversations: ConversationSummary[] = []
  for (const row of rows) {
    const other = row.participants.find((p) => p.userId !== meId)
    // A thread with nobody else in it cannot be drawn — it has no name, no
    // face and nowhere for a reply to go.
    if (!other) continue
    conversations.push({
      id: row.id,
      counterpart: {
        id: other.user.id,
        name: other.user.name,
        image: other.user.image,
        initials: initialsOf(other.user.name, other.user.email),
        online: present.has(other.user.id),
      },
      courseTitle: row.course?.title ?? null,
      preview: row.messages[0]?.body ?? "",
      age: compactAge(row.messages[0]?.sentAt ?? row.lastMessageAt, now),
      unread: unreadById.get(row.id) ?? 0,
    })
  }

  const active: ActiveThread | null =
    selected && selectedOther
      ? {
          id: selected.id,
          counterpart: conversations.find((entry) => entry.id === selected.id)
            ?.counterpart ?? {
            id: selectedOther.user.id,
            name: selectedOther.user.name,
            image: selectedOther.user.image,
            initials: initialsOf(
              selectedOther.user.name,
              selectedOther.user.email
            ),
            online: present.has(selectedOther.user.id),
          },
          courseTitle: selected.course?.title ?? null,
          messages: threadRows
            .slice()
            .reverse()
            .map((message) => ({
              id: message.id,
              body: message.body,
              time: format(message.sentAt, "h:mm a"),
              mine: message.senderId === meId,
            })),
          writable: pairing !== null,
        }
      : null

  return {
    conversations,
    active,
    // Summed from the per-conversation counts rather than counted again: those
    // already cover the whole inbox, so a second query would only be a slower
    // way to reach the same number.
    unread: [...unreadById.values()].reduce((total, n) => total + n, 0),
    query: { ...query, conversationId: selected?.id ?? null },
  }
}

/**
 * The badge beside the sidebar's Messages row, counted in each shell's layout
 * the way the notification bell's is.
 *
 * Messages rather than conversations, because that is what
 * `ConversationParticipant`'s own docstring asks the pill and the badge to
 * agree on.
 */
export async function getUnreadMessageCount(
  audience: MessageAudience
): Promise<number> {
  const session = await getSession()
  if (!session) return 0

  const meId = session.user.id
  const profile = await getInstructorProfile(meId)
  const rows = await db.conversationParticipant.findMany({
    where: {
      userId: meId,
      archivedAt: null,
      conversation: audienceWhere(audience, profile?.id ?? null),
    },
    select: { conversationId: true, lastReadAt: true },
    take: CONVERSATION_LIMIT,
  })

  const where = unreadWhere(rows, meId)
  return where ? db.message.count({ where }) : 0
}

// ---------------------------------------------------------------------------
// Who you are allowed to write to
// ---------------------------------------------------------------------------

export type MessageCandidate = {
  userId: string
  name: string
  image: string | null
  initials: string
  courseId: string
  courseTitle: string
}

/** How many people the New-message dialog will list. A popular course has
 *  thousands of students, so the dialog searches rather than scrolls. */
const CANDIDATE_LIMIT = 40

/**
 * The people this account may open a conversation with — **the messaging rule
 * made visible**, which is why it reads the same two facts `resolvePairing`
 * does rather than a role string.
 *
 * One entry per (person, course): a thread is about a course, so the course is
 * part of the choice, and the same student enrolled in two of your courses is
 * two conversations rather than one ambiguous thread.
 */
export async function getMessageCandidates(
  audience: MessageAudience,
  search: string
): Promise<MessageCandidate[]> {
  const session = await getSession()
  if (!session) return []

  const meId = session.user.id
  const term = search.trim().slice(0, MESSAGE_SEARCH_MAX)
  const like = { contains: term, mode: "insensitive" } as const

  if (audience === "INSTRUCTOR") {
    const profile = await getInstructorProfile(meId)
    if (!profile) return []

    const rows = await db.enrollment.findMany({
      where: {
        course: { instructorId: profile.id },
        userId: { not: meId },
        ...(term
          ? {
              OR: [
                { user: { name: like } },
                { course: { is: { title: like } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: CANDIDATE_LIMIT,
      select: {
        user: { select: { id: true, name: true, email: true, image: true } },
        course: { select: { id: true, title: true } },
      },
    })

    return rows.map((row) => ({
      userId: row.user.id,
      name: row.user.name,
      image: row.user.image,
      initials: initialsOf(row.user.name, row.user.email),
      courseId: row.course.id,
      courseTitle: row.course.title,
    }))
  }

  const rows = await db.enrollment.findMany({
    where: {
      userId: meId,
      // An instructor with no account behind the profile cannot be written to.
      course: { instructor: { is: { userId: { not: null } } } },
      ...(term
        ? {
            OR: [
              { course: { is: { title: like } } },
              { course: { is: { instructor: { is: { name: like } } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: CANDIDATE_LIMIT,
    select: {
      course: {
        select: {
          id: true,
          title: true,
          instructor: {
            select: {
              name: true,
              imageUrl: true,
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      },
    },
  })

  const candidates: MessageCandidate[] = []
  for (const row of rows) {
    const user = row.course.instructor.user
    if (!user || user.id === meId) continue
    candidates.push({
      userId: user.id,
      name: row.course.instructor.name,
      // The teaching profile's headshot is the face the sale and profile pages
      // already show for this person; the account picture is the fallback.
      image: row.course.instructor.imageUrl ?? user.image,
      initials: initialsOf(row.course.instructor.name, user.email),
      courseId: row.course.id,
      courseTitle: row.course.title,
    })
  }
  return candidates
}
