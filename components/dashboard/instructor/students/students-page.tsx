import { StudentsBoard } from "@/components/dashboard/instructor/students/students-board"
import { StudentsStats } from "@/components/dashboard/instructor/students/students-stats"
import type { StudentsPage as StudentsPageData } from "@/lib/instructor-students"

/**
 * `/dashboard/instructor/students`, from
 * `ui-design/light/dashboard/instructor/students-page.png`.
 *
 * A **Server Component**, so `<StudentsStats>` is evaluated here and handed to
 * the client board as an already-rendered `children` slot — which is what keeps
 * a row of markup and its four lucide icons off the bundle. The arrangement
 * `coupons-page.tsx` records.
 */
function StudentsPage({ page }: { page: StudentsPageData }) {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <StudentsBoard page={page}>
        <StudentsStats stats={page.stats} />
      </StudentsBoard>
    </main>
  )
}

export { StudentsPage }
