import { StarIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import type { InstructorReview } from "@/lib/config/instructor-profiles"

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center">
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          className={
            i < rating
              ? "size-3.5 fill-star text-star"
              : "size-3.5 fill-track text-track"
          }
        />
      ))}
    </span>
  )
}

/** Simpler than the sale page's `ReviewsCard` — no rating breakdown, just the
 *  two most recent reviews (matches "Recent student reviews" in the export,
 *  a different section than that card's "Student reviews"). */
function InstructorReviewsCard({ reviews }: { reviews: InstructorReview[] }) {
  return (
    <Card className="gap-0 p-6.5 ring-border">
      <h2 className="text-lg">Recent student reviews</h2>
      <div className="mt-5 flex flex-col gap-5">
        {reviews.map((review) => (
          <div key={review.name} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={review.avatarUrl} alt="" />
                <AvatarFallback className="text-xs">
                  {initialsOf(review.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{review.name}</p>
                <div className="flex items-center gap-2">
                  <Stars rating={review.rating} />
                  <span className="text-xs text-muted-foreground">
                    {review.timeAgo}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{review.body}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

export { InstructorReviewsCard }
