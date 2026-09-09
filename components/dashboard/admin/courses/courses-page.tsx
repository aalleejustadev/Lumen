import {
  CoursesList,
  type CourseListRow,
} from "@/components/dashboard/admin/courses/courses-list"
import { formatSubmittedAt } from "@/components/dashboard/admin/courses/courses-format"
import { adminCoursesCopy } from "@/lib/config/admin-courses"
import { getCoursesPage, type CoursesQuery } from "@/lib/admin/courses"

/**
 * `/dashboard/admin/courses`, from
 * `ui-design/light/dashboard/admin/courses-page__admin.png`: the title with
 * its lead, and one card per course.
 *
 * Measured off that export at DPR 2: the console's usual 32px page inset and
 * the same 32px/700 title over a 15px lead the other console pages carry. The
 * title takes an explicit `font-bold` for the reason `CLAUDE.md` gives —
 * `globals.css` sets every `h1` to 800 and the dashboard exports draw 700.
 *
 * The role guard lives in `app/(admin)/layout.tsx`, which covers every route
 * in the group.
 *
 * **"Submitted 2 days ago" is written here, on the server**, and crosses as a
 * string. Two reasons, both the ones `audit-format.ts` gives: it keeps
 * `date-fns` out of the client bundle, and a relative time computed on both
 * sides of the boundary is a hydration mismatch waiting for a row to sit on a
 * minute boundary. Every row is measured against the single
 * `CoursesPage.generatedAt` clock the read returns.
 */
async function CoursesPage({ query }: { query: CoursesQuery }) {
  const page = await getCoursesPage(query)

  const rows: CourseListRow[] = page.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    instructorName: row.instructorName,
    lessonCount: row.lessonCount,
    submittedLabel: formatSubmittedAt(row.submittedAt, page.generatedAt),
    thumbnailUrl: row.thumbnailUrl,
    categorySlug: row.categorySlug,
    categoryAccent: row.categoryAccent,
  }))

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <h1 className="text-[32px] leading-none font-bold">
        {adminCoursesCopy.title}
      </h1>
      <p className="mt-2.5 text-[15px] text-muted-foreground">
        {adminCoursesCopy.description}
      </p>

      <CoursesList rows={rows} page={page} query={query} />
    </main>
  )
}

export { CoursesPage }
