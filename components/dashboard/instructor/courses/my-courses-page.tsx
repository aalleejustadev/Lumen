import { CoursesBoard } from "@/components/dashboard/instructor/courses/courses-board"
import { CoursesStats } from "@/components/dashboard/instructor/courses/courses-stats"
import type { InstructorCoursesPage } from "@/lib/instructor-courses"

/**
 * `/dashboard/instructor/courses`, from
 * `ui-design/light/dashboard/instructor/my-courses-page.png`.
 *
 * Thin on purpose, the way `coupons-page.tsx` is: the export puts **Create
 * Course** in the title's row, so the header is client either way, and all
 * this file does is keep the four stat cards on the server and hand them down.
 *
 * The role guard lives in `app/(instructor)/layout.tsx`, which covers every
 * route in the group; which courses this account may *see* is narrower, and
 * `lib/instructor-courses.ts` answers it with a `where` on
 * `Course.instructorId` rather than a check on anything from the client.
 */
function MyCoursesPage({
  page,
  authoringBuilt,
}: {
  page: InstructorCoursesPage
  authoringBuilt: boolean
}) {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <CoursesBoard page={page} authoringBuilt={authoringBuilt}>
        <CoursesStats stats={page.stats} />
      </CoursesBoard>
    </main>
  )
}

export { MyCoursesPage }
