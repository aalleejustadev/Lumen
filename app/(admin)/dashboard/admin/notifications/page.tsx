import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { NotificationsFeed } from "@/components/dashboard/admin/notifications/notifications-feed"
import { getAdminFeed, parseFeedQuery } from "@/lib/admin/notification-feed"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Notifications · ${siteConfig.name}`,
}

/**
 * `/dashboard/admin/notifications` — the console's notification feed, built
 * to `ui-design/light/dashboard/instructor/notifications-page.png`.
 *
 * That export is the instructor's; the UI is followed as drawn and only the
 * content is made the admin's, at the user's instruction. See
 * `lib/config/admin-notification-feed.ts` for what changed and why.
 *
 * **This is the feed, not the preferences** — `/dashboard/admin/settings/
 * notifications` is the other page, and the gear button in this one's header
 * is what links them.
 *
 * The search, category and status filters are read from the URL, so this page
 * re-renders on the server for each of them; `parseFeedQuery` is what stops a
 * hand-edited query string reaching Prisma. The role guard lives in
 * `app/(admin)/layout.tsx`, which covers every route in this group.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const feed = await getAdminFeed(parseFeedQuery(params))
  if (!feed) redirect("/login")

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <NotificationsFeed feed={feed} />
    </main>
  )
}
