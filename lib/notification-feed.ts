import { formatDistanceStrict } from "date-fns"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  FEED_PAGE_SIZE,
  FEED_SEARCH_MAX,
  feedCategories,
  feedCategoryValues,
  feedStatusValues,
  type FeedStatus,
} from "@/lib/config/notification-feed"
import type {
  NotificationActionState,
  NotificationAudience,
  NotificationCategory,
  Prisma,
} from "@/lib/generated/prisma/client"

/**
 * The reads behind the notification feed, in **every** mode — the learner's
 * `/dashboard/notifications` and the console's
 * `/dashboard/admin/notifications` are one query path with a different
 * `audience`, built to
 * `ui-design/light/dashboard/instructor/notifications-page.png`.
 *
 * Pulls in `lib/db`, so the usual "never from a Client Component" rule
 * applies; the copy and the per-mode category sets live in
 * `lib/config/notification-feed.ts` so the page can import them freely.
 *
 * **This is the feed, not the preferences.** The settings pages decide what
 * you are *emailed* about; this is what has actually happened. For the admin
 * the two share a category vocabulary on purpose — see `feedCategories`.
 *
 * Four things decide what the page means:
 *
 *  - **Filtering, searching and paging happen in SQL, driven by the URL**
 *    (`?cat=&status=&q=&page=`), not in the browser. A feed grows without
 *    bound, so "all of it" is the one size it will never be safe to ship to
 *    a client — and the query string buys what `useState` cannot: a filtered
 *    view is a link, the back button walks the filters, and a reload keeps
 *    them. `parseFeedQuery` is the gate, the arrangement the audit log uses.
 *  - **Category counts are unread counts, and they ignore the current
 *    category.** The export draws a number beside four of its six rows and
 *    none beside Billing, which is exactly what "how many unread of this
 *    type" produces. Counting under the *selected* category would make every
 *    other row read zero, which is the reasoning the audit log's tab counts
 *    record. They do respect the search, for the same reason its do.
 *  - **The relative timestamp is formatted on the server** and crosses as a
 *    string, measured against one `now` captured at the top of the read so
 *    every row on a page agrees about when that was. Two reasons, both the
 *    audit log's: it keeps `date-fns` out of the client bundle, and a
 *    relative time computed on both sides of the boundary is a hydration
 *    mismatch waiting for a row to sit on a minute boundary.
 *  - **The actor's name and avatar are read live**, unlike the audit log's
 *    snapshots. A notification is a live pointer at a person you may be about
 *    to act on — the export's own actor row offers Accept and Decline — so
 *    showing a stale name would be worse than showing none.
 */

export type FeedActor = {
  name: string
  image: string | null
  initials: string
}

export type FeedNotification = {
  id: string
  category: NotificationCategory
  title: string
  body: string | null
  /** "5 minutes ago" — formatted here; see the module note. */
  age: string
  unread: boolean
  actor: FeedActor | null
  action: { type: string; state: NotificationActionState } | null
}

export type FeedCategoryCount = {
  value: NotificationCategory
  /** Unread in this category, under the current search. Zero renders no badge. */
  count: number
}

export type FeedPage = {
  rows: FeedNotification[]
  total: number
  unread: number
  counts: FeedCategoryCount[]
  page: number
  pageCount: number
  query: FeedQuery
}

export type FeedQuery = {
  category: NotificationCategory | null
  status: FeedStatus
  search: string
  page: number
}

/**
 * Turns whatever arrived in the URL into a query this module will act on.
 *
 * Exported because the page, the category card and the pager all have to
 * agree on it, and because a hand-edited query string has to resolve to
 * something sane rather than reaching Prisma. An unknown category or status
 * falls back rather than erroring — a bad link should show the unfiltered
 * feed, not a crash.
 */
export function parseFeedQuery(
  audience: NotificationAudience,
  params: {
    cat?: string | string[]
    status?: string | string[]
    q?: string | string[]
    page?: string | string[]
  }
): FeedQuery {
  const allowed = feedCategoryValues(audience)
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const rawCat = one(params.cat)
  const rawStatus = one(params.status)
  const rawPage = Number(one(params.page))

  return {
    category:
      rawCat && allowed.has(rawCat) ? (rawCat as NotificationCategory) : null,
    status:
      rawStatus && feedStatusValues.has(rawStatus)
        ? (rawStatus as FeedStatus)
        : "all",
    search: (one(params.q) ?? "").trim().slice(0, FEED_SEARCH_MAX),
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1,
  }
}

/** The categories a given mode's feed will ever show — the filter every query
 *  starts from, so a row written for one audience can never leak into
 *  another's list even if the audience column were wrong. */
function categoriesFor(audience: NotificationAudience) {
  return feedCategories[audience].map((entry) => entry.value)
}

function searchFilter(search: string): Prisma.NotificationWhereInput {
  if (!search) return {}
  return {
    OR: [
      { title: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
    ],
  }
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const [first, last] = [parts[0], parts[parts.length - 1]]
  return (
    first.charAt(0) + (parts.length > 1 ? last.charAt(0) : "")
  ).toUpperCase()
}

export async function getNotificationFeed(
  audience: NotificationAudience,
  query: FeedQuery
): Promise<FeedPage | null> {
  const session = await getSession()
  if (!session) return null

  const now = new Date()
  const categories = categoriesFor(audience)
  const base: Prisma.NotificationWhereInput = {
    userId: session.user.id,
    audience,
    category: { in: categories },
  }
  const searched = { ...base, ...searchFilter(query.search) }

  const where: Prisma.NotificationWhereInput = {
    ...searched,
    ...(query.category ? { category: query.category } : {}),
    ...(query.status === "unread" ? { readAt: null } : {}),
    ...(query.status === "read" ? { NOT: { readAt: null } } : {}),
  }

  const [total, unread, grouped] = await Promise.all([
    db.notification.count({ where }),
    // The header pill: unread across the whole feed, not the current view. It
    // is a count of work outstanding, and narrowing it by a filter the reader
    // just applied would make the number jump about for no reason.
    db.notification.count({ where: { ...base, readAt: null } }),
    // One grouped query rather than five counts — the category card needs a
    // number per row and a round trip each would be five.
    db.notification.groupBy({
      by: ["category"],
      where: { ...searched, readAt: null },
      _count: { _all: true },
    }),
  ])

  const pageCount = Math.max(1, Math.ceil(total / FEED_PAGE_SIZE))
  const page = Math.min(query.page, pageCount)

  const rows = await db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * FEED_PAGE_SIZE,
    take: FEED_PAGE_SIZE,
    select: {
      id: true,
      category: true,
      title: true,
      body: true,
      readAt: true,
      createdAt: true,
      actorId: true,
      action: { select: { actionType: true, state: true } },
    },
  })

  // Actors are resolved in one query rather than a join per row: `actorId` is
  // a plain column, not a relation (a notification can point at somebody who
  // has since been deleted), so there is nothing for Prisma to include.
  const actorIds = [
    ...new Set(rows.map((row) => row.actorId).filter((id) => id !== null)),
  ]
  const actors = actorIds.length
    ? await db.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, image: true },
      })
    : []
  const actorById = new Map(actors.map((actor) => [actor.id, actor]))

  return {
    rows: rows.map((row) => {
      const actor = row.actorId ? actorById.get(row.actorId) : undefined
      return {
        id: row.id,
        category: row.category,
        title: row.title,
        body: row.body,
        // Measured against the one `now` captured at the top of this read,
        // not against `Date.now()` per row: every row in a page then agrees
        // about what "now" was, and the render stays pure — the arrangement
        // `audit-format.ts` records.
        age: `${formatDistanceStrict(row.createdAt, now)} ago`,
        unread: row.readAt === null,
        actor: actor
          ? {
              name: actor.name,
              image: actor.image,
              initials: initialsOf(actor.name),
            }
          : null,
        action: row.action
          ? { type: row.action.actionType, state: row.action.state }
          : null,
      }
    }),
    total,
    unread,
    counts: categories.map((value) => ({
      value,
      count:
        grouped.find((entry) => entry.category === value)?._count._all ?? 0,
    })),
    page,
    pageCount,
    query: { ...query, page },
  }
}

/** The unread badge on a shell's header bell and its sidebar row. Cheap
 *  enough to run in the layout on every view. */
export async function getUnreadCount(
  audience: NotificationAudience
): Promise<number> {
  const session = await getSession()
  if (!session) return 0

  return db.notification.count({
    where: {
      userId: session.user.id,
      audience,
      category: { in: categoriesFor(audience) },
      readAt: null,
    },
  })
}
