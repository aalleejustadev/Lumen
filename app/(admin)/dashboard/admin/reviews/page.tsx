import type { Metadata } from "next"

import { ReportedReviewsPage } from "@/components/dashboard/admin/reviews/reported-reviews-page"
import { parseReviewsQuery } from "@/lib/admin/reviews"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Reported reviews · ${siteConfig.name}`,
}

/**
 * The console's review moderation queue — every open `ContentReport` filed
 * against a review, which is exactly what the sidebar's Reviews badge counts.
 * The role guard lives in `app/(admin)/layout.tsx`, which covers every route
 * in this group.
 *
 * The page number is read from the URL — see `lib/admin/reviews.ts` — so this
 * page re-renders on the server for each one, and `parseReviewsQuery` is what
 * stops a hand-edited query string reaching Prisma.
 */
export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <ReportedReviewsPage query={parseReviewsQuery(params)} />
}
