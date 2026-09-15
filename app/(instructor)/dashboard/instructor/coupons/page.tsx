import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CouponsPage } from "@/components/dashboard/instructor/coupons/coupons-page"
import { getCouponsPage, parseCouponsQuery } from "@/lib/instructor-coupons"
import { getPlatformSettings } from "@/lib/admin/settings"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Coupons · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/coupons` — the instructor's discount codes, from
 * `ui-design/light/dashboard/instructor/coupons-page__main.png`. The sidebar
 * has pointed here since the shell was built; this is the route it was
 * pointing at.
 *
 * `notFound()` when there is no teaching profile rather than a redirect: the
 * shell's own guard has already established the account may teach, so the only
 * way to reach this branch is an account whose `Instructor` row went away
 * mid-request, and the console's reasoning about not distinguishing "you may
 * not see this" from "there is nothing here" applies just as well.
 *
 * The revenue share comes from the `PlatformSetting` singleton an admin edits
 * at `/dashboard/admin/settings/platform`, read through the same
 * `getPlatformSettings` the Help Center's FAQ answers use rather than a second
 * copy — it is what the dialog's callout quotes, and a platform-wide rule
 * stated in two places is free to drift from the one the money runs on.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const [page, settings] = await Promise.all([
    getCouponsPage(parseCouponsQuery(params)),
    getPlatformSettings(),
  ])
  if (!page) notFound()

  return (
    <CouponsPage
      page={page}
      revenueShareBps={settings.defaultRevenueShareBps}
    />
  )
}
