import Link from "next/link"
import { StarIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { AddToCartButton } from "@/components/dashboard/courses/add-to-cart-button"
import type { BrowseCourse } from "@/lib/config/browse-courses"

/**
 * A catalog card from `browse-courses-page.png`. Art is the per-category
 * gradient + icon used across the app (see `lib/config/browse-courses.ts`)
 * rather than the export's photos — the category badge overlay is the one
 * piece of that treatment worth keeping, so it's carried over as-is.
 *
 * The image/title/meta block is one `Link` to the sale page
 * (`/dashboard/courses/[slug]`, see `course-sale-page.tsx`); price and "Add"
 * sit outside it so adding to cart doesn't also navigate — a `<button>`
 * nested inside an `<a>` would.
 */
function CourseCard({ course }: { course: BrowseCourse }) {
  return (
    <Card className="gap-0 overflow-hidden p-0 transition-shadow hover:shadow-card">
      <Link
        href={`/dashboard/courses/${course.slug}`}
        className="flex flex-col"
      >
        <div
          className={`relative grid aspect-[725/276] place-items-center bg-gradient-to-br ${course.art}`}
        >
          <course.icon className="size-12 text-white/25" />
          <Badge className="absolute top-3 left-3 h-[22px] bg-black/55 px-2.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {course.category}
          </Badge>
        </div>

        <div className="flex flex-col px-5 pt-4.5">
          <h3 className="text-lg leading-snug">{course.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {course.instructor}
          </p>

          <p className="mt-2 flex items-center gap-1.5 text-sm">
            <span className="font-bold tabular-nums">
              {course.rating.toFixed(1)}
            </span>
            <StarIcon className="size-3.5 fill-star text-star" />
            <span className="text-muted-foreground tabular-nums">
              ({course.reviews.toLocaleString("en-US")})
            </span>
          </p>

          <div className="mt-3 flex items-center gap-2.5 text-sm">
            <Badge variant="outline" className="h-7 px-2.5 font-normal">
              {course.level}
            </Badge>
            <span className="text-muted-foreground">
              {course.durationHours}h
            </span>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-5">
        <p className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold tracking-[-0.02em] tabular-nums">
            ${course.price.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums line-through">
            ${course.listPrice.toFixed(2)}
          </span>
        </p>
        <AddToCartButton slug={course.slug} />
      </div>
    </Card>
  )
}

export { CourseCard }
