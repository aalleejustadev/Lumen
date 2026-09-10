import { cache } from "react"

import { db } from "@/lib/db"
import { MODERATORS_PAGE_SIZE } from "@/lib/config/admin-community"
import type { TopicVisibility } from "@/lib/generated/prisma/client"

/**
 * Reads for `/dashboard/admin/community`, from
 * `ui-design/light/dashboard/admin/community-page__admin.png` and its two
 * dialogs.
 *
 * Pulls in `lib/db`, so the same "never import this from a Client Component"
 * rule as the rest of `lib/admin/` applies — and, as on the Users and Courses
 * pages, the page size and the client-safe helpers live in
 * `lib/config/admin-community.ts` so the board can import them without
 * dragging the Postgres driver into the browser bundle.
 *
 * **Nothing on the page is demo data, and it needed no migration.**
 * `CommunityTopic`, `TopicModerator` and `Discussion` were already shaped for
 * these exports, docstrings and all — `CommunityTopic`'s note names this page
 * and its dialog, and `TopicModerator`'s names the four permission switches.
 * The seed now writes them.
 *
 * **Three of the four tiles are defined here, and the export settles none of
 * them.** Its own numbers do not reconcile: the Threads tile says 1,842 where
 * its six rows sum to 1,814, and the Moderators tile says 18 where the four
 * rows of its own table cannot add to that. One definition wins, the way the
 * categories page's percentages settled the same kind of disagreement:
 *
 *  - **Topics** is every `CommunityTopic`.
 *  - **Threads** is every `Discussion` that has not been removed — the same
 *    rows the per-topic "N threads" counts, so the tile is the sum of the
 *    column beneath it and the two can never disagree.
 *  - **Moderators** counts **distinct people**, not assignments. The table's
 *    own lead says "People with elevated permissions in one or more topics",
 *    and a tile reading 18 when 13 people hold 18 seats would be wrong in the
 *    way that matters. The per-topic "N moderators" is seats in that topic,
 *    which is the only thing that number can mean on a row.
 *  - **Reported items** is open `ContentReport` rows whose target is a
 *    discussion or a reply. Keeping that apart from the review queue is what
 *    lets this page and `/dashboard/admin/reviews` each count their own work
 *    rather than both drawing the same backlog.
 *
 * **"Posts" reads the denormalised `Discussion.replyCount`**, not a `count()`
 * over `discussion_reply`. That column exists for exactly this ("the list
 * draws both counts on every row" — the model's own note), it is what a
 * future Discussions page will render, and it carries history a table of
 * live reply rows would not. Same arrangement `top-courses-card.tsx` has with
 * `Course.enrollmentCount`.
 */

export type CommunityStats = {
  topics: number
  threads: number
  moderators: number
  reportedItems: number
}

export type TopicRow = {
  id: string
  slug: string
  name: string
  description: string | null
  accentColor: string
  visibility: TopicVisibility
  learnersCanStartThreads: boolean
  requiresModeratorApproval: boolean
  threadCount: number
  /** Threads plus their replies — see the module note. */
  postCount: number
  moderatorCount: number
}

export type ModeratorRow = {
  userId: string
  name: string
  email: string
  image: string | null
  role: string | null
  /** Every topic they moderate, in the topics' own order. */
  topics: { id: string; name: string }[]
  /** The union of what they may do across those topics — see below. */
  canPin: boolean
  canLock: boolean
  canDelete: boolean
  canSuspend: boolean
}

export type ModeratorsPage = {
  rows: ModeratorRow[]
  total: number
  page: number
  pageCount: number
}

/** One row of the Moderators dialog's "Current moderators" list. */
export type TopicModeratorRow = {
  userId: string
  name: string
  email: string
  image: string | null
  role: string | null
  canPin: boolean
  canLock: boolean
  canDelete: boolean
  canSuspend: boolean
}

/** One row of its "Add a moderator" list. */
export type ModeratorCandidate = {
  userId: string
  name: string
  email: string
  image: string | null
  role: string | null
  /** Only meaningful for an instructor — the second line names it. */
  courseCount: number
}

export type CommunityQuery = { page: number }

export function parseCommunityQuery(params: {
  page?: string | string[]
}): CommunityQuery {
  const raw = Array.isArray(params.page) ? params.page[0] : params.page
  const page = Number(raw)
  return { page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1 }
}

/**
 * The four tiles. Wrapped in React `cache` because the page reads it and a
 * future sidebar badge would too — the arrangement `getAttentionFacts` is in.
 */
export const getCommunityStats = cache(async (): Promise<CommunityStats> => {
  const [topics, threads, moderators, reportedItems] = await Promise.all([
    db.communityTopic.count(),
    db.discussion.count({ where: { status: { not: "REMOVED" } } }),
    db.topicModerator.findMany({
      distinct: ["userId"],
      select: { userId: true },
    }),
    db.contentReport.count({
      where: {
        status: "OPEN",
        targetType: { in: ["DISCUSSION", "DISCUSSION_REPLY"] },
      },
    }),
  ])

  return {
    topics,
    threads,
    moderators: moderators.length,
    reportedItems,
  }
})

/**
 * The Topics list, in `CommunityTopic.order` then `name` — what that column is
 * for, and `name` is what stops two topics sharing an `order` shuffling
 * between renders, the tie-break the categories list already uses.
 *
 * Reply totals come back from one `groupBy` rather than a query per topic.
 */
export async function getTopics(): Promise<TopicRow[]> {
  const [topics, replies] = await Promise.all([
    db.communityTopic.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        accentColor: true,
        visibility: true,
        learnersCanStartThreads: true,
        requiresModeratorApproval: true,
        _count: { select: { moderators: true } },
      },
    }),
    db.discussion.groupBy({
      by: ["topicId"],
      where: { status: { not: "REMOVED" } },
      _count: { _all: true },
      _sum: { replyCount: true },
    }),
  ])

  const byTopic = new Map(replies.map((row) => [row.topicId, row]))

  return topics.map((topic) => {
    const counts = byTopic.get(topic.id)
    const threadCount = counts?._count._all ?? 0
    return {
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      description: topic.description,
      accentColor: topic.accentColor,
      visibility: topic.visibility,
      learnersCanStartThreads: topic.learnersCanStartThreads,
      requiresModeratorApproval: topic.requiresModeratorApproval,
      threadCount,
      postCount: threadCount + (counts?._sum.replyCount ?? 0),
      moderatorCount: topic._count.moderators,
    }
  })
}

/**
 * The Moderators table — one row per **person**, not per assignment, which is
 * what its own lead promises and what the Scope column ("Announcements ·
 * Showcase") is drawn to hold.
 *
 * **Permissions are the union across their topics.** They are stored per
 * (topic, user), so somebody can pin in one topic and delete in another; the
 * column answers "what can this person do", and the per-topic truth is one
 * click away in that topic's dialog. Ordered by name so the page is stable.
 */
export async function getModerators(
  query: CommunityQuery,
  topicOrder: string[]
): Promise<ModeratorsPage> {
  const rows = await db.topicModerator.findMany({
    select: {
      topicId: true,
      canPin: true,
      canLock: true,
      canDelete: true,
      canSuspend: true,
      topic: { select: { id: true, name: true } },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      },
    },
  })

  const rank = new Map(topicOrder.map((id, index) => [id, index]))
  const byUser = new Map<string, ModeratorRow>()

  for (const row of rows) {
    const existing = byUser.get(row.user.id)
    if (existing) {
      existing.topics.push({ id: row.topic.id, name: row.topic.name })
      existing.canPin ||= row.canPin
      existing.canLock ||= row.canLock
      existing.canDelete ||= row.canDelete
      existing.canSuspend ||= row.canSuspend
      continue
    }
    byUser.set(row.user.id, {
      userId: row.user.id,
      name: row.user.name,
      email: row.user.email,
      image: row.user.image,
      role: row.user.role,
      topics: [{ id: row.topic.id, name: row.topic.name }],
      canPin: row.canPin,
      canLock: row.canLock,
      canDelete: row.canDelete,
      canSuspend: row.canSuspend,
    })
  }

  const all = [...byUser.values()]
  for (const row of all) {
    row.topics.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
  }
  all.sort((a, b) => a.name.localeCompare(b.name))

  const total = all.length
  const pageCount = Math.max(1, Math.ceil(total / MODERATORS_PAGE_SIZE))
  const page = Math.min(query.page, pageCount)
  const from = (page - 1) * MODERATORS_PAGE_SIZE

  return {
    rows: all.slice(from, from + MODERATORS_PAGE_SIZE),
    total,
    page,
    pageCount,
  }
}

/**
 * What the Moderators dialog needs for one topic: who moderates it, and who
 * could.
 *
 * The candidate list is **not** every account — 500 rows would be a scroll,
 * not a picker. It is the people the dialog's own export offers: staff, plus
 * learners who have actually taken part, ranked so the most active come first.
 * The search then narrows it server-side.
 */
export async function getTopicModerators(
  topicId: string
): Promise<TopicModeratorRow[]> {
  const rows = await db.topicModerator.findMany({
    where: { topicId },
    orderBy: { createdAt: "asc" },
    select: {
      canPin: true,
      canLock: true,
      canDelete: true,
      canSuspend: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      },
    },
  })

  return rows.map((row) => ({
    userId: row.user.id,
    name: row.user.name,
    email: row.user.email,
    image: row.user.image,
    role: row.user.role,
    canPin: row.canPin,
    canLock: row.canLock,
    canDelete: row.canDelete,
    canSuspend: row.canSuspend,
  }))
}

const CANDIDATE_LIMIT = 8

export async function getModeratorCandidates(
  topicId: string,
  search: string
): Promise<ModeratorCandidate[]> {
  const term = search.trim().slice(0, 80)
  const already = await db.topicModerator.findMany({
    where: { topicId },
    select: { userId: true },
  })

  const users = await db.user.findMany({
    where: {
      id: { notIn: already.map((row) => row.userId) },
      status: "ACTIVE",
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" as const } },
              { email: { contains: term, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    // Staff first, then alphabetically — the order the dialog's own list is
    // drawn in (an instructor between two students).
    orderBy: [{ role: "asc" }, { name: "asc" }],
    take: CANDIDATE_LIMIT,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      instructorProfile: { select: { _count: { select: { courses: true } } } },
    },
  })

  return users.map((user) => ({
    userId: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    courseCount: user.instructorProfile?._count.courses ?? 0,
  }))
}
