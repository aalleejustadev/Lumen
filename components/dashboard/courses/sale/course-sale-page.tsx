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
import type { SalePreviewLesson } from "@/lib/course-sale"

/**
 * `/dashboard/courses/[slug]`, from `course-sale-page-part-{1,2}.png`. The
 * two exports are the same scroll position for the left column at two
 * different points — the right column is one sticky element, not two, see
 * `CoursePurchaseCard`.
 */
function CourseSalePage({
  course,
  previews = null,
  purchasable = true,
}: {
  course: CourseDetail
  /** Real free-preview content, on a database course — see
   *  `lib/course-sale.ts`. */
  previews?: SalePreviewLesson[] | null
  /** False on a database course, which checkout cannot sell yet. */
  purchasable?: boolean
}) {
  // Stripped once here for the three client pieces below that need the course:
  // `icon` is a component, which cannot cross the server->client boundary.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropped, not used
  const { icon, ...previewCourse } = course

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
          <CourseHero course={course} previews={previews} />
          <LearningOutcomesCard outcomes={course.learningOutcomes} />
          <CourseContentCard
            sections={course.sections}
            contentSummary={course.contentSummary}
            previewCourse={previewCourse}
            previews={previews}
            purchasable={purchasable}
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

        <CoursePurchaseCard
          course={course}
          previews={previews}
          purchasable={purchasable}
        />
      </div>
    </div>
  )
}

export { CourseSalePage }
