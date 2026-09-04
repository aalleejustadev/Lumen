import { ActivityDonutCard } from "@/components/dashboard/overview/activity-donut-card"
import { ContinueLearningCard } from "@/components/dashboard/overview/continue-learning-card"
import { LearningPathCard } from "@/components/dashboard/overview/learning-path-card"
import { OverallProgressCard } from "@/components/dashboard/overview/overall-progress-card"
import { ProgressChartCard } from "@/components/dashboard/overview/progress-chart-card"
import { ProgressStatisticsCard } from "@/components/dashboard/overview/progress-statistics-card"
import { WelcomeCard } from "@/components/dashboard/overview/welcome-card"

/**
 * The student Overview page's bento grid, from
 * `ui-design/light/dashboard/student/student-dashboard.png`: a 2-up hero row,
 * a 3-up stats row, then a 2-up chart/table row. Each card is its own file so
 * a future Instructor overview can reuse the ones that still apply.
 */
function DashboardOverview({ firstName }: { firstName: string }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <WelcomeCard firstName={firstName} />
        <LearningPathCard />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <OverallProgressCard />
        <ProgressStatisticsCard />
        <ActivityDonutCard />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <ProgressChartCard />
        <ContinueLearningCard />
      </div>
    </div>
  )
}

export { DashboardOverview }
