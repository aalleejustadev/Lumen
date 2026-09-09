import { cache } from "react"

import { db } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"

/**
 * Reads for `/dashboard/admin/audit-log`, from
 * `ui-design/light/dashboard/admin/audit-log-page__admin.png`.
 *
 * Pulls in `lib/db`, so the same "never import this from a Client Component"
 * rule as the rest of `lib/admin/` applies.
 *
 * **Filtering, searching and paging all happen here, in SQL.** The page's
 * controls write to the URL and this module reads it, rather than the browser
 * receiving the whole log and filtering it in memory — the table is
 * append-only with a 24-month retention, so "all of it" is the one size it
 * will never be safe to ship. It also makes every view a shareable link and
 * makes the back button work, which a `useState` filter cannot.
 */

export const AUDIT_PAGE_SIZE = 10
/**
 * The ceiling on "Export log". A CSV is built in memory and handed to the
 * browser, so it needs a bound; 5,000 rows is far past what anyone reads in
 * one sitting and still small enough to build without straining a request.
 */
export const AUDIT_EXPORT_LIMIT = 5000

export type AuditCategory = "MEMBERS" | "COURSES" | "BILLING" | "SECURITY"

/** The tab values the page understands, "all" included. */
export type AuditTab = "all" | Lowercase<AuditCategory>

export type AuditQuery = {
  tab: AuditTab
  /** Free text across member, action, target and IP. */
  query: string
  page: number
}

export type AuditEntry = {
  id: string
  actorName: string
  /** "admin" | "instructor" | … | null for the System actor. */
  actorRole: string | null
  /** The actor's current avatar. Null for System and for deleted accounts. */
  actorImage: string | null
  action: string
  targetLabel: string | null
  targetType: string | null
  category: AuditCategory
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export type AuditPage = {
  entries: AuditEntry[]
  /** Rows matching the current filter, across every page. */
  total: number
  page: number
  pageCount: number
  /** Per-tab counts for the filter row, under the *search* but not the tab. */
  counts: Record<AuditTab, number>
  /**
   * When this view was read. The table describes every row against it ("2 days
   * ago"), so one clock for the whole page is what stops two rows a
   * millisecond apart being measured from different instants — and reading the
   * clock here rather than in the component keeps the render itself pure.
   */
  generatedAt: Date
}

/**
 * Turns whatever arrived in the URL into a query this module will act on.
 * Exported because the page, the pagination links and the export action all
 * have to agree on it — and because a hand-edited `?page=-4&tab=../../etc`
 * has to resolve to something sane rather than reaching Prisma.
 */
export function parseAuditQuery(params: {
  tab?: string | string[]
  q?: string | string[]
  page?: string | string[]
}): AuditQuery {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const tab = first(params.tab)
  const page = Number(first(params.page))

  return {
    tab: isAuditTab(tab) ? tab : "all",
    // Trimmed and capped: the column it searches is short, and an unbounded
    // string in a `contains` is a needless way to make Postgres work hard.
    query: (first(params.q) ?? "").trim().slice(0, 100),
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  }
}

const AUDIT_TABS: AuditTab[] = [
  "all",
  "members",
  "courses",
  "billing",
  "security",
]

function isAuditTab(value: unknown): value is AuditTab {
  return typeof value === "string" && AUDIT_TABS.includes(value as AuditTab)
}

/** The `where` both the table and the export build from one description. */
function auditWhere({ tab, query }: Pick<AuditQuery, "tab" | "query">) {
  const where: Prisma.AuditLogWhereInput = {}

  if (tab !== "all") {
    where.category = tab.toUpperCase() as AuditCategory
  }

  if (query) {
    // The four columns the export's own placeholder promises ("Search actions
    // or members") plus the two a security review actually gets opened for.
    where.OR = [
      { actorName: { contains: query, mode: "insensitive" } },
      { action: { contains: query, mode: "insensitive" } },
      { targetLabel: { contains: query, mode: "insensitive" } },
      { ipAddress: { contains: query, mode: "insensitive" } },
    ]
  }

  return where
}

const AUDIT_SELECT = {
  id: true,
  actorName: true,
  actorRole: true,
  action: true,
  targetLabel: true,
  targetType: true,
  category: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true,
  // The avatar is the *live* account's, unlike every other actor field here:
  // a name and a role are snapshots because history must not be rewritten,
  // but a picture is not a fact about the action, and showing a stale one
  // would mean storing a copy of every avatar the log has ever seen.
  actor: { select: { image: true } },
} satisfies Prisma.AuditLogSelect

function toEntry(row: {
  actor: { image: string | null } | null
  category: string
  actorRole: string | null
  [key: string]: unknown
}): AuditEntry {
  const { actor, ...rest } = row
  return {
    ...(rest as Omit<AuditEntry, "actorImage">),
    actorImage: actor?.image ?? null,
  }
}

export const getAuditPage = cache(async function getAuditPage(
  input: AuditQuery
): Promise<AuditPage> {
  const where = auditWhere(input)

  const [total, counts, rows] = await Promise.all([
    db.auditLog.count({ where }),
    // Tab counts respect the search but not the tab — a tab has to be able to
    // say how many rows it *would* show, or the counts would all read as the
    // current tab's total.
    db.auditLog.groupBy({
      by: ["category"],
      where: auditWhere({ tab: "all", query: input.query }),
      _count: { _all: true },
    }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
      select: AUDIT_SELECT,
    }),
  ])

  const byCategory = new Map(
    counts.map((row) => [row.category as AuditCategory, row._count._all])
  )

  return {
    entries: rows.map(toEntry),
    generatedAt: new Date(),
    total,
    page: input.page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    counts: {
      all: counts.reduce((sum, row) => sum + row._count._all, 0),
      members: byCategory.get("MEMBERS") ?? 0,
      courses: byCategory.get("COURSES") ?? 0,
      billing: byCategory.get("BILLING") ?? 0,
      security: byCategory.get("SECURITY") ?? 0,
    },
  }
})

/** Every row matching a filter, up to `AUDIT_EXPORT_LIMIT`, for the CSV. */
export async function getAuditExport(
  input: Pick<AuditQuery, "tab" | "query">
): Promise<AuditEntry[]> {
  const rows = await db.auditLog.findMany({
    where: auditWhere(input),
    orderBy: { createdAt: "desc" },
    take: AUDIT_EXPORT_LIMIT,
    select: AUDIT_SELECT,
  })

  return rows.map(toEntry)
}
