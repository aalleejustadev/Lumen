import type { Metadata } from "next"

import { BrowseCourses } from "@/components/dashboard/courses/browse-courses"
import { getCatalogCourses } from "@/lib/catalog"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Browse Courses · ${siteConfig.name}`,
}

/**
 * The student catalog, built against
 * `ui-design/light/dashboard/student/browse-courses-page.png`. Same shell as
 * the Overview page (`w-full`, not the 1200px marketing column) — `main`
 * just supplies the padding, `BrowseCourses` owns everything else.
 *
 * **A Server Component now, over real rows.** It used to render a client
 * component that filtered a hand-written array, which meant a course an
 * instructor built and an admin approved was `PUBLISHED` and still invisible
 * to every student. The page reads the catalog and hands it over; the
 * filtering, sorting and paging stay in the browser, which is what makes those
 * controls instant.
 */
export default async function BrowseCoursesPage() {
  const courses = await getCatalogCourses()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <BrowseCourses courses={courses} />
    </main>
  )
}
