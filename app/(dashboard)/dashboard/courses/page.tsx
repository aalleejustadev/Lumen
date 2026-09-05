import type { Metadata } from "next"

import { BrowseCourses } from "@/components/dashboard/courses/browse-courses"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Browse Courses · ${siteConfig.name}`,
}

/**
 * The student catalog, built against
 * `ui-design/light/dashboard/student/browse-courses-page.png`. Same shell as
 * the Overview page (`w-full`, not the 1200px marketing column) — `main`
 * just supplies the padding, `BrowseCourses` owns everything else.
 */
export default function BrowseCoursesPage() {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <BrowseCourses />
    </main>
  )
}
