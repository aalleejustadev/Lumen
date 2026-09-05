import Link from "next/link"
import { ChevronRightIcon, StarIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { CourseInstructorProfile } from "@/lib/config/course-details"
import { instructorSlug } from "@/lib/config/instructor-profiles"

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
}

/** `courseSlug` becomes `?from=` on the profile link, so its "Back to
 *  course" knows where to return to. */
function InstructorCard({
  instructor,
  courseSlug,
}: {
  instructor: CourseInstructorProfile
  courseSlug: string
}) {
  return (
    <Card className="gap-0 p-6.5 ring-border">
      <h2 className="text-lg">Your instructor</h2>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* `size` left at its default ("default") on purpose: its own
              variant is a plain `size-8`, so this className can actually
              override it. `size="lg"` gates its size behind
              `data-[size=lg]:size-10`, an attribute selector that beats a
              plain `size-14` on specificity regardless of source order. */}
          <Avatar className="size-14">
            <AvatarImage src={instructor.avatarUrl} alt="" />
            <AvatarFallback className="text-base">
              {initialsOf(instructor.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{instructor.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {instructor.title} · Teaching since {instructor.teachingSince}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <StarIcon className="size-3.5 fill-star text-star" />
                <span className="font-semibold text-foreground">
                  {instructor.rating.toFixed(1)}
                </span>
                rating
              </span>
              <span>
                {instructor.reviewsCount.toLocaleString("en-US")} reviews
              </span>
              <span>
                {instructor.studentsCount.toLocaleString("en-US")} students
              </span>
              <span>
                {instructor.coursesCount} course
                {instructor.coursesCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-1 font-semibold shadow-sm"
          nativeButton={false}
          render={
            <Link
              href={`/dashboard/instructors/${instructorSlug(instructor.name)}?from=${courseSlug}`}
            />
          }
        >
          View profile
          <ChevronRightIcon data-icon="inline-end" className="size-4" />
        </Button>
      </div>

      <p className="mt-5 max-w-2xl text-sm text-muted-foreground">
        {instructor.bio}
      </p>
    </Card>
  )
}

export { InstructorCard }
