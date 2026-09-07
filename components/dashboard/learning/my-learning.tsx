import { EnrolledCoursesSection } from "@/components/dashboard/learning/enrolled-courses-section"
import { LearningStats } from "@/components/dashboard/learning/learning-stats"

/**
 * `/dashboard/learning`, from
 * `ui-design/light/dashboard/student/my-learning-page.png`. Composes the
 * three blocks the export stacks: the heading, the four-up stat row, and the
 * tabbed course grid. Same shell as Browse Courses — the page file supplies
 * only the padding.
 *
 * Unlike `browse-courses.tsx` this composer is a Server Component: only the
 * tab/pagination state below needs the client, so the heading and stats never
 * reach the browser bundle.
 */
function MyLearning() {
  return (
    <div>
      <div>
        <h1 className="text-[32px] leading-none">My Learning</h1>
        <p className="mt-2.5 text-muted-foreground">
          Pick up where you left off and keep your streak going.
        </p>
      </div>

      <div className="mt-6">
        <LearningStats />
      </div>

      <div className="mt-6">
        <EnrolledCoursesSection />
      </div>
    </div>
  )
}

export { MyLearning }
