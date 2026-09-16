import Link from "next/link"
import { StarIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  categoryIcons as databaseCategoryIcons,
  FALLBACK_CATEGORY_ICON,
} from "@/lib/config/admin-overview"
import { categoryIcons } from "@/lib/config/browse-courses"
import type { ProfileCourse } from "@/lib/config/instructor-profiles"
import { cn } from "@/lib/utils"

/**
 * The simpler course card from `instructor-page__part2.png` — category
 * badge, title, rating, duration, price. No level chip and no "Add" button
 * like the catalog's `course-card.tsx`, so (unlike that one) the whole card
 * can be a single `Link` — there's no nested control to protect from a
 * bubbled click.
 *
 * It takes a `ProfileCourse` — plain data, including its own `href` — rather
 * than a catalog row, because a profile now lists database courses too (see
 * `lib/public-instructor.ts`). The glyph is looked up here from whichever table
 * `glyph` names, since a function value (an icon component) can't cross the
 * server->client prop boundary into `InstructorCoursesSection`. Either lookup
 * falls back to the grid glyph, so a category added later never renders
 * nothing.
 */
function InstructorCourseCard({ course }: { course: ProfileCourse }) {
  const Icon =
    (course.glyph.from === "catalog"
      ? categoryIcons[course.glyph.category]
      : databaseCategoryIcons[course.glyph.categorySlug]) ??
    FALLBACK_CATEGORY_ICON

  return (
    <Card className="gap-0 overflow-hidden p-0 ring-border transition-shadow hover:shadow-card">
      <Link href={course.href} className="flex flex-col">
        <div
          className={cn(
            "relative grid aspect-[725/276] place-items-center bg-gradient-to-br",
            course.art
          )}
        >
          {course.thumbnailUrl ? (
            // A plain `<img>`, for `CourseArt`'s reason: an instructor upload
            // lives on the storage host, which `next/image` would need declared.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnailUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <Icon className="size-10 text-white/25" />
          )}
          <Badge className="absolute top-3 left-3 h-[22px] bg-black/55 px-2.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {course.categoryLabel}
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
            {/* Only when there is a saving: a database course with no sale
                has equal prices, and "$99.99 ~~$99.99~~" reads as a bug. */}
            {course.listPrice > course.price ? (
              <span className="text-sm text-muted-foreground tabular-nums line-through">
                ${course.listPrice.toFixed(2)}
              </span>
            ) : null}
          </p>
        </div>
      </Link>
    </Card>
  )
}

export { InstructorCourseCard }
