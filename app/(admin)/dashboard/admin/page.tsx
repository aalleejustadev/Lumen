import type { Metadata } from "next"
import { PlatformOverview } from "@/components/dashboard/admin/platform-overview"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Platform Overview · ${siteConfig.name}`,
}

/**
 * The admin console's landing page. Reached from "Admin console" in the
 * student shell's account menu, and left again through "Exit admin mode" in
 * this one's.
 *
 * The role guard lives in `app/(admin)/layout.tsx` — it has to cover every
 * page in the console, not just this one, and that layout is the only thing
 * every console route shares.
 */
export default async function AdminOverviewPage() {
  return <PlatformOverview />
}
