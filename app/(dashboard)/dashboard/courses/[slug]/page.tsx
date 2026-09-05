import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CourseSalePage } from "@/components/dashboard/courses/sale/course-sale-page"
import { getCourseDetail } from "@/lib/config/course-details"
import { siteConfig } from "@/lib/config/site"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const course = getCourseDetail(slug)
  return {
    title: course ? `${course.title} · ${siteConfig.name}` : siteConfig.name,
  }
}

/**
 * The course sale page, built against
 * `ui-design/light/dashboard/student/course-sale-page-part-{1,2}.png`.
 * Reads `lib/config/course-details.ts` — see that file's header for why.
 */
export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const course = getCourseDetail(slug)
  if (!course) notFound()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <CourseSalePage course={course} />
    </main>
  )
}
