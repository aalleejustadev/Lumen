import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CoursePage } from "@/components/dashboard/learning/course/course-page"
import { getEnrolledCourse } from "@/lib/course-player"
import { learningReturnLink } from "@/lib/course-return"
import { canManageCourse } from "@/lib/instructor"
import { siteConfig } from "@/lib/config/site"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const course = await getEnrolledCourse(slug)
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
 * the permission gate lands when somebody decides what an instructor, an admin
 * and a prospective buyer may each see. Until then every course resolves, so
 * nothing on My Learning is a dead link and **Preview as student** on the
 * instructor's manage page has somewhere to go.
 *
 * Reads `lib/course-player.ts`, which resolves the static catalog first and
 * the database second — see that module's header. It is what stopped this
 * route 404ing for a course that exists only as rows, which is every course an
 * instructor actually owns.
 */
export default async function EnrolledCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const course = await getEnrolledCourse(slug)
  if (!course) notFound()

  // `via` is the only thing the URL gets to say, and it is checked against a
  // known value *and* against whether this account really owns the course —
  // see `learningReturnLink`. `canManageCourse` is only asked when the query
  // claims a preview, so an ordinary student's visit costs no extra query.
  const { via: rawVia } = await searchParams
  const via = typeof rawVia === "string" ? rawVia : undefined
  const backLink = learningReturnLink({
    courseSlug: course.slug,
    via,
    canManage: via ? await canManageCourse(course.slug) : false,
  })

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <CoursePage course={course} backLink={backLink} via={via} />
    </main>
  )
}
