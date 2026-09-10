import type { Metadata } from "next"

import { CommunityPage } from "@/components/dashboard/admin/community/community-page"
import { parseCommunityQuery } from "@/lib/admin/community"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Community · ${siteConfig.name}`,
}

/**
 * The console's community topics and moderators. The role guard lives in
 * `app/(admin)/layout.tsx`, which covers every route in this group.
 *
 * The moderators table's page number is read from the URL — see
 * `lib/admin/community.ts` — so this page re-renders on the server for each
 * one, and `parseCommunityQuery` is what stops a hand-edited query string
 * reaching Prisma.
 */
export default async function AdminCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <CommunityPage query={parseCommunityQuery(params)} />
}
