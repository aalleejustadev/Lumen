import type { Metadata } from "next"

import { ReportsPage } from "@/components/dashboard/admin/reports/reports-page"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Reports · ${siteConfig.name}`,
}

/**
 * The console's Reports page. The role guard lives in
 * `app/(admin)/layout.tsx`, which covers every route in this group.
 */
export default async function AdminReportsPage() {
  return <ReportsPage />
}
