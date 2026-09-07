import { StarIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { initialsOf } from "@/components/dashboard/learning/course/initials"
import type { CourseReview } from "@/lib/config/course-details"

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={className}>
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon
          key={index}
          className={
            index < rating
              ? "inline size-4 fill-star text-star"
              : "inline size-4 fill-transparent text-star"
          }
        />
      ))}
    </span>
  )
}

/**
 * The Reviews panel from `course-reviews__tab.png`. A far simpler card than
 * the sale page's `reviews-card.tsx`: the summary is one line — score, stars,
 * count — with no per-star breakdown bars, because a student who has already
 * bought is reading peers' notes rather than weighing a purchase.
 *
 * Unrated stars are outlined rather than filled grey (the sale page fills
 * them), which is what the export's four-star row draws.
 */
function CourseReviewsTab({
  rating,
  reviewsCount,
  reviews,
}: {
  rating: number
  reviewsCount: number
  reviews: CourseReview[]
}) {
  return (
    <Card className="gap-0 divide-y divide-border-subtle p-6.5 py-0 ring-border">
      <div className="flex items-center gap-4 py-6">
        <p className="stat-figure text-4xl">{rating.toFixed(1)}</p>
        <div>
          <Stars rating={Math.round(rating)} className="flex items-center" />
          <p className="mt-0.5 text-[15px] leading-6 text-muted-foreground">
            {reviewsCount.toLocaleString("en-US")} reviews
          </p>
        </div>
      </div>

      {reviews.map((review) => (
        <div key={`${review.name}-${review.timeAgo}`} className="py-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-11 shrink-0">
              <AvatarImage src={review.avatarUrl} alt="" />
              <AvatarFallback className="text-xs">
                {initialsOf(review.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold">{review.name}</p>
              <div className="mt-0.5 flex items-center gap-2.5">
                <Stars rating={review.rating} className="flex items-center" />
                <span className="text-[15px] text-muted-foreground">
                  {review.timeAgo}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
            {review.body}
          </p>
        </div>
      ))}
    </Card>
  )
}

export { CourseReviewsTab }
