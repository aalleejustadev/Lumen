import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { MessagesPage } from "@/components/dashboard/messages/messages-page"
import { getMessagesPage, parseMessagesQuery } from "@/lib/messages"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Messages · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/messages` — the instructor's inbox, from
 * `ui-design/light/dashboard/instructor/messages-page.png`. That export is
 * this mode's, so the page is finally rendering on the screen it was drawn
 * for; the learner's twin is the same drawing at different copy.
 *
 * `INSTRUCTOR` selects the threads about courses this account *teaches*. An
 * instructor enrolled in somebody else's course sees those threads in the
 * learner shell instead, which is the whole point of the split — see
 * `MessageAudience`.
 *
 * The role guard lives in `app/(instructor)/layout.tsx`, which covers every
 * route in the group. Who an instructor may actually write to is a narrower
 * question than "may they teach", and it is answered per conversation by
 * `resolvePairing`: only students enrolled in one of *their own* courses.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const data = await getMessagesPage("INSTRUCTOR", parseMessagesQuery(params))
  if (!data) redirect("/login")

  return <MessagesPage audience="INSTRUCTOR" data={data} />
}
