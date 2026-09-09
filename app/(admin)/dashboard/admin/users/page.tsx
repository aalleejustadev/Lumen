import type { Metadata } from "next"

import { UsersPage } from "@/components/dashboard/admin/users/users-page"
import { parseUsersQuery } from "@/lib/admin/users"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Users · ${siteConfig.name}`,
}

/**
 * The console's Users table. The role guard lives in `app/(admin)/layout.tsx`,
 * which covers every route in this group.
 *
 * The tab, search, status, plan and page number are all read from the URL —
 * see `lib/admin/users.ts` for why they live there rather than in the browser
 * — so this page re-renders on the server for each of them, and
 * `parseUsersQuery` is what stops a hand-edited query string reaching Prisma.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <UsersPage query={parseUsersQuery(params)} />
}
