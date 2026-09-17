import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ReviewsPage } from "@/components/dashboard/instructor/reviews/reviews-page"
import { siteConfig } from "@/lib/config/site"
import { getReviewsPage, parseReviewsQuery } from "@/lib/instructor-reviews"

export const metadata: Metadata = {
  title: `Reviews · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/reviews` — every rating left on this instructor's
 * courses, with the reply they gave it.
 *
 * `notFound()` rather than a redirect when the read comes back null, which it
 * does for an account with no teaching profile: the role guard in
 * `app/(instructor)/layout.tsx` already covers the whole group, so this is the
 * narrower "you have no courses to be reviewed" case, and the console's
 * reasoning about not distinguishing "you may not see this" from "there is
 * nothing here" applies to it too — the call `students/page.tsx` makes.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = await getReviewsPage(parseReviewsQuery(params))
  if (!page) notFound()

  return <ReviewsPage page={page} />
}
