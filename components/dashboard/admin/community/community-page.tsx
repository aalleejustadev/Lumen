import { CommunityBoard } from "@/components/dashboard/admin/community/community-board"
import { CommunityStats } from "@/components/dashboard/admin/community/community-stats"
import {
  getCommunityStats,
  getModerators,
  getTopics,
  type CommunityQuery,
} from "@/lib/admin/community"

/**
 * `/dashboard/admin/community`, from
 * `ui-design/light/dashboard/admin/community-page__admin.png`.
 *
 * The reads happen here and the interactive half is `community-board.tsx`.
 * The stats row is passed to it **as `children`** rather than rendered
 * inside it: a Server Component handed to a Client Component that way stays
 * server-rendered, which is what keeps those four cards and their icons out
 * of the bundle even though the board around them is client.
 *
 * The role guard lives in `app/(admin)/layout.tsx`, which covers every route
 * in the group.
 */
async function CommunityPage({ query }: { query: CommunityQuery }) {
  const [stats, topics] = await Promise.all([getCommunityStats(), getTopics()])
  // The topics' own order decides how a moderator's Scope cell reads, so the
  // list is resolved first and handed to the read rather than looked up twice.
  const moderators = await getModerators(
    query,
    topics.map((topic) => topic.id)
  )

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <CommunityBoard
        topics={topics}
        moderators={moderators.rows}
        page={moderators.page}
        pageCount={moderators.pageCount}
        total={moderators.total}
      >
        <CommunityStats stats={stats} />
      </CommunityBoard>
    </main>
  )
}

export { CommunityPage }
