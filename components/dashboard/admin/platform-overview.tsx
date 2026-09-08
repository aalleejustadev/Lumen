import { Badge } from "@/components/ui/badge"
import { AttentionList } from "@/components/dashboard/admin/attention-list"
import { PlatformStatsRow } from "@/components/dashboard/admin/platform-stats"
import { TopCoursesCard } from "@/components/dashboard/admin/top-courses-card"
import {
  getAttentionFacts,
  getPlatformStats,
  getTopCourses,
} from "@/lib/admin/overview"
import { adminOverviewCopy } from "@/lib/config/admin-overview"

/**
 * `/dashboard/admin`, from
 * `ui-design/light/dashboard/admin/platform-overview.png`: the title with its
 * mode badge, a four-up KPI row, "Needs your attention", and the top-courses
 * table. Three sections, three reads, issued together — none of them depends
 * on another.
 *
 * Measured off that export at DPR 2: full content width on the dashboard's
 * usual 32px inset, 16px between cards in a row, and 32px above each section
 * heading with 16px below it.
 *
 * The heading carries an explicit `font-bold`: `globals.css` sets every `h1`
 * to 800 and the dashboard exports draw 700 — the same correction
 * `/dashboard/settings` and the enrolled-course page make. Section headings
 * are `text-xl font-bold` for the same reason, measured at two thirds of the
 * title's cap height.
 *
 * The badge is the sibling of the student Overview's "Student mode" pill, with
 * the export's own two differences: an orange dot (`--role-admin`, the token
 * that already exists for exactly this) rather than the blue one, and no
 * `bg-card` — the export's pill lets the page ground show through.
 */
async function PlatformOverview() {
  const [stats, attention, topCourses] = await Promise.all([
    getPlatformStats(),
    getAttentionFacts(),
    getTopCourses(),
  ])

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="flex items-center gap-3">
        <h1 className="text-[32px] leading-none font-bold">
          {adminOverviewCopy.title}
        </h1>
        <Badge
          variant="outline"
          className="h-6.5 gap-2 border-border bg-transparent px-3 font-medium text-foreground"
        >
          <span className="size-1.5 rounded-full bg-role-admin" />
          {adminOverviewCopy.modeBadge}
        </Badge>
      </div>

      <div className="mt-6">
        <PlatformStatsRow stats={stats} />
      </div>

      <h2 className="mt-8 mb-4 text-xl leading-none font-bold">
        {adminOverviewCopy.attentionHeading}
      </h2>
      <AttentionList facts={attention} />

      <h2 className="mt-8 mb-4 text-xl leading-none font-bold">
        {adminOverviewCopy.topCoursesHeading}
      </h2>
      <TopCoursesCard courses={topCourses} />
    </main>
  )
}

export { PlatformOverview }
