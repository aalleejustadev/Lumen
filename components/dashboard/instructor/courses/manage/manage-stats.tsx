import {
  BookOpenTextIcon,
  ReceiptTextIcon,
  StarIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import {
  formatCount,
  formatMoneyWhole,
  formatRating,
} from "@/components/dashboard/instructor/courses/courses-format"
import { manageStatLabels } from "@/lib/config/instructor-course-manage"
import type { ManageCoursePage } from "@/lib/instructor-course-manage"

/**
 * The four-up row under the header.
 *
 * **A third KPI anatomy, and deliberately not one of the two we have.**
 * `CountCard` is a 44px tinted tile beside the figure; `AdminStatCard` is a
 * 34px tile beside a label with the figure and a delta below. This export
 * draws a **bare** muted glyph beside a muted label with the figure on the
 * line under it — no tile, no delta. Reaching for either of the others would
 * mean drawing something the export does not, and `AdminStatCard` lives in the
 * console's directory besides, which is the coupling `count-card.tsx`' own
 * note refuses.
 *
 * Measured at DPR 2: 80px cards on a 16px gap, `p-4`, a 16px glyph 8px from a
 * 14px muted label, and the figure 6px below at 24px/800. The 80px height and
 * the 16px gap are the same numbers `CountCard` lands on, which is what keeps
 * this row and My Courses' looking like one family at a glance.
 *
 * **Rating shows an em dash, not 0.0, before anything has been rated** — the
 * call `coupons-stats.tsx` makes about its own average. A 0.0 on a ratings
 * tile reads as a catastrophe rather than an absence.
 */
function ManageStats({ stats }: { stats: ManageCoursePage["stats"] }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={UsersRoundIcon}
        label={manageStatLabels.students}
        value={formatCount(stats.students)}
      />
      <StatCard
        icon={StarIcon}
        label={manageStatLabels.rating}
        value={stats.rating === null ? "—" : formatRating(stats.rating)}
      />
      <StatCard
        icon={ReceiptTextIcon}
        label={manageStatLabels.revenue}
        value={formatMoneyWhole(stats.revenueCents)}
      />
      <StatCard
        icon={BookOpenTextIcon}
        label={manageStatLabels.lessons}
        value={formatCount(stats.lessons)}
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <Card className="gap-1.5 p-4 ring-border">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        <span className="text-sm leading-4">{label}</span>
      </div>
      <p className="text-2xl leading-none font-extrabold tracking-[-0.02em] tabular-nums">
        {value}
      </p>
    </Card>
  )
}

export { ManageStats }
