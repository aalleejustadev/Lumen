"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  getModeratorCandidates,
  getTopicModerators,
  type ModeratorCandidate,
  type TopicModeratorRow,
} from "@/lib/admin/community"
import {
  isTopicVisibility,
  TOPIC_DESCRIPTION_MAX_LENGTH,
  TOPIC_NAME_MAX_LENGTH,
} from "@/lib/config/admin-community"
import { isCategoryAccent } from "@/lib/config/admin-categories"
import type { TopicVisibility } from "@/lib/generated/prisma/client"

/**
 * The writes behind `/dashboard/admin/community`. Reads live in
 * `lib/admin/community.ts`.
 *
 * **Every one re-checks the admin role.** A Server Action is a public
 * endpoint: the console's layout guard covers the page, not the function, and
 * these create the spaces learners post in and hand people the power to
 * delete other people's writing. They return `{ ok, message }` for the caller
 * to toast rather than throwing, the shape `lib/actions/cart.ts` established.
 *
 * Nothing here trusts what it is handed: the visibility is checked against the
 * enum, the accent against the six the palette has, and every user id in a
 * moderator save is re-read from the database before a row is written.
 */

export type AdminCommunityResult = { ok: boolean; message: string }

const DENIED: AdminCommunityResult = {
  ok: false,
  message: "You do not have access to the community console.",
}

const GONE: AdminCommunityResult = {
  ok: false,
  message: "That topic no longer exists — reload the page.",
}

async function requireAdmin() {
  const session = await getSession()
  if (session?.user.role !== "admin") return null
  return session
}

/**
 * The console **layout**, not this page: a topic change moves the sidebar's
 * own counts and every page of the moderators table is a different URL. Same
 * mechanism `lib/actions/wishlist.ts` documents for the sidebar badge.
 */
function revalidateConsole() {
  revalidatePath("/dashboard/admin", "layout")
}

export type TopicInput = {
  name: string
  description: string
  accentColor: string
  visibility: string
  learnersCanStartThreads: boolean
  requiresModeratorApproval: boolean
}

/**
 * Turns a name into a URL key. Kept deliberately dull: the slug is a topic's
 * stable identity and a learner-facing filter value, so it is derived **once,
 * on create**, and never re-derived on a rename — the rule the categories
 * page records for the same reason.
 */
function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "topic"
  )
}

function clean(input: TopicInput) {
  const name = (input?.name ?? "").trim().slice(0, TOPIC_NAME_MAX_LENGTH)
  const description = (input?.description ?? "")
    .trim()
    .slice(0, TOPIC_DESCRIPTION_MAX_LENGTH)
  const visibility: TopicVisibility = isTopicVisibility(input?.visibility)
    ? input.visibility
    : "EVERYONE"
  const accentColor = isCategoryAccent(input?.accentColor)
    ? input.accentColor
    : "blue"
  return {
    name,
    description,
    accentColor,
    visibility,
    learnersCanStartThreads: input?.learnersCanStartThreads !== false,
    requiresModeratorApproval: input?.requiresModeratorApproval === true,
  }
}

async function uniqueSlug(base: string) {
  let slug = base
  let n = 2
  // A numeric suffix on collision rather than a failed write — the same
  // arrangement `createCategory` makes.
  while (await db.communityTopic.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`
    n += 1
  }
  return slug
}

async function log(
  session: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>,
  action: string,
  topicId: string,
  topicName: string
) {
  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role ?? null,
      action,
      targetType: "community_topic",
      targetId: topicId,
      targetLabel: topicName,
      // `AuditCategory` has no CONTENT member and a topic is part of the
      // catalog of places to post, so it logs under COURSES — the reading
      // `lib/actions/admin-categories.ts` settled for the same reason.
      category: "COURSES",
    },
  })
}

export async function createTopic(
  input: TopicInput
): Promise<AdminCommunityResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  const values = clean(input)
  if (values.name.length === 0) {
    return { ok: false, message: "Give the topic a name." }
  }

  const last = await db.communityTopic.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  })

  const topic = await db.communityTopic.create({
    data: {
      ...values,
      slug: await uniqueSlug(slugify(values.name)),
      // Appended, not pushed to the top: the list is ordered and a new topic
      // has no claim on the first seat.
      order: (last?.order ?? -1) + 1,
    },
    select: { id: true, name: true },
  })

  await log(session, "Created a community topic", topic.id, topic.name)
  revalidateConsole()
  return { ok: true, message: `${topic.name} was created` }
}

export async function updateTopic(
  topicId: string,
  input: TopicInput
): Promise<AdminCommunityResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  const existing = await db.communityTopic.findUnique({
    where: { id: topicId },
    select: { id: true },
  })
  if (!existing) return GONE

  const values = clean(input)
  if (values.name.length === 0) {
    return { ok: false, message: "Give the topic a name." }
  }

  // **The slug is not re-derived.** It is the topic's stable key and a
  // learner-facing filter value, so renaming "Q&A" must not quietly repoint
  // every link at it.
  const topic = await db.communityTopic.update({
    where: { id: existing.id },
    data: values,
    select: { id: true, name: true },
  })

  await log(session, "Updated a community topic", topic.id, topic.name)
  revalidateConsole()
  return { ok: true, message: `${topic.name} was updated` }
}

/**
 * Delete, refused while anything is filed under the topic.
 *
 * Unlike a category, Postgres would **not** stop this: `Discussion.topic`
 * cascades, so deleting Q&A would silently take 862 threads with it. The
 * guard is the whole protection, which is why the `⋯` menu draws the item
 * disabled with the same sentence — hiding it is not the guard, and this
 * re-checks rather than trusting the button.
 */
export async function deleteTopic(
  topicId: string
): Promise<AdminCommunityResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  const topic = await db.communityTopic.findUnique({
    where: { id: topicId },
    select: {
      id: true,
      name: true,
      _count: { select: { discussions: true } },
    },
  })
  if (!topic) return GONE

  if (topic._count.discussions > 0) {
    return {
      ok: false,
      message: `${topic.name} still has ${topic._count.discussions.toLocaleString(
        "en-US"
      )} ${topic._count.discussions === 1 ? "thread" : "threads"} — move or remove them first.`,
    }
  }

  await db.communityTopic.delete({ where: { id: topic.id } })
  await log(session, "Deleted a community topic", topic.id, topic.name)
  revalidateConsole()
  return { ok: true, message: `${topic.name} was deleted` }
}

// ---------------------------------------------------------------------------
// Moderators
// ---------------------------------------------------------------------------

export type ModeratorDraft = {
  userId: string
  canPin: boolean
  canLock: boolean
  canDelete: boolean
  canSuspend: boolean
}

/** What the Moderators dialog loads when it opens. */
export async function loadTopicModerators(topicId: string): Promise<{
  moderators: TopicModeratorRow[]
  candidates: ModeratorCandidate[]
} | null> {
  const session = await requireAdmin()
  if (!session) return null
  const [moderators, candidates] = await Promise.all([
    getTopicModerators(topicId),
    getModeratorCandidates(topicId, ""),
  ])
  return { moderators, candidates }
}

/** The dialog's search field, which narrows the candidate list in SQL. */
export async function searchModeratorCandidates(
  topicId: string,
  search: string
): Promise<ModeratorCandidate[]> {
  const session = await requireAdmin()
  if (!session) return []
  return getModeratorCandidates(topicId, search)
}

/**
 * "Save changes" — the dialog is a **staged editor**, so this is handed the
 * whole intended moderator list rather than a stream of add/remove calls. That
 * is what makes its Save meaningful and its close a discard.
 *
 * The list is reconciled rather than deleted-and-rewritten, so a moderator who
 * was already there keeps their `createdAt` and their row id.
 *
 * Every id is re-read before it is written: they came from the browser, and a
 * hand-edited one would otherwise appoint an arbitrary account. Anything that
 * is not a real, active user is dropped rather than failing the save.
 */
export async function saveTopicModerators(
  topicId: string,
  drafts: ModeratorDraft[]
): Promise<AdminCommunityResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  const topic = await db.communityTopic.findUnique({
    where: { id: topicId },
    select: { id: true, name: true },
  })
  if (!topic) return GONE

  const wanted = Array.isArray(drafts) ? drafts : []
  const ids = [
    ...new Set(
      wanted.map((row) => row?.userId).filter((id): id is string => !!id)
    ),
  ]

  const real = await db.user.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    select: { id: true },
  })
  const allowed = new Set(real.map((row) => row.id))

  const byUser = new Map(
    wanted
      .filter((row) => allowed.has(row.userId))
      .map((row) => [
        row.userId,
        {
          canPin: row.canPin === true,
          canLock: row.canLock === true,
          canDelete: row.canDelete === true,
          canSuspend: row.canSuspend === true,
        },
      ])
  )

  const current = await db.topicModerator.findMany({
    where: { topicId: topic.id },
    select: { id: true, userId: true },
  })
  const currentIds = new Set(current.map((row) => row.userId))

  const removed = current.filter((row) => !byUser.has(row.userId))
  const added = [...byUser.entries()].filter(([id]) => !currentIds.has(id))
  const updated = [...byUser.entries()].filter(([id]) => currentIds.has(id))

  await db.$transaction([
    ...(removed.length > 0
      ? [
          db.topicModerator.deleteMany({
            where: { id: { in: removed.map((row) => row.id) } },
          }),
        ]
      : []),
    ...added.map(([userId, permissions]) =>
      db.topicModerator.create({
        data: { topicId: topic.id, userId, ...permissions },
      })
    ),
    ...updated.map(([userId, permissions]) =>
      db.topicModerator.update({
        where: { topicId_userId: { topicId: topic.id, userId } },
        data: permissions,
      })
    ),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        actorName: session.user.name,
        actorRole: session.user.role ?? null,
        action: "Updated topic moderators",
        targetType: "community_topic",
        targetId: topic.id,
        targetLabel: topic.name,
        // SECURITY rather than COURSES: this is who may delete other people's
        // posts, which is the thing somebody filters that tab to find — the
        // distinction `setUserStatus` already makes.
        category: "SECURITY",
      },
    }),
  ])

  revalidateConsole()
  return { ok: true, message: `Moderators for ${topic.name} were saved` }
}
