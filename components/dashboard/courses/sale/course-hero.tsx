import {
  BarChart3Icon,
  ClockIcon,
  PlayIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { CoursePreviewDialog } from "@/components/dashboard/courses/sale/course-preview-dialog"
import type { CourseDetail } from "@/lib/config/course-details"
import { cn } from "@/lib/utils"

/**
 * The dark banner from `course-sale-page-part-1.png`. Art is the same
 * per-category gradient + icon as the catalog card (see
 * `lumen-course-card-art`) rather than the export's photo, with a dark
 * scrim behind the text block so it stays legible over any category color.
 */
function CourseHero({ course }: { course: CourseDetail }) {
  // `CoursePreviewDialog` is a Client Component and `course.icon` is a
  // `LucideIcon` component reference, which can't cross that boundary as a
  // prop — so it's stripped off before the course goes down (see the dialog's
  // own note).
  const { icon: CourseIcon, ...previewCourse } = course

  return (
    <div
      className={cn(
        "relative aspect-[2240/596] overflow-hidden rounded-xl bg-gradient-to-br",
        course.art
      )}
    >
      <CourseIcon className="absolute inset-0 m-auto size-32 text-white/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />

      <CoursePreviewDialog course={previewCourse}>
        <button
          type="button"
          className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-foreground shadow-pop transition-colors hover:bg-white/90"
        >
          <PlayIcon className="size-4 fill-foreground" />
          Preview this course
        </button>
      </CoursePreviewDialog>

      {/* `pointer-events-none` — nothing in here is interactive, but as the
          last sibling in this `relative` stack it would otherwise paint (and
          hit-test) on top of "Preview this course" above, since its `h1`/`p`
          are full-width block elements whose empty space still intercepts
          clicks meant for the button behind them. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 p-8">
        <Badge className="h-6 w-fit bg-black/55 px-3 text-xs font-medium text-white backdrop-blur-sm">
          {course.category}
        </Badge>
        <h1 className="text-[32px] leading-tight text-white">{course.title}</h1>
        <p className="max-w-2xl text-[15px] text-white/80">{course.subtitle}</p>
        <div className="flex flex-wrap items-center gap-5 text-sm text-white/90">
          <span className="flex items-center gap-1.5 font-semibold text-white">
            {course.rating.toFixed(1)}
            <span className="flex items-center">
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon
                  key={i}
                  className={cn(
                    "size-3.5",
                    i < Math.round(course.rating)
                      ? "fill-star text-star"
                      : "fill-white/30 text-white/30"
                  )}
                />
              ))}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <UsersIcon className="size-4" />
            {course.reviews.toLocaleString("en-US")} students
          </span>
          <span className="flex items-center gap-1.5">
            <BarChart3Icon className="size-4" />
            {course.level}
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon className="size-4" />
            {course.durationHours}h total
          </span>
        </div>
      </div>
    </div>
  )
}

export { CourseHero }
