import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { DiscussionsBoard } from "@/components/dashboard/discussions/discussions-board"
import { DiscussionStatsRow } from "@/components/dashboard/discussions/discussion-stats"
import { getDiscussionsPage, parseDiscussionsQuery } from "@/lib/discussions"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Discussions · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/discussions`, from
 * `ui-design/light/dashboard/instructor/discussions-page.png` — the same feed
 * the learner sees, with the stat row, the moderation strip, Announce / New
 * Discussion, the All / Mine / Unanswered switch and a per-row menu on top.
 *
 * The stat row is rendered **here, on the server**, and handed to the board as
 * `children` so its markup and four icons never reach the bundle — the
 * arrangement `community-page.tsx` records.
 *
 * The role guard lives in `app/(instructor)/layout.tsx`. Who may *pin* is
 * narrower than who may teach — `TopicModerator.canPin`, per topic — and
 * `lib/actions/discussions.ts` answers that per write.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = await getDiscussionsPage(
    "INSTRUCTOR",
    parseDiscussionsQuery(params)
  )
  if (!page) redirect("/login")

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <DiscussionsBoard audience="INSTRUCTOR" page={page}>
        {page.stats ? <DiscussionStatsRow stats={page.stats} /> : null}
      </DiscussionsBoard>
    </main>
  )
}
