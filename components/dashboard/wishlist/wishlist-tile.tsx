import Link from "next/link"
import { StarIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  EnrollNowButton,
  RemoveFromWishlistButton,
} from "@/components/dashboard/wishlist/wishlist-actions"
import type { WishlistCourse } from "@/components/dashboard/wishlist/wishlist-course"
import { categoryIcons } from "@/lib/config/browse-courses"

/**
 * The grid half of the wishlist's view switch. The export only draws the list
 * view, so this deliberately borrows `course-card.tsx`'s proportions rather
 * than inventing a second card language for the same content — the only
 * difference is the footer, which carries this page's heart + "Enroll now"
 * instead of the catalog's "Add".
 */
function WishlistTile({ course }: { course: WishlistCourse }) {
  const Icon = categoryIcons[course.category]
  const href = `/dashboard/courses/${course.slug}`

  return (
    <Card className="gap-0 overflow-hidden p-0 ring-border transition-shadow hover:shadow-card">
      <Link href={href} className="flex flex-col">
        <div
          className={`relative grid aspect-[725/276] place-items-center bg-gradient-to-br ${course.art}`}
        >
          <Icon className="size-12 text-white/25" />
          <Badge className="absolute top-3 left-3 h-[22px] bg-black/55 px-2.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {course.category}
          </Badge>
        </div>

        <div className="flex flex-col px-5 pt-4.5">
          <h3 className="text-[17px] leading-snug font-bold">{course.title}</h3>
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

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-5">
        <p className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold tracking-[-0.02em] tabular-nums">
            ${course.price.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums line-through">
            ${course.listPrice.toFixed(2)}
          </span>
        </p>
        <div className="flex items-center gap-2">
          <RemoveFromWishlistButton slug={course.slug} title={course.title} />
          <EnrollNowButton slug={course.slug} />
        </div>
      </div>
    </Card>
  )
}

export { WishlistTile }
