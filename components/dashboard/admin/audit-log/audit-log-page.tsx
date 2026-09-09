import {
  AuditLogBrowser,
  type AuditRow,
} from "@/components/dashboard/admin/audit-log/audit-log-browser"
import { AuditExportButton } from "@/components/dashboard/admin/audit-log/audit-export-button"
import {
  formatAuditExact,
  formatAuditWhen,
} from "@/components/dashboard/admin/audit-log/audit-format"
import { getAuditPage, type AuditQuery } from "@/lib/admin/audit-log"
import {
  adminAuditCopy,
  auditCategoryLabels,
  auditCategoryStyles,
  auditRoleBadge,
} from "@/lib/config/admin-audit"

/**
 * `/dashboard/admin/audit-log`, from
 * `ui-design/light/dashboard/admin/audit-log-page__admin.png`: the title with
 * its lead and Export log, the category filter row with search, the entries
 * table, and the retention note beneath it.
 *
 * Measured off that export at DPR 2: full content width on the dashboard's
 * usual 32px inset, a 40px filter row 20px under the lead, a zero-padding card
 * whose rows are 68px and flush to its edges, and a 13px muted note 16px below
 * it.
 *
 * The heading carries an explicit `font-bold` for the reason
 * `platform-overview.tsx` gives: `globals.css` sets every `h1` to 800 and the
 * dashboard exports draw 700.
 *
 * **Rows are formatted here, on the server**, and cross to the browser as
 * strings, all measured against the single `generatedAt` clock the read
 * returns. `formatAuditWhen` explains why that matters for the relative
 * timestamp specifically; the pill classes come along for the ride because
 * they are decided by the same row and there is no reason to send the raw enum
 * and re-derive them.
 */
async function AuditLogPage({ query }: { query: AuditQuery }) {
  const page = await getAuditPage(query)

  const rows: AuditRow[] = page.entries.map((entry) => {
    const role = auditRoleBadge(entry.actorRole)
    return {
      id: entry.id,
      actorName: entry.actorName,
      actorImage: entry.actorImage,
      roleLabel: role.label,
      roleClass: role.className,
      action: entry.action,
      target: entry.targetLabel,
      targetType: entry.targetType,
      categoryLabel: auditCategoryLabels[entry.category],
      categoryClass: auditCategoryStyles[entry.category],
      when: formatAuditWhen(entry.createdAt, page.generatedAt.getTime()),
      exact: formatAuditExact(entry.createdAt),
      ip: entry.ipAddress,
      userAgent: entry.userAgent,
    }
  })

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-none font-bold">
            {adminAuditCopy.title}
          </h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {adminAuditCopy.description}
          </p>
        </div>
        <AuditExportButton tab={query.tab} query={query.query} />
      </div>

      <AuditLogBrowser
        rows={rows}
        page={page}
        tab={query.tab}
        query={query.query}
      />
    </main>
  )
}

export { AuditLogPage }
