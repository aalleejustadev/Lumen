import type { Metadata } from "next"

import { AuditLogPage } from "@/components/dashboard/admin/audit-log/audit-log-page"
import { parseAuditQuery } from "@/lib/admin/audit-log"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Audit Log · ${siteConfig.name}`,
}

/**
 * The console's Audit Log. The role guard lives in `app/(admin)/layout.tsx`,
 * which covers every route in this group.
 *
 * The filter, search and page number are read from the URL rather than held in
 * the browser — see `lib/admin/audit-log.ts` — so this page re-renders on the
 * server for each of them, and `parseAuditQuery` is what stops a hand-edited
 * query string reaching a query.
 */
export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <AuditLogPage query={parseAuditQuery(params)} />
}
