import Link from "next/link"
import { StarIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { categoryIcons, type BrowseCourse } from "@/lib/config/browse-courses"
import { cn } from "@/lib/utils"

/**
 * The simpler course card from `instructor-page__part2.png` — category
 * badge, title, rating, duration, price. No level chip and no "Add" button
 * like the catalog's `course-card.tsx`, so (unlike that one) the whole card
 * can be a single `Link` — there's no nested control to protect from a
 * bubbled click.
 *
 * Takes `category` and looks its icon up in `categoryIcons` rather than a
 * `course.icon` field: this renders under the "use client"
 * `InstructorCoursesSection`, fed by a Server Component page — a function
 * value (an icon component) can't cross that server->client prop boundary,
 * only the plain `category` string can.
 */
function InstructorCourseCard({
  course,
}: {
  course: Omit<BrowseCourse, "icon">
}) {
  const Icon = categoryIcons[course.category]

  return (
    <Card className="gap-0 overflow-hidden p-0 ring-border transition-shadow hover:shadow-card">
      <Link
        href={`/dashboard/courses/${course.slug}`}
        className="flex flex-col"
      >
        <div
          className={cn(
            "relative grid aspect-[725/276] place-items-center bg-gradient-to-br",
            course.art
          )}
        >
          <Icon className="size-10 text-white/25" />
          <Badge className="absolute top-3 left-3 h-[22px] bg-black/55 px-2.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {course.category}
          </Badge>
        </div>

        <div className="flex flex-col gap-1.5 px-4.5 pt-4 pb-4.5">
          <h3 className="text-base leading-snug">{course.title}</h3>
          <p className="flex items-center gap-1.5 text-sm">
            <span className="font-bold tabular-nums">
              {course.rating.toFixed(1)}
            </span>
            <StarIcon className="size-3.5 fill-star text-star" />
            <span className="text-muted-foreground tabular-nums">
              ({course.reviews.toLocaleString("en-US")})
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {course.durationHours}h total
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-extrabold tracking-[-0.02em] tabular-nums">
              ${course.price.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums line-through">
              ${course.listPrice.toFixed(2)}
            </span>
          </p>
        </div>
      </Link>
    </Card>
  )
}

export { InstructorCourseCard }
