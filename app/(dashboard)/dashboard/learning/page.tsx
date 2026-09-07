import type { Metadata } from "next"

import { MyLearning } from "@/components/dashboard/learning/my-learning"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `My Learning · ${siteConfig.name}`,
}

/**
 * The student's enrolled courses, built against
 * `ui-design/light/dashboard/student/my-learning-page.png`. Same shell as the
 * Overview and Browse Courses pages (`w-full`, not the 1200px marketing
 * column) — `main` just supplies the padding, `MyLearning` owns the rest.
 */
export default function MyLearningPage() {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <MyLearning />
    </main>
  )
}
