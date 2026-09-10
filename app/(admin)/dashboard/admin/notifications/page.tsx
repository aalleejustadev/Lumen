import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { NotificationsFeed } from "@/components/dashboard/notifications/notifications-feed"
import { getNotificationFeed, parseFeedQuery } from "@/lib/notification-feed"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Notifications · ${siteConfig.name}`,
}

/**
 * `/dashboard/admin/notifications` — the console's notification feed.
 *
 * The page itself is `components/dashboard/notifications/`, shared with the
 * learner's `/dashboard/notifications`; the only thing this route decides is
 * the **audience**, which selects the category vocabulary and the lead line.
 * See `lib/config/notification-feed.ts`.
 *
 * **This is the feed, not the preferences** — `/dashboard/admin/settings/
 * notifications` is the other page, and the gear button links them.
 *
 * The role guard lives in `app/(admin)/layout.tsx`.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const feed = await getNotificationFeed(
    "ADMIN",
    parseFeedQuery("ADMIN", params)
  )
  if (!feed) redirect("/login")

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <NotificationsFeed audience="ADMIN" feed={feed} />
    </main>
  )
}
