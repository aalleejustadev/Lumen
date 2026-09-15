import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { MessagesPage } from "@/components/dashboard/messages/messages-page"
import { getMessagesPage, parseMessagesQuery } from "@/lib/messages"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Messages · ${siteConfig.name}`,
}

/**
 * `/dashboard/messages` — the learner's inbox, from
 * `ui-design/light/dashboard/student/messages-page.png`.
 *
 * The sidebar has linked here since the shell was built, onto a 404; this is
 * the route it was always pointing at.
 *
 * Everything but the audience is shared with the instructor's inbox —
 * `components/dashboard/messages/` and one query path in `lib/messages.ts`.
 * `LEARNER` selects the threads about courses this account is *enrolled in*,
 * which is what keeps them out of `/dashboard/instructor/messages` for
 * somebody who both teaches and studies; see `MessageAudience` for why that is
 * derived from the course rather than stored on the conversation.
 *
 * The session guard lives in `app/(dashboard)/layout.tsx`, which covers every
 * route in the group. There is no enrolment gate on the *page* — enrolment is
 * what decides who you may write *to*, and that is enforced per conversation
 * by `resolvePairing`, on every read and every write.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const data = await getMessagesPage("LEARNER", parseMessagesQuery(params))
  if (!data) redirect("/login")

  return <MessagesPage audience="LEARNER" data={data} />
}
