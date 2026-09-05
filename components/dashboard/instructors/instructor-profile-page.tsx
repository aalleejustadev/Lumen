import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { InstructorAboutCard } from "@/components/dashboard/instructors/instructor-about-card"
import { InstructorCoursesSection } from "@/components/dashboard/instructors/instructor-courses-section"
import { InstructorHeaderCard } from "@/components/dashboard/instructors/instructor-header-card"
import { InstructorReviewsCard } from "@/components/dashboard/instructors/instructor-reviews-card"
import type { BrowseCourse } from "@/lib/config/browse-courses"
import {
  firstNameOf,
  type InstructorProfile,
} from "@/lib/config/instructor-profiles"

/** `icon` is a component reference — it can't cross the server->client prop
 *  boundary into the "use client" `InstructorCoursesSection` below, so it's
 *  dropped here; `InstructorCourseCard` looks the icon up from `category`
 *  instead. */
function withoutIcon(course: BrowseCourse): Omit<BrowseCourse, "icon"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to drop it
  const { icon, ...rest } = course
  return rest
}

/**
 * `/dashboard/instructors/[slug]`, from
 * `instructor-page__part{1,2}.png`. `backHref` points at whichever course's
 * sale page linked here (`?from=<slug>` on the `View profile` button in
 * `instructor-card.tsx`), falling back to Browse Courses when opened
 * directly — "Back to course" wouldn't make sense with nothing to go back to.
 */
function InstructorProfilePage({
  instructor,
  backHref,
  backLabel,
}: {
  instructor: InstructorProfile
  backHref: string
  backLabel: string
}) {
  const firstName = firstNameOf(instructor.name)

  return (
    <div>
      <Link
        href={backHref}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {backLabel}
      </Link>

      <div className="mt-4 flex flex-col gap-4.5">
        <InstructorHeaderCard instructor={instructor} />

        <div className="grid gap-4.5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <InstructorAboutCard
            firstName={firstName}
            about={instructor.about}
            skills={instructor.skills}
          />
          <InstructorReviewsCard reviews={instructor.reviews} />
        </div>
      </div>

      <div className="mt-8">
        <InstructorCoursesSection
          firstName={firstName}
          courses={instructor.courses.map(withoutIcon)}
        />
      </div>
    </div>
  )
}

export { InstructorProfilePage }
