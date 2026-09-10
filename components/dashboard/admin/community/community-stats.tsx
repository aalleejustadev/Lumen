import { AdminCountCard } from "@/components/dashboard/admin/admin-count-card"
import { communityStatCards } from "@/lib/config/admin-community"
import type { CommunityStats as Stats } from "@/lib/admin/community"

const counts = new Intl.NumberFormat("en-US")

/**
 * The four-up KPI row at the top of `community-page__admin.png`.
 *
 * The tile is `admin-count-card.tsx`, shared with the Users page — both
 * exports draw the identical card, measured. Only the gap differs: this one
 * is 18px against that one's 16px, which is what the export measures.
 *
 * A Server Component, and it stays one: the board below is `"use client"`,
 * so this is handed to it as `children` rather than rendered inside it, which
 * keeps these four icons out of the browser bundle.
 */
function CommunityStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid gap-4.5 sm:grid-cols-2 xl:grid-cols-4">
      {communityStatCards.map(({ key, label, icon }) => (
        <AdminCountCard
          key={key}
          icon={icon}
          value={counts.format(stats[key])}
          label={label}
        />
      ))}
    </div>
  )
}

export { CommunityStats }
