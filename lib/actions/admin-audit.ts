"use server"

import {
  AUDIT_EXPORT_LIMIT,
  getAuditExport,
  parseAuditQuery,
  type AuditQuery,
} from "@/lib/admin/audit-log"
import { getSession } from "@/lib/auth"

/** One CSV cell, quoted so a name or an action containing a comma can't split the row. */
function cell(value: string | null) {
  return `"${(value ?? "").replaceAll('"', '""')}"`
}

/**
 * Builds the CSV behind "Export log" for whatever filter is on screen.
 *
 * **The role is re-checked here.** A Server Action is a public endpoint — the
 * console's layout guard covers the page, not this function — and this one
 * hands back the entire audit log, which is the most sensitive table in the
 * app. It also re-parses the filter through `parseAuditQuery` rather than
 * trusting the tab and query it was handed, so a hand-crafted call can't reach
 * Prisma with something the page would never send.
 *
 * Returns the text for the caller to save rather than a file: a Server Action
 * has no way to set `Content-Disposition`, so the browser does the saving.
 * `AUDIT_EXPORT_LIMIT` bounds it, and the caller is told when the cap bit so a
 * truncated export can't be mistaken for a complete one.
 */
export async function exportAuditLog(input: {
  tab?: string
  q?: string
}): Promise<
  | {
      ok: true
      csv: string
      filename: string
      rows: number
      truncated: boolean
    }
  | { ok: false; message: string }
> {
  const session = await getSession()
  if (session?.user.role !== "admin") {
    return { ok: false, message: "You do not have access to the audit log." }
  }

  const parsed: AuditQuery = parseAuditQuery(input)
  const entries = await getAuditExport(parsed)

  const header = [
    "Timestamp (UTC)",
    "Member",
    "Role",
    "Action",
    "Target",
    "Target type",
    "Category",
    "IP address",
  ]

  const csv = [
    header.map((label) => cell(label)).join(","),
    ...entries.map((entry) =>
      [
        // ISO, not the table's "2 days ago": a relative time in a file that
        // outlives the moment it was saved says nothing at all.
        cell(entry.createdAt.toISOString()),
        cell(entry.actorName),
        cell(entry.actorRole ?? "system"),
        cell(entry.action),
        cell(entry.targetLabel),
        cell(entry.targetType),
        cell(entry.category),
        cell(entry.ipAddress),
      ].join(",")
    ),
  ].join("\n")

  const scope = parsed.tab === "all" ? "all" : parsed.tab
  const stamp = new Date().toISOString().slice(0, 10)

  return {
    ok: true,
    csv,
    filename: `lumen-audit-log-${scope}-${stamp}.csv`,
    rows: entries.length,
    truncated: entries.length === AUDIT_EXPORT_LIMIT,
  }
}
