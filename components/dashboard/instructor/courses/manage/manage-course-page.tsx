import { ActivityCard } from "@/components/dashboard/instructor/courses/manage/activity-card"
import { CourseHealthCard } from "@/components/dashboard/instructor/courses/manage/course-health-card"
import { ManageHeader } from "@/components/dashboard/instructor/courses/manage/manage-header"
import { ManageSections } from "@/components/dashboard/instructor/courses/manage/manage-sections"
import { ManageStats } from "@/components/dashboard/instructor/courses/manage/manage-stats"
import { manageCourseCopy } from "@/lib/config/instructor-course-manage"
import type { ManageCoursePage as ManageCoursePageData } from "@/lib/instructor-course-manage"

/**
 * `/dashboard/instructor/courses/[slug]`, from
 * `ui-design/light/dashboard/instructor/manage-course.png` — where My Courses'
 * **Manage** goes, and the one page in this mode that is *about* a single
 * course rather than a list of them.
 *
 * A **Server Component all the way down** except `publish-toggle.tsx`. Nothing
 * else on the page has state — the eight rows are links or inert, the stats and
 * the two right-hand cards are read once — so the client bundle for this route
 * is one button and its dialog. That is the opposite arrangement from
 * `courses-board.tsx` next door, where the tabs, the search and the pager all
 * share one pending flag and the whole header has to be client.
 *
 * Measured off that export at DPR 2 and matching the render: the instructor
 * shell's usual 32px page inset, the header block, a four-up stat row 24px
 * under it, then **Manage** 30px below that and a two-column grid 16px under
 * the heading — a fluid left column and a **576px** right one on a 22px gutter,
 * the two right-hand cards 18px apart.
 *
 * Two things about that grid:
 *
 *  - **The heading sits above it, not inside the left cell.** The export's
 *    Course health card begins level with the left column's first group label,
 *    ~30px *above* where a heading inside that cell would let it start. See
 *    `manage-sections.tsx`.
 *  - **It collapses below `xl`, not `lg`.** 576px of fixed sidebar beside a
 *    fluid column leaves the rows squeezed at laptop widths, where the sale
 *    page's 348px purchase card does not — so the breakpoint is a step later
 *    than that page's, the same reading `course-page.tsx` makes about its own
 *    heavier sidebar.
 *
 * Neither column is sticky: the export scrolls both together.
 */
function ManageCoursePage({
  course,
  builtRows,
}: {
  course: ManageCoursePageData
  /** Which `ManageRowKey`s have a live destination, resolved in the route from
   *  `instructorNav` so nothing here has to remember what is built. */
  builtRows: Set<string>
}) {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <ManageHeader course={course} />
      <ManageStats stats={course.stats} />

      {/* `font-bold` explicitly, for the reason `CLAUDE.md` gives: the base
          rule sets every `h2` to 800 and the dashboard exports draw 700. */}
      <h2 className="mt-7.5 text-[17px] leading-none font-bold">
        {manageCourseCopy.manageHeading}
      </h2>

      <div className="mt-4 grid items-start gap-[22px] xl:grid-cols-[minmax(0,1fr)_576px]">
        <ManageSections
          facts={course.facts}
          courseId={course.id}
          builtRows={builtRows}
        />

        <div className="flex flex-col gap-[18px]">
          <CourseHealthCard
            health={course.health}
            hasQuizzes={course.facts.quizzes > 0}
          />
          <ActivityCard activity={course.activity} />
        </div>
      </div>
    </main>
  )
}

export { ManageCoursePage }
