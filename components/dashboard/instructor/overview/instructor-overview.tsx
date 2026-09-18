import { CompletionCard } from "@/components/dashboard/instructor/overview/completion-card"
import { OutputCard } from "@/components/dashboard/instructor/overview/output-card"
import { ProductionCard } from "@/components/dashboard/instructor/overview/production-card"
import { RevenueCard } from "@/components/dashboard/instructor/overview/revenue-card"
import { SpendCard } from "@/components/dashboard/instructor/overview/spend-card"
import { TopCoursesCard } from "@/components/dashboard/instructor/overview/top-courses-card"
import { WelcomeCard } from "@/components/dashboard/instructor/overview/welcome-card"
import type { InstructorOverview as Data } from "@/lib/config/instructor-overview"

/**
 * The instructor Overview's bento grid, from
 * `ui-design/light/dashboard/instructor/instructor-dashboard.png`.
 *
 * Measured off that export at DPR 2: the workspace's usual page inset, a
 * **22px** gutter everywhere, and three rows —
 *
 * The gutter is `gap-5.5` (22px) against 20px of ground measured between the
 * drawn cards, because `Card`'s hairline is a `ring` and a ring paints
 * *outside* the layout box — so a 22px gap reads as 20px. The trap
 * `wishlist-row.tsx` records, from the other side.
 *
 *  - two equal columns (737px each on the export's 1494px content box),
 *  - three equal columns (484.7px each),
 *  - and an uneven pair, 778.5 : 695.5, which is `[1.12fr_1fr]`.
 *
 * Every card is its own file, the arrangement the student Overview already
 * uses, so a card can be re-measured or replaced without touching the grid.
 *
 * **Only two of the seven are Client Components** — the donut and the revenue
 * area chart need recharts, and the top-courses table owns its search and
 * pager. The rest render on the server, so the bundle is three cards rather
 * than seven.
 */
function InstructorOverview({ data }: { data: Data }) {
  return (
    <div className="flex flex-col gap-5.5">
      <div className="grid gap-5.5 lg:grid-cols-2">
        <WelcomeCard
          firstName={data.firstName}
          learners={data.learnersThisMonth}
        />
        <ProductionCard courses={data.production} />
      </div>

      <div className="grid gap-5.5 md:grid-cols-2 xl:grid-cols-3">
        <CompletionCard completion={data.completion} />
        <OutputCard output={data.output} />
        <SpendCard spend={data.spend} />
      </div>

      <div className="grid gap-5.5 xl:grid-cols-[1.12fr_1fr]">
        <RevenueCard
          revenue={data.revenue}
          deltaPercent={data.revenueDeltaPercent}
        />
        <TopCoursesCard courses={data.topCourses} />
      </div>
    </div>
  )
}

export { InstructorOverview }
