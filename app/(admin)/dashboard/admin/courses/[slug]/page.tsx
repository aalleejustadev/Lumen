import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CourseReviewPage } from "@/components/dashboard/admin/courses/course-review-page"
import { getCourseReview } from "@/lib/admin/courses"
import { siteConfig } from "@/lib/config/site"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const course = await getCourseReview((await params).slug)
  return {
    title: course
      ? `${course.title} · Review · ${siteConfig.name}`
      : `Course · ${siteConfig.name}`,
  }
}

/**
 * The admin's view of one course — where the queue's **View** goes.
 *
 * `getCourseReview` returns null for a slug that does not exist *and* for a
 * DRAFT, which the queue deliberately never lists: an instructor's unfinished
 * work is not the admin's to read, and `notFound()` is the same answer for
 * both, so a guessed slug cannot be used to tell the two apart.
 *
 * The read is wrapped in React `cache`, so `generateMetadata` and the page
 * body share one query rather than running it twice.
 */
export default async function AdminCourseReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const course = await getCourseReview((await params).slug)
  if (!course) notFound()
  return <CourseReviewPage course={course} />
}
