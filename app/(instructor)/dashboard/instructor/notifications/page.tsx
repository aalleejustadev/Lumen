import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { NotificationsFeed } from "@/components/dashboard/notifications/notifications-feed"
import { getNotificationFeed, parseFeedQuery } from "@/lib/notification-feed"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Notifications · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/notifications` — this mode's notification feed, and
 * the third audience to reach the one feed built to
 * `ui-design/light/dashboard/instructor/notifications-page.png`. That export
 * *is* the instructor's, so this route is the page finally rendering on the
 * screen it was drawn for.
 *
 * Everything but the audience is shared with the learner's and the console's
 * feeds — `components/dashboard/notifications/` and one query path in
 * `lib/notification-feed.ts`. The audience selects the category vocabulary
 * (Courses, Students, Messages, Community, Earnings) and the lead line, both
 * of which `lib/config/notification-feed.ts` already carried for INSTRUCTOR
 * before this route existed.
 *
 * `NotificationAudience.INSTRUCTOR` is what keeps these rows out of the other
 * two feeds: "a course" means a lesson you can take to a learner and a
 * submission you must finish to an instructor, so without it an instructor who
 * is also enrolled would see both in one list.
 *
 * The role guard lives in `app/(instructor)/layout.tsx`.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const feed = await getNotificationFeed(
    "INSTRUCTOR",
    parseFeedQuery("INSTRUCTOR", params)
  )
  if (!feed) redirect("/login")

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <NotificationsFeed audience="INSTRUCTOR" feed={feed} />
    </main>
  )
}
