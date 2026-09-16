import {
  BookOpenTextIcon,
  FileTextIcon,
  StarIcon,
  UsersRoundIcon,
} from "lucide-react"

import { CountCard } from "@/components/dashboard/count-card"
import {
  formatCount,
  formatRating,
} from "@/components/dashboard/instructor/courses/courses-format"
import { myCoursesStats } from "@/lib/config/instructor-courses"
import type { InstructorCoursesPage } from "@/lib/instructor-courses"

/**
 * The four-up KPI row at the top of `my-courses-page.png`.
 *
 * A **Server Component**, handed to `courses-board.tsx` as `children` so a row
 * of markup and its four icons never reach the bundle — the arrangement
 * `coupons-stats.tsx` and `community-page.tsx` both record.
 *
 * The tile is `CountCard`, whose geometry this export draws identically to the
 * three it was measured against (80px tall, 20px inset, a 44px tile, four
 * across on a 16px gap), so nothing here is re-measured.
 *
 * **Avg. rating shows an em dash, not 0.0, before anything has been rated** —
 * the call `coupons-stats.tsx` makes about its own average. There is no
 * average of nothing, and a 0.0 on a ratings tile reads as a catastrophe
 * rather than an absence.
 */
function CoursesStats({ stats }: { stats: InstructorCoursesPage["stats"] }) {
  return (
    <>
      <CountCard
        icon={BookOpenTextIcon}
        value={formatCount(stats.published)}
        label={myCoursesStats.published}
      />
      <CountCard
        icon={FileTextIcon}
        value={formatCount(stats.drafts)}
        label={myCoursesStats.drafts}
      />
      <CountCard
        icon={UsersRoundIcon}
        value={formatCount(stats.students)}
        label={myCoursesStats.students}
      />
      <CountCard
        icon={StarIcon}
        value={stats.rating === null ? "—" : formatRating(stats.rating)}
        label={myCoursesStats.rating}
      />
    </>
  )
}

export { CoursesStats }
