import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CoursePage } from "@/components/dashboard/learning/course/course-page"
import { getCoursePlayer } from "@/lib/config/course-player"
import { siteConfig } from "@/lib/config/site"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const course = getCoursePlayer(slug)
  return {
    title: course ? `${course.title} · ${siteConfig.name}` : siteConfig.name,
  }
}

/**
 * The enrolled course page, built against
 * `ui-design/light/dashboard/student/course-page__part{1,2}.png` and the
 * three tab exports. This is what "Continue" on `/dashboard/learning` opens;
 * `/dashboard/courses/[slug]` stays the sale page for students who haven't
 * bought yet.
 *
 * There is no enrolment check here on purpose — the brief is the surface, and
 * the permission gate lands with the `Enrollment` model. Until then every
 * course resolves, so nothing on My Learning is a dead link. Reads
 * `lib/config/course-player.ts`; see that file's header for why.
 */
export default async function EnrolledCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const course = getCoursePlayer(slug)
  if (!course) notFound()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <CoursePage course={course} />
    </main>
  )
}
