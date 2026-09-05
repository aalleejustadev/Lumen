import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { CourseAboutCard } from "@/components/dashboard/courses/sale/course-about-card"
import { CourseContentCard } from "@/components/dashboard/courses/sale/course-content-card"
import { CourseHero } from "@/components/dashboard/courses/sale/course-hero"
import { CoursePurchaseCard } from "@/components/dashboard/courses/sale/course-purchase-card"
import { InstructorCard } from "@/components/dashboard/courses/sale/instructor-card"
import { LearningOutcomesCard } from "@/components/dashboard/courses/sale/learning-outcomes-card"
import { ReviewsCard } from "@/components/dashboard/courses/sale/reviews-card"
import type { CourseDetail } from "@/lib/config/course-details"

/**
 * `/dashboard/courses/[slug]`, from `course-sale-page-part-{1,2}.png`. The
 * two exports are the same scroll position for the left column at two
 * different points — the right column is one sticky element, not two, see
 * `CoursePurchaseCard`.
 */
function CourseSalePage({ course }: { course: CourseDetail }) {
  return (
    <div>
      <Link
        href="/dashboard/courses"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Browse
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_348px] lg:items-start">
        <div className="flex flex-col gap-4.5">
          <CourseHero course={course} />
          <LearningOutcomesCard outcomes={course.learningOutcomes} />
          <CourseContentCard
            sections={course.sections}
            contentSummary={course.contentSummary}
          />
          <CourseAboutCard
            requirements={course.requirements}
            description={course.description}
          />
          <InstructorCard
            instructor={course.instructorProfile}
            courseSlug={course.slug}
          />
          <ReviewsCard
            rating={course.rating}
            reviewsCount={course.reviewsCount}
            breakdown={course.ratingBreakdown}
            reviews={course.studentReviews}
          />
        </div>

        <CoursePurchaseCard course={course} />
      </div>
    </div>
  )
}

export { CourseSalePage }
