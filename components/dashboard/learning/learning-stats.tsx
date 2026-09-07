import { LearningStatCard } from "@/components/dashboard/learning/learning-stat-card"
import { learningStats } from "@/lib/config/my-learning"

/** The four-up stat row under the page heading. Four 360px cards on a 20px
 *  gap at `lg`, measured off `my-learning-page.png`. */
function LearningStats() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {learningStats.map((stat) => (
        <LearningStatCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}

export { LearningStats }
