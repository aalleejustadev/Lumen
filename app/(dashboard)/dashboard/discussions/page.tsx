import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { DiscussionsBoard } from "@/components/dashboard/discussions/discussions-board"
import { getDiscussionsPage, parseDiscussionsQuery } from "@/lib/discussions"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Discussions · ${siteConfig.name}`,
}

/**
 * `/dashboard/discussions` — the learner's community feed, from
 * `ui-design/light/dashboard/student/discussions-page.png`. The sidebar has
 * linked here since the shell was built, onto a 404; this is the route it was
 * pointing at.
 *
 * Everything but the audience is shared with the instructor's page —
 * `components/dashboard/discussions/` and one query path in
 * `lib/discussions.ts`. `LEARNER` drops the stat row, the moderation strip,
 * the two compose buttons, the All / Mine / Unanswered switch and the row
 * menu, and adds the header note; it does **not** narrow the feed beyond topic
 * visibility, because the two exports draw the same threads.
 *
 * The session guard lives in `app/(dashboard)/layout.tsx`. What a learner may
 * *see* is narrower than the session, and that is enforced in SQL:
 * `STAFF_ONLY` topics never reach this page.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = await getDiscussionsPage(
    "LEARNER",
    parseDiscussionsQuery(params)
  )
  if (!page) redirect("/login")

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <DiscussionsBoard audience="LEARNER" page={page} />
    </main>
  )
}
