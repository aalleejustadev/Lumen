import {
  AwardIcon,
  BookOpenIcon,
  CircleCheckIcon,
  ClockIcon,
} from "lucide-react"

import { LearningStatCard } from "@/components/dashboard/learning/learning-stat-card"
import type { MyLearning } from "@/lib/learning"

/**
 * The four-up stat row under the page heading. Four 360px cards on a 20px gap
 * at `lg`, measured off `my-learning-page.png`.
 *
 * **The figures are counted from the learner's own enrolments**, not a config
 * array — so they are the same list the grid beneath pages through, and the
 * stat row, the tabs and the footer cannot disagree about how many courses are
 * in progress. The glyphs are chosen here because a Server Component may hold
 * a function; only the numbers cross from the read.
 */
function LearningStats({ stats }: { stats: MyLearning["stats"] }) {
  const cards = [
    {
      icon: BookOpenIcon,
      value: String(stats.inProgress),
      label: "In Progress",
    },
    {
      icon: CircleCheckIcon,
      value: String(stats.completed),
      label: "Completed",
    },
    { icon: ClockIcon, value: String(stats.hours), label: "Hours Learned" },
    {
      icon: AwardIcon,
      value: String(stats.certificates),
      label: "Certificates",
    },
  ]

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((stat) => (
        <LearningStatCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}

export { LearningStats }
