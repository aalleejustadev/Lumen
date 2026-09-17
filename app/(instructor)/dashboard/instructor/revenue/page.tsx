import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { RevenuePage } from "@/components/dashboard/instructor/revenue/revenue-page"
import { siteConfig } from "@/lib/config/site"
import { getRevenuePage } from "@/lib/instructor-revenue"

export const metadata: Metadata = {
  title: `Revenue & Payouts · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/revenue` — the instructor's ledger and every payout
 * it has produced.
 *
 * `notFound()` rather than a redirect when the read comes back null, which it
 * does for an account with no teaching profile: the role guard in
 * `app/(instructor)/layout.tsx` already covers the whole group, so this is the
 * narrower "you have no ledger to show" case, and the console's reasoning
 * about not distinguishing "you may not see this" from "there is nothing here"
 * applies to it too — the call every other page in this shell makes.
 *
 * It takes no `searchParams`: the page has no filters, which is why it is the
 * one instructor surface with nothing to parse.
 */
export default async function Page() {
  const page = await getRevenuePage()
  if (!page) notFound()

  return <RevenuePage page={page} />
}
