import { StarIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import type {
  CourseReview,
  RatingBreakdownRow,
} from "@/lib/config/course-details"

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

function ReviewsCard({
  rating,
  reviewsCount,
  breakdown,
  reviews,
}: {
  rating: number
  reviewsCount: number
  breakdown: RatingBreakdownRow[]
  reviews: CourseReview[]
}) {
  return (
    <Card className="gap-0 p-6.5 ring-border">
      <h2 className="text-lg">Student reviews</h2>

      <div className="mt-5 flex flex-wrap items-center gap-8">
        <div className="flex flex-col items-center gap-1.5">
          <p className="stat-figure text-5xl">{rating.toFixed(1)}</p>
          <Stars rating={Math.round(rating)} />
          <p className="text-sm text-muted-foreground">
            {reviewsCount.toLocaleString("en-US")} reviews
          </p>
        </div>

        <div className="flex min-w-70 flex-1 flex-col gap-2">
          {breakdown.map((row) => (
            <div key={row.stars} className="flex items-center gap-3 text-sm">
              <span className="flex w-9 shrink-0 items-center gap-1 text-muted-foreground">
                {row.stars}
                <StarIcon className="size-3 fill-star text-star" />
              </span>
              <Progress
                value={row.percent}
                className="flex-1 [&_[data-slot=progress-indicator]]:bg-star [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-track"
              />
              <span className="w-9 shrink-0 text-right text-muted-foreground tabular-nums">
                {row.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-6" />

      <div className="flex flex-col gap-6">
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

export { ReviewsCard }
