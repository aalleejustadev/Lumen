import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DiscussionThread } from "@/components/dashboard/discussions/discussion-thread"
import { getDiscussionDetail } from "@/lib/discussions"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Discussion · ${siteConfig.name}`,
}

/**
 * One thread, from
 * `ui-design/light/dashboard/instructor/discussion-page__individual.png` —
 * the same component both modes render, because that export draws nothing one
 * audience gets and the other does not.
 *
 * The role guard lives in `app/(instructor)/layout.tsx`. What this reader may *see* is narrower than the
 * session, and it is enforced in the read: a thread in a `STAFF_ONLY` topic
 * is unreachable by id as well as by filter, so pasting one gives the same
 * `notFound()` a wrong id gives rather than leaking a title before deciding.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getDiscussionDetail("INSTRUCTOR", id)
  if (!detail) notFound()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <DiscussionThread audience="INSTRUCTOR" detail={detail} />
    </main>
  )
}
