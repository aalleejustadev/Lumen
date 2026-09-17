import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AnalyticsPage } from "@/components/dashboard/instructor/analytics/analytics-page"
import { siteConfig } from "@/lib/config/site"
import {
  getAnalyticsPage,
  parseAnalyticsQuery,
} from "@/lib/instructor-analytics"

export const metadata: Metadata = {
  title: `Analytics · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/analytics` — how this instructor's courses are
 * performing over the selected period.
 *
 * `notFound()` rather than a redirect when the read comes back null, which it
 * does for an account with no teaching profile: the role guard in
 * `app/(instructor)/layout.tsx` already covers the whole group, so this is the
 * narrower "you have nothing to measure" case, and the console's reasoning
 * about not distinguishing "you may not see this" from "there is nothing here"
 * applies to it too — the call `students/page.tsx` and `reviews/page.tsx` both
 * make.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = await getAnalyticsPage(parseAnalyticsQuery(params))
  if (!page) notFound()

  return <AnalyticsPage page={page} />
}
