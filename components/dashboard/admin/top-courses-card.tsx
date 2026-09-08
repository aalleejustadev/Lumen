import Link from "next/link"
import { StarIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import {
  adminOverviewCopy,
  categoryGradients,
  categoryIcons,
  FALLBACK_CATEGORY_GRADIENT,
  FALLBACK_CATEGORY_ICON,
} from "@/lib/config/admin-overview"
import type { TopCourse } from "@/lib/admin/overview"
import { cn } from "@/lib/utils"

/**
 * "Top courses platform-wide" from
 * `ui-design/light/dashboard/admin/platform-overview.png`.
 *
 * Measured off that export at DPR 2: one card with **no padding of its own** —
 * five flush 60px rows divided by hairlines, an 18px inset inside each row, a
 * 44 x 30 thumbnail, and three right-aligned columns (category, rating,
 * students). The counts column is a fixed 64px so those three right edges line
 * up across rows whatever the numbers are; the category is the last flexible
 * thing before them, which is what right-aligns it too.
 *
 * The card zeroes `--card-spacing` rather than reaching for `py-0 gap-0`, for
 * the reason `settings-billing.tsx` documents: `Card` writes
 * `py-(--card-spacing)`/`gap-(--card-spacing)` and tailwind-merge does not
 * treat those as the same utility group as a plain override, so both
 * declarations would stand.
 *
 * Rows link to the course's **sale** page, which exists. The admin course view
 * (`course-view-page__admin.png`) is where they belong — re-point them at
 * `/dashboard/admin/courses/[slug]` when that route lands.
 */
function TopCoursesCard({ courses }: { courses: TopCourse[] }) {
  if (courses.length === 0) {
    return (
      <Card className="px-5 ring-border [--card-spacing:--spacing(5)]">
        <p className="text-[15px] text-muted-foreground">
          {adminOverviewCopy.topCoursesEmpty}
        </p>
      </Card>
    )
  }

  return (
    <Card className="divide-y divide-border-subtle ring-border [--card-spacing:0px]">
      {courses.map((course) => {
        // Art is the per-category gradient + icon the rest of the app uses,
        // not the export's photographs — see `lumen-course-card-art`.
        const Icon =
          categoryIcons[course.categorySlug] ?? FALLBACK_CATEGORY_ICON
        const gradient =
          categoryGradients[course.categoryAccent] ?? FALLBACK_CATEGORY_GRADIENT

        return (
          <Link
            key={course.slug}
            href={`/dashboard/courses/${course.slug}`}
            className="flex h-15 items-center gap-4 px-4.5 no-underline transition-colors hover:bg-hover/60"
          >
            <div
              className={cn(
                "grid h-7.5 w-11 shrink-0 place-items-center rounded-md bg-gradient-to-br",
                gradient
              )}
            >
              <Icon className="size-4 text-white/30" />
            </div>

            <span className="min-w-0 flex-1 truncate text-base font-semibold">
              {course.title}
            </span>

            <span className="hidden truncate text-[15px] text-muted-foreground sm:block">
              {course.categoryName}
            </span>

            <span className="flex shrink-0 items-center gap-1.5 text-[15px] font-semibold tabular-nums">
              <StarIcon className="size-3.5 fill-star text-star" />
              {course.rating.toFixed(1)}
            </span>

            <span className="w-16 shrink-0 text-right text-[15px] font-semibold tabular-nums">
              {course.enrollmentCount.toLocaleString("en-US")}
            </span>
          </Link>
        )
      })}
    </Card>
  )
}

export { TopCoursesCard }
