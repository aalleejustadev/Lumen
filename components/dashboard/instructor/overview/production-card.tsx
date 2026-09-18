import Link from "next/link"
import { GitBranchPlusIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  instructorOverviewCards as copy,
  type ProductionCourse,
} from "@/lib/config/instructor-overview"

/**
 * "Courses in Production" — everything this instructor is still writing, with
 * how much of it is live.
 *
 * **"In production" is any course not on sale**: DRAFT, IN_REVIEW and
 * NEEDS_CHANGES. A course the console sent back is still work in progress, so
 * excluding it would hide the most urgent row on the account — the call
 * `my-courses-page.png`'s Drafts tab already makes about the same three
 * statuses.
 *
 * **The bar is published lessons over total**, which is exactly what
 * `CourseLesson.isPublished` exists to answer and the same "% built" figure
 * My Courses draws, so one course cannot report two different progresses on
 * two screens. It turns `--success` once everything is live and is `--warning`
 * until then, which is what the export draws on its two rows.
 */
function ProductionCard({ courses }: { courses: ProductionCourse[] }) {
  return (
    <Card className="gap-0 p-7 ring-border">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base">{copy.production.title}</h2>
        <GitBranchPlusIcon className="size-5 shrink-0 text-muted-foreground" />
      </div>

      {courses.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed px-5 py-8 text-center">
          <p className="text-[15px] font-semibold">
            {copy.production.emptyTitle}
          </p>
          <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] leading-5 text-muted-foreground">
            {copy.production.emptyBody}
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3.5">
          {courses.slice(0, 2).map((course) => {
            const percent = course.total
              ? Math.round((course.published / course.total) * 100)
              : 0
            const done = percent >= 100
            return (
              <Link
                key={course.slug}
                href={`/dashboard/instructor/courses/${course.slug}/edit/curriculum`}
                className="rounded-xl border p-5 transition-colors hover:bg-hover"
              >
                <p className="text-[17px] font-bold">{course.title}</p>
                <Progress
                  value={percent}
                  className={`mt-3.5 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-track ${
                    done
                      ? "[&_[data-slot=progress-indicator]]:bg-success"
                      : "[&_[data-slot=progress-indicator]]:bg-warning"
                  }`}
                />
                <p className="mt-2.5 text-[13px] text-muted-foreground">
                  {copy.production.lessons(course.published, course.total)}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export { ProductionCard }
