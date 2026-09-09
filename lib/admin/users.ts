import { cache } from "react"

import { db } from "@/lib/db"
import { USERS_PAGE_SIZE } from "@/lib/config/admin-users"
import type { Prisma, UserStatus } from "@/lib/generated/prisma/client"

/**
 * Reads for `/dashboard/admin/users`, from
 * `ui-design/light/dashboard/admin/users-page__admin.png`.
 *
 * Pulls in `lib/db`, so the same "never import this from a Client Component"
 * rule as the rest of `lib/admin/` applies.
 *
 * **Nothing on the page is demo data.** The four KPI tiles are four counts,
 * the table is one query, and the copy the numbers land in lives in
 * `lib/config/admin-users.ts` — the same split Platform Overview and Reports
 * make.
 *
 * Like the audit log, **filtering, searching and paging all happen here, in
 * SQL, driven by the URL.** The `user` table is the largest on the platform;
 * shipping it to the browser to filter with `Array.prototype.filter` is the
 * one approach that can never work. Putting the query in the query string
 * also buys what `useState` cannot: a filtered view is a link, the back button
 * walks the filters, and a reload keeps them.
 *
 * `USERS_PAGE_SIZE` and `isUsersFiltered` live in `lib/config/admin-users.ts`
 * rather than here, even though this is the module that acts on them: the
 * table is a Client Component and needs both, and importing *any* value from
 * this file would drag `lib/db` — and with it the Postgres driver — into the
 * browser bundle. Types are safe (they are erased); values are not.
 */

/** The five segments in the toolbar, in the order the export draws them. */
export type UsersTab =
  "all" | "students" | "instructors" | "admins" | "pending-instructors"

/**
 * How a row's **Plan** cell reads. Not a column on `User`: Lumen Business is a
 * Stripe subscription, and `Subscription`'s own note explains why "is this
 * account on Business?" is a query for a live row rather than a flag that
 * could fall out of step with Stripe.
 */
export type UserPlan = "free" | "business"

export type UsersQuery = {
  tab: UsersTab
  /** Free text across name and email. */
  query: string
  /** From the Filters popover. Empty means every status. */
  statuses: UserStatus[]
  /** From the Filters popover. `null` means either plan. */
  plan: UserPlan | null
  page: number
}

export type UserRow = {
  id: string
  name: string
  email: string
  image: string | null
  /** The raw Better Auth role; `null` and "user" both read as a student. */
  role: string | null
  plan: UserPlan
  /** ISO-3166 alpha-2, or null for an account that never said. */
  country: string | null
  status: UserStatus
  /**
   * The teaching profile's slug, when there is one. It is the only public
   * page any account has, so it decides whether the row menu's "View profile"
   * goes anywhere — see `user-row-actions.tsx`.
   */
  instructorSlug: string | null
}

export type UsersPage = {
  rows: UserRow[]
  /** Accounts matching the current filter, across every page. */
  total: number
  page: number
  pageCount: number
  /** Per-tab counts for the toolbar, under the search but not the tab. */
  counts: Record<UsersTab, number>
}

export type UserStats = {
  total: number
  /** Distinct accounts with a session seen in the last seven days. */
  activeThisWeek: number
  instructors: number
  /** Accounts created in the last 30 days. */
  newThisMonth: number
}

const DAY = 24 * 60 * 60 * 1000

const USER_STATUSES: UserStatus[] = [
  "ACTIVE",
  "PENDING",
  "INACTIVE",
  "SUSPENDED",
]

const USERS_TABS: UsersTab[] = [
  "all",
  "students",
  "instructors",
  "admins",
  // Spelled out rather than "pending", which would collide in a reader's head
  // with `?status=PENDING` — a different filter entirely. It is also the
  // spelling `attentionQueues` already links at, and the two must agree.
  "pending-instructors",
]

/**
 * Turns whatever arrived in the URL into a query this module will act on.
 * Exported because the page, the toolbar and the pagination links all have to
 * agree on it — and because a hand-edited `?page=-3&status=DROP+TABLE` has to
 * resolve to something sane rather than reaching Prisma.
 */
export function parseUsersQuery(params: {
  tab?: string | string[]
  q?: string | string[]
  status?: string | string[]
  plan?: string | string[]
  page?: string | string[]
}): UsersQuery {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const tab = first(params.tab)
  const plan = first(params.plan)
  const page = Number(first(params.page))

  // Repeated (`?status=ACTIVE&status=PENDING`) or comma-separated — a
  // hand-written link may use either, and both mean the same thing.
  const statuses = (
    Array.isArray(params.status)
      ? params.status
      : (params.status ?? "").split(",")
  )
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is UserStatus =>
      USER_STATUSES.includes(value as UserStatus)
    )

  return {
    tab: USERS_TABS.includes(tab as UsersTab) ? (tab as UsersTab) : "all",
    // Trimmed and capped for the reason `parseAuditQuery` gives: an unbounded
    // string in a `contains` is a needless way to make Postgres work hard.
    query: (first(params.q) ?? "").trim().slice(0, 100),
    statuses: [...new Set(statuses)],
    plan: plan === "free" || plan === "business" ? plan : null,
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  }
}

/**
 * A live Business subscription. `Subscription` is not unique per user — a
 * lapsed one is history worth keeping — so the plan is "has a row in one of
 * these two states", never a column read. TRIALING counts: someone inside a
 * trial has the plan, they just haven't paid for it yet.
 */
const LIVE_SUBSCRIPTION = {
  status: { in: ["ACTIVE", "TRIALING"] },
} satisfies Prisma.SubscriptionWhereInput

/**
 * The tab half of the `where`, kept apart from the rest so the per-tab counts
 * can be built by swapping just this piece.
 *
 * Students are `role` "user" *or* null rather than an explicit value: Better
 * Auth writes no role on a plain sign-up, and an account with none is a
 * learner. Getting that wrong would leave real accounts in "All users" and in
 * none of the four tabs beneath it.
 */
function tabWhere(tab: UsersTab): Prisma.UserWhereInput {
  switch (tab) {
    case "students":
      return { OR: [{ role: "user" }, { role: null }] }
    case "instructors":
      return { role: "instructor" }
    case "admins":
      return { role: "admin" }
    case "pending-instructors":
      // People waiting on a decision, not people whose *account* is `PENDING`
      // — a different thing that happens to share the word, which is why the
      // tab is spelled out in the URL. `InstructorApplication`'s own note
      // names this tab.
      return { instructorApplications: { some: { status: "PENDING" } } }
    default:
      return {}
  }
}

function usersWhere(query: UsersQuery): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = { ...tabWhere(query.tab) }

  if (query.query) {
    where.OR = [
      { name: { contains: query.query, mode: "insensitive" } },
      { email: { contains: query.query, mode: "insensitive" } },
    ]
  }

  if (query.statuses.length > 0) {
    where.status = { in: query.statuses }
  }

  if (query.plan === "business") {
    where.subscriptions = { some: LIVE_SUBSCRIPTION }
  } else if (query.plan === "free") {
    where.subscriptions = { none: LIVE_SUBSCRIPTION }
  }

  return where
}

/**
 * The tab's `where` swapped for another, with the search, status and plan
 * filters left in place. A tab has to be able to say how many rows it *would*
 * show, so its own filter is the one thing the count ignores — the same rule
 * the audit log's tab counts follow.
 */
function countsWhere(query: UsersQuery, tab: UsersTab): Prisma.UserWhereInput {
  return usersWhere({ ...query, tab })
}

export const getUsersPage = cache(async function getUsersPage(
  input: UsersQuery
): Promise<UsersPage> {
  const where = usersWhere(input)

  const [total, rows, ...counts] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      // Newest first, which is what the export's own page one is: the seed
      // gives its eight featured accounts the most recent signup dates, in
      // the order they are drawn.
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * USERS_PAGE_SIZE,
      take: USERS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        country: true,
        status: true,
        // `take: 1` rather than a boolean: the row only needs to know whether
        // one exists, and this is the cheapest shape Prisma will express that
        // in on a to-many relation.
        subscriptions: {
          where: LIVE_SUBSCRIPTION,
          take: 1,
          select: { id: true },
        },
        instructorProfile: { select: { slug: true } },
      },
    }),
    ...USERS_TABS.map((tab) =>
      db.user.count({ where: countsWhere(input, tab) })
    ),
  ])

  return {
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      role: row.role,
      plan: row.subscriptions.length > 0 ? "business" : "free",
      country: row.country,
      status: row.status,
      instructorSlug: row.instructorProfile?.slug ?? null,
    })),
    total,
    page: input.page,
    pageCount: Math.max(1, Math.ceil(total / USERS_PAGE_SIZE)),
    counts: Object.fromEntries(
      USERS_TABS.map((tab, index) => [tab, counts[index] ?? 0])
    ) as Record<UsersTab, number>,
  }
})

/**
 * The four KPI tiles.
 *
 * **"Active this week" is read off `Session`**, which is the only real
 * liveness signal the platform has: Better Auth refreshes a session's
 * `updatedAt` once a day for anyone still browsing (`session.updateAge` in
 * `lib/auth.ts`), so "seen in the last seven days" is a genuine question that
 * table can answer. A `distinct` count over `userId` rather than a count of
 * rows — one person with a phone and a laptop is one active account — and
 * expired sessions are excluded so a token that lapsed mid-window doesn't
 * keep counting.
 *
 * **"Instructors" counts `role = "instructor"`**, the same definition the
 * Instructors *tab* filters on, so the tile and the tab can never disagree.
 * That is deliberately not `canBecomeInstructor`'s test (an `Instructor` row
 * pointing at the account), which is the right question for "should we still
 * be inviting this person to teach" and the wrong one for a column the table
 * renders from `User.role`.
 */
export async function getUserStats(): Promise<UserStats> {
  const now = Date.now()
  const weekAgo = new Date(now - 7 * DAY)
  const monthAgo = new Date(now - 30 * DAY)

  const [total, active, instructors, newThisMonth] = await Promise.all([
    db.user.count(),
    db.session
      .findMany({
        where: { updatedAt: { gte: weekAgo }, expiresAt: { gt: new Date() } },
        distinct: ["userId"],
        select: { userId: true },
      })
      .then((rows) => rows.length),
    db.user.count({ where: { role: "instructor" } }),
    db.user.count({ where: { createdAt: { gte: monthAgo } } }),
  ])

  return { total, activeThisWeek: active, instructors, newThisMonth }
}
