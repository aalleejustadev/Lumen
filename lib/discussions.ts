import { cache } from "react"

import { formatDistanceStrict } from "date-fns"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"
import { initialsOf } from "@/lib/user"
import {
  DISCUSSIONS_PAGE_SIZE,
  discussionScopeValues,
  type DiscussionAudience,
  type DiscussionScope,
} from "@/lib/config/discussions"
import type { Prisma } from "@/lib/generated/prisma/client"

/**
 * The reads behind both Discussions pages — the learner's
 * `/dashboard/discussions` and the instructor's
 * `/dashboard/instructor/discussions` are one query path with a different
 * `audience`, the arrangement the notification feed and the inbox already
 * have.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy lives in `lib/config/discussions.ts` so the board can
 * import it freely.
 *
 * **Nothing on either page is demo data and neither needed a migration** —
 * `CommunityTopic`, `Discussion` and `DiscussionLike` were already shaped for
 * these exports, docstrings and all. The seed wrote the threads but not their
 * tags or hearts, so `seedCommunity` gained both.
 *
 * Six definitions decide what the pages mean:
 *
 *  - **Both audiences read the same feed.** The two exports draw the same five
 *    threads by the same five authors, so the audience does not narrow the
 *    rows beyond topic visibility — what it changes is what you may *do*.
 *  - **Visibility is enforced in SQL, not in the component.** `STAFF_ONLY`
 *    topics are invisible to anybody without a teaching profile, which is the
 *    whole reason that column exists. It is a `where`, so a hand-edited
 *    `?topic=instructor-lounge` returns nothing rather than a filtered-out
 *    page.
 *  - **The instructor's four stats describe what they are responsible for**,
 *    not the whole community: threads in topics they moderate, plus threads
 *    they wrote. That is the export's own lead ("Topics you run for your
 *    cohorts") and it is what makes "Awaiting your reply" mean anything. The
 *    *list* is deliberately wider — it is the community, with **Mine** as the
 *    filter that narrows it.
 *  - **"Awaiting your reply" and the Unanswered tab are one definition** — a
 *    published thread nobody has replied to yet. Two numbers for one idea is
 *    how they end up disagreeing on screen.
 *  - **Replies are read off `Discussion.replyCount`**, the denormalised
 *    counter, not a `count()` over `discussion_reply`. That column exists for
 *    it ("the list draws both counts on every row" — the model's own note) and
 *    the admin Community page already reads it the same way, so one thread
 *    cannot report two reply counts on two screens.
 *  - **Relative time is formatted here, on the server**, against one clock
 *    captured at the top of the read. Both of the audit log's reasons apply.
 */

export type DiscussionsQuery = {
  /** A topic slug, or null for "All Topics". */
  topic: string | null
  scope: DiscussionScope
  page: number
}

export type DiscussionTopic = {
  id: string
  slug: string
  name: string
  /** Published, visible threads in it. The pill row hides the empty ones —
   *  a filter that can only ever return nothing is a dead affordance — while
   *  the compose dialog still offers them, because a topic nobody has posted
   *  in yet is exactly where a first thread goes. */
  threadCount: number
}

export type DiscussionRow = {
  id: string
  title: string
  body: string
  topicName: string
  /** Free-form tags beside the topic chip — `Discussion.tags`. */
  tags: string[]
  isPinned: boolean
  replyCount: number
  likeCount: number
  /** Whether the reader's own heart is on it. */
  liked: boolean
  /** "2h ago" — formatted here; see the module note. */
  age: string
  author: {
    name: string
    image: string | null
    initials: string
    /** "admin" | "instructor" | anything else, which draws no pill. */
    role: string
  }
}

export type DiscussionStats = {
  activeThreads: number
  repliesThisMonth: number
  awaitingReply: number
  participants: number
  /** Open reports on community content — the moderation banner's count. */
  needsModeration: number
}

export type DiscussionsPage = {
  rows: DiscussionRow[]
  topics: DiscussionTopic[]
  total: number
  page: number
  pageCount: number
  query: DiscussionsQuery
  /** Instructor only; the learner's page draws no stat row. */
  stats: DiscussionStats | null
  canModerate: boolean
}

/**
 * Turns whatever arrived in the URL into a query this module will act on.
 *
 * An unknown scope falls back to `all` and an unknown topic to "every topic" —
 * a hand-edited query string should show the unfiltered feed, not a crash. The
 * topic is only ever matched against the topics the reader may see, so it can
 * never widen what comes back.
 */
export function parseDiscussionsQuery(params: {
  topic?: string | string[]
  scope?: string | string[]
  page?: string | string[]
}): DiscussionsQuery {
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const rawScope = one(params.scope)
  const rawTopic = (one(params.topic) ?? "").trim()
  const rawPage = Number(one(params.page))

  return {
    topic: rawTopic === "" ? null : rawTopic.slice(0, 64),
    scope:
      rawScope && discussionScopeValues.has(rawScope)
        ? (rawScope as DiscussionScope)
        : "all",
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1,
  }
}

/** Which topics this reader may see. `STAFF_ONLY` is the one the column
 *  exists for — see the module note. */
function visibleTopics(canTeach: boolean): Prisma.CommunityTopicWhereInput {
  return canTeach ? {} : { visibility: { not: "STAFF_ONLY" } }
}

export async function getDiscussionsPage(
  audience: DiscussionAudience,
  query: DiscussionsQuery
): Promise<DiscussionsPage | null> {
  const session = await getSession()
  if (!session) return null

  const meId = session.user.id
  const now = new Date()
  const profile = await getInstructorProfile(meId)
  const staff = audience === "INSTRUCTOR" || profile !== null
  const topicWhere = visibleTopics(staff)

  const visible = await db.communityTopic.findMany({
    where: topicWhere,
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true },
  })
  const topicIds = visible.map((topic) => topic.id)

  // One grouped query rather than a count per topic — the pill row needs a
  // number for each and a round trip apiece would be seven.
  const grouped = topicIds.length
    ? await db.discussion.groupBy({
        by: ["topicId"],
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          topicId: { in: topicIds },
        },
        _count: { _all: true },
      })
    : []
  const countByTopic = new Map(
    grouped.map((entry) => [entry.topicId, entry._count._all])
  )
  const topics: DiscussionTopic[] = visible.map((topic) => ({
    ...topic,
    threadCount: countByTopic.get(topic.id) ?? 0,
  }))

  const selected = query.topic
    ? topics.find((topic) => topic.slug === query.topic)
    : undefined

  // Only fetched for the one scope that needs them — see the `where` below.
  const reportedIds =
    query.scope === "reported" ? await reportedDiscussionIds(meId) : []

  const base: Prisma.DiscussionWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
    topicId: selected ? selected.id : { in: topicIds },
  }
  const where: Prisma.DiscussionWhereInput = {
    ...base,
    ...(query.scope === "mine" ? { authorId: meId } : {}),
    // One definition, shared with the "Awaiting your reply" tile.
    ...(query.scope === "unanswered" ? { replyCount: 0 } : {}),
    // Reported: the banner's own destination. The ids come from
    // `ContentReport`, which is polymorphic — `targetId` is a plain string, so
    // there is no relation for Prisma to join and the ids are resolved first.
    ...(query.scope === "reported" ? { id: { in: reportedIds } } : {}),
  }

  const [total, rows, stats] = await Promise.all([
    db.discussion.count({ where }),
    db.discussion.findMany({
      where,
      // Pinned first, then newest — which is what both exports draw: their two
      // pinned threads lead, and the rest run 5h, 2d, 3d.
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      skip: (Math.max(1, query.page) - 1) * DISCUSSIONS_PAGE_SIZE,
      take: DISCUSSIONS_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        body: true,
        tags: true,
        isPinned: true,
        replyCount: true,
        likeCount: true,
        createdAt: true,
        topic: { select: { name: true } },
        author: {
          select: { name: true, email: true, image: true, role: true },
        },
      },
    }),
    audience === "INSTRUCTOR"
      ? instructorStats(meId, topicIds)
      : Promise.resolve(null),
  ])

  // The reader's own hearts, in one query rather than a join per row —
  // `DiscussionLike` is polymorphic (`targetType` + `targetId`), so there is
  // no relation for Prisma to include.
  const ids = rows.map((row) => row.id)
  const likes = ids.length
    ? await db.discussionLike.findMany({
        where: {
          userId: meId,
          targetType: "DISCUSSION",
          targetId: { in: ids },
        },
        select: { targetId: true },
      })
    : []
  const liked = new Set(likes.map((like) => like.targetId))

  const pageCount = Math.max(1, Math.ceil(total / DISCUSSIONS_PAGE_SIZE))

  return {
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      topicName: row.topic.name,
      tags: row.tags,
      isPinned: row.isPinned,
      replyCount: row.replyCount,
      likeCount: row.likeCount,
      liked: liked.has(row.id),
      age: `${formatDistanceStrict(row.createdAt, now)} ago`,
      author: {
        name: row.author.name,
        image: row.author.image,
        initials: initialsOf(row.author.name, row.author.email),
        role: row.author.role ?? "user",
      },
    })),
    topics,
    total,
    page: Math.min(Math.max(1, query.page), pageCount),
    pageCount,
    query,
    stats,
    canModerate: staff,
  }
}

/**
 * Published threads in topics this account moderates that carry an open
 * report — on the thread itself or on one of its replies.
 *
 * `ContentReport` is polymorphic (`targetId` is a plain string), so there is
 * nothing to join: the reports are read, then the ids are matched against the
 * threads this moderator may act on. A report on a reply resolves to the
 * thread that holds it, because the thread is what the page can open.
 */
const reportedDiscussionIds = cache(async function reportedDiscussionIds(
  meId: string
): Promise<string[]> {
  const seats = await db.topicModerator.findMany({
    where: { userId: meId },
    select: { topicId: true },
  })
  if (seats.length === 0) return []

  const reports = await db.contentReport.findMany({
    where: {
      status: "OPEN",
      targetType: { in: ["DISCUSSION", "DISCUSSION_REPLY"] },
    },
    select: { targetType: true, targetId: true },
  })
  if (reports.length === 0) return []

  const direct = reports
    .filter((row) => row.targetType === "DISCUSSION")
    .map((row) => row.targetId)
  const replyIds = reports
    .filter((row) => row.targetType === "DISCUSSION_REPLY")
    .map((row) => row.targetId)

  const viaReplies = replyIds.length
    ? await db.discussionReply.findMany({
        where: { id: { in: replyIds } },
        select: { discussionId: true },
      })
    : []

  const candidates = [
    ...new Set([...direct, ...viaReplies.map((row) => row.discussionId)]),
  ]
  if (candidates.length === 0) return []

  const rows = await db.discussion.findMany({
    where: {
      id: { in: candidates },
      status: "PUBLISHED",
      deletedAt: null,
      topicId: { in: seats.map((seat) => seat.topicId) },
    },
    select: { id: true },
  })
  return rows.map((row) => row.id)
})

/**
 * The instructor's four tiles, scoped to what they are responsible for —
 * topics they moderate plus threads they wrote. See the module note for why
 * that is narrower than the list underneath.
 */
async function instructorStats(
  meId: string,
  visibleTopicIds: string[]
): Promise<DiscussionStats> {
  const moderated = await db.topicModerator.findMany({
    where: { userId: meId, topicId: { in: visibleTopicIds } },
    select: { topicId: true },
  })
  const mine: Prisma.DiscussionWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
    OR: [
      { topicId: { in: moderated.map((row) => row.topicId) } },
      { authorId: meId },
    ],
  }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [activeThreads, awaitingReply, participants, replies, reports] =
    await Promise.all([
      db.discussion.count({ where: { ...mine, isLocked: false } }),
      db.discussion.count({ where: { ...mine, replyCount: 0 } }),
      // Distinct authors, which is the only participant figure the data can
      // answer honestly: `DiscussionReply` has no rows yet, because the seed
      // sets `replyCount` rather than materialising ~18,000 of them.
      db.discussion
        .findMany({
          where: mine,
          select: { authorId: true },
          distinct: ["authorId"],
        })
        .then((list) => list.length),
      db.discussion.aggregate({
        where: { ...mine, createdAt: { gte: monthStart } },
        _sum: { replyCount: true },
      }),
      // **Scoped to what this instructor moderates**, not the platform. The
      // banner says "the topics you moderate" and the console's own reported
      // queue is a different, wider surface that an instructor cannot open.
      reportedDiscussionIds(meId).then((ids) => ids.length),
    ])

  return {
    activeThreads,
    repliesThisMonth: replies._sum.replyCount ?? 0,
    awaitingReply,
    participants,
    needsModeration: reports,
  }
}

// ---------------------------------------------------------------------------
// The thread page
// ---------------------------------------------------------------------------

export type DiscussionReplyRow = {
  id: string
  body: string
  age: string
  likeCount: number
  liked: boolean
  /** Drawn on a tinted card — see `discussion-thread.tsx`. */
  fromStaff: boolean
  author: DiscussionRow["author"]
}

export type DiscussionDetail = {
  id: string
  title: string
  /** The body split on blank lines, so the export's two paragraphs are two
   *  elements rather than one block with a line break in it. */
  paragraphs: string[]
  topicName: string
  tags: string[]
  isPinned: boolean
  isLocked: boolean
  likeCount: number
  liked: boolean
  replyCount: number
  age: string
  author: DiscussionRow["author"]
  replies: DiscussionReplyRow[]
  /** Whether this reader may post into it — a locked thread takes no replies. */
  canReply: boolean
  /** The reader's own avatar, for the composer row the export draws. */
  me: { name: string; image: string | null; initials: string }
}

/** How many replies the page loads. Threads here run to ~190, which is well
 *  inside one read; add paging when a thread can outgrow it. */
const THREAD_REPLY_LIMIT = 200

/**
 * One thread and its replies, from
 * `ui-design/light/dashboard/instructor/discussion-page__individual.png`.
 *
 * **Visibility is the same `where` the list uses** — a `STAFF_ONLY` topic is
 * unreachable by id as well as by filter, so a learner who pastes a thread id
 * gets the same "there is nothing here" a wrong id gives, rather than a page
 * that leaks a title before deciding.
 *
 * The reader's own hearts come back in one query for the thread and all its
 * replies together: `DiscussionLike` is polymorphic, so there is no relation
 * to include and two round trips would be two shapes of the same question.
 */
export async function getDiscussionDetail(
  audience: DiscussionAudience,
  discussionId: string
): Promise<DiscussionDetail | null> {
  const session = await getSession()
  if (!session) return null

  const meId = session.user.id
  const now = new Date()
  const profile = await getInstructorProfile(meId)
  const staff = audience === "INSTRUCTOR" || profile !== null

  const row = await db.discussion.findFirst({
    where: {
      id: discussionId,
      status: "PUBLISHED",
      deletedAt: null,
      topic: visibleTopics(staff),
    },
    select: {
      id: true,
      title: true,
      body: true,
      tags: true,
      isPinned: true,
      isLocked: true,
      likeCount: true,
      replyCount: true,
      createdAt: true,
      topic: { select: { name: true } },
      author: { select: { name: true, email: true, image: true, role: true } },
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: THREAD_REPLY_LIMIT,
        select: {
          id: true,
          body: true,
          likeCount: true,
          createdAt: true,
          author: {
            select: { name: true, email: true, image: true, role: true },
          },
        },
      },
    },
  })
  if (!row) return null

  const likes = await db.discussionLike.findMany({
    where: {
      userId: meId,
      OR: [
        { targetType: "DISCUSSION", targetId: row.id },
        {
          targetType: "DISCUSSION_REPLY",
          targetId: { in: row.replies.map((reply) => reply.id) },
        },
      ],
    },
    select: { targetId: true },
  })
  const liked = new Set(likes.map((like) => like.targetId))

  const person = (author: {
    name: string
    email: string
    image: string | null
    role: string | null
  }) => ({
    name: author.name,
    image: author.image,
    initials: initialsOf(author.name, author.email),
    role: author.role ?? "user",
  })

  return {
    id: row.id,
    title: row.title,
    // Blank lines are paragraph breaks — the export draws two.
    paragraphs: row.body
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean),
    topicName: row.topic.name,
    tags: row.tags,
    isPinned: row.isPinned,
    isLocked: row.isLocked,
    likeCount: row.likeCount,
    liked: liked.has(row.id),
    replyCount: row.replyCount,
    age: `${formatDistanceStrict(row.createdAt, now)} ago`,
    author: person(row.author),
    replies: row.replies.map((reply) => ({
      id: reply.id,
      body: reply.body,
      age: `${formatDistanceStrict(reply.createdAt, now)} ago`,
      likeCount: reply.likeCount,
      liked: liked.has(reply.id),
      // The export tints one reply, and it is the instructor's. Staff rather
      // than "your own": a learner opening this wants to spot the answer, and
      // a highlight that moves with the viewer would say something different
      // to each of them.
      fromStaff:
        reply.author.role === "instructor" || reply.author.role === "admin",
      author: person(reply.author),
    })),
    canReply: !row.isLocked,
    me: {
      name: session.user.name,
      image: session.user.image ?? null,
      initials: initialsOf(session.user.name, session.user.email),
    },
  }
}
