import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { InstructorHelpPage } from "@/components/dashboard/instructor/help/instructor-help-page"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { getPlatformSettings } from "@/lib/admin/settings"
import { siteConfig } from "@/lib/config/site"
import type { HelpFacts } from "@/lib/config/instructor-help"

export const metadata: Metadata = {
  title: `Help Center · ${siteConfig.name}`,
}

/** Cents to "$100" — whole dollars, since the threshold always is one. */
function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

/**
 * `/dashboard/instructor/help` — the instructor Help Center.
 *
 * The page itself is `components/dashboard/instructor/help/`; all this route
 * decides is the **facts its answers quote**. A help page is where a platform
 * states its own rules, so the revenue share and the payout schedule are read
 * rather than written into the copy — otherwise they would be a second source
 * of truth, free to drift from the numbers the money actually runs on.
 *
 * `getPlatformSettings` comes from `lib/admin/settings.ts` despite this not
 * being an admin page: that function reads the `PlatformSetting` *singleton*,
 * which is platform-wide rather than console-specific, and a second reader for
 * the same row is exactly the drift this page is trying to avoid.
 *
 * The payout figures are the signed-in instructor's own columns — the schedule
 * `payout-settings-page.png` lets them edit — so the answer is true for the
 * person reading it. An account in this shell by way of the `instructor` role
 * without a profile row yet has no schedule of its own, so it falls back to
 * the model's defaults, which are the same numbers a new profile is created
 * with.
 *
 * The role guard lives in `app/(instructor)/layout.tsx`.
 */
export default async function Page() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [settings, instructor] = await Promise.all([
    getPlatformSettings(),
    db.instructor.findUnique({
      where: { userId: session.user.id },
      select: { payoutDayOfMonth: true, minimumPayoutCents: true },
    }),
  ])

  const facts: HelpFacts = {
    revenueSharePercent: Math.round(settings.defaultRevenueShareBps / 100),
    payoutDayOfMonth: instructor?.payoutDayOfMonth ?? 1,
    minimumPayout: formatMoney(instructor?.minimumPayoutCents ?? 10000),
    supportEmail: settings.supportEmail,
  }

  return <InstructorHelpPage facts={facts} />
}
