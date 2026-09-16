import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { InstructorAboutCard } from "@/components/dashboard/instructors/instructor-about-card"
import { InstructorCoursesSection } from "@/components/dashboard/instructors/instructor-courses-section"
import { InstructorHeaderCard } from "@/components/dashboard/instructors/instructor-header-card"
import { InstructorReviewsCard } from "@/components/dashboard/instructors/instructor-reviews-card"
import {
  firstNameOf,
  type PublicInstructorProfile,
} from "@/lib/config/instructor-profiles"
import type { ProfileRelationship } from "@/lib/instructor-relationship"

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
  relationship,
}: {
  instructor: PublicInstructorProfile
  relationship: ProfileRelationship
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
        <InstructorHeaderCard
          instructor={instructor}
          relationship={relationship}
        />

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
          courses={instructor.courses}
        />
      </div>
    </div>
  )
}

export { InstructorProfilePage }
