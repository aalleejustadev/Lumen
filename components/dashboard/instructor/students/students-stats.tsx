import { CircleCheckIcon, FlameIcon, StarIcon, UsersIcon } from "lucide-react"

import { CountCard } from "@/components/dashboard/count-card"
import { formatCount } from "@/components/dashboard/instructor/students/students-format"
import { studentStats } from "@/lib/config/instructor-students"
import type { StudentsPage } from "@/lib/instructor-students"

/**
 * The four-up KPI row at the top of `students-page.png`.
 *
 * A **Server Component**, handed to `students-board.tsx` as `children` so a row
 * of markup and its four icons never reach the bundle — the arrangement
 * `coupons-page.tsx` records for its own stats row. The tile is `CountCard`,
 * whose geometry this export draws identically to the three it was built for:
 * 80px tall, 20px inset, a 44px tile, four across on a 16px gap, all measured.
 *
 * **Two of the four show an em dash rather than a zero.** There is no
 * completion rate over nobody and no average of nothing, and a 0% or a 0.0
 * there would read as a figure somebody measured rather than one nothing has
 * produced yet — the call `coupons-stats.tsx` makes about its own average.
 *
 * What each one *means* is decided in `lib/instructor-students.ts`; this is
 * only what it is called and how it is drawn.
 */
function StudentsStats({ stats }: { stats: StudentsPage["stats"] }) {
  return (
    <>
      <CountCard
        icon={UsersIcon}
        value={formatCount(stats.total)}
        label={studentStats.total}
      />
      <CountCard
        icon={FlameIcon}
        value={formatCount(stats.activeThisWeek)}
        label={studentStats.activeThisWeek}
      />
      <CountCard
        icon={CircleCheckIcon}
        value={stats.completionRate === null ? "—" : `${stats.completionRate}%`}
        label={studentStats.completion}
      />
      <CountCard
        icon={StarIcon}
        value={stats.rating === null ? "—" : stats.rating.toFixed(1)}
        label={studentStats.rating}
      />
    </>
  )
}

export { StudentsStats }
