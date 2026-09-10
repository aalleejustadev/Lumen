import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { NotificationsFeed } from "@/components/dashboard/notifications/notifications-feed"
import { getNotificationFeed, parseFeedQuery } from "@/lib/notification-feed"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Notifications · ${siteConfig.name}`,
}

/**
 * `/dashboard/notifications` — the learner's notification feed, from
 * `ui-design/light/dashboard/instructor/notifications-page.png`.
 *
 * **This link existed before the page did.** The student sidebar's General
 * group and the app bar's bell both pointed here while there was no route at
 * all, so both were dead; building the console feed first is what made the
 * gap visible. The page is the same component the console uses, with a
 * different `audience` — the learner's five categories are the export's own
 * (Course, Message, Community, Certificate, Billing).
 *
 * These are notification *events* — a different page from
 * `/dashboard/settings/notifications`, which is the preferences the gear
 * button in this page's header links to.
 *
 * The session guard lives in `app/(dashboard)/layout.tsx`; `null` here means
 * the row vanished mid-request.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const feed = await getNotificationFeed(
    "LEARNER",
    parseFeedQuery("LEARNER", params)
  )
  if (!feed) redirect("/login")

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <NotificationsFeed audience="LEARNER" feed={feed} />
    </main>
  )
}
