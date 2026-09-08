import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PlatformOverview } from "@/components/dashboard/admin/platform-overview"
import { getSession } from "@/lib/auth"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Platform Overview · ${siteConfig.name}`,
}

/**
 * The admin console's landing page. Reached from "Admin console" in the
 * account menu, which the dashboard shell only renders to admins — but that
 * menu is a decoration and this is the gate: the route group's layout checks
 * for *a* session, not for this role, so the check has to be here.
 *
 * `notFound()` rather than a redirect, deliberately. A signed-in learner who
 * guesses the URL should not be able to tell the difference between "you may
 * not see this" and "there is nothing here"; a 403 confirms the console
 * exists, and the console's own pages are the map of what the platform can do.
 */
export default async function AdminOverviewPage() {
  const session = await getSession()
  if (session?.user.role !== "admin") notFound()

  return <PlatformOverview />
}
