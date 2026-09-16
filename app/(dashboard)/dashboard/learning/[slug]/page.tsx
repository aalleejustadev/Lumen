import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CoursePage } from "@/components/dashboard/learning/course/course-page"
import { getEnrolledCourse, getLessonView } from "@/lib/course-player"
import { isPreviewVia, learningReturnLink } from "@/lib/course-return"
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
 * **The page itself is not gated; the lesson content is.** Every course
 * resolves, so nothing on My Learning is a dead link and a prospective learner
 * can see a syllabus. On a database course, `?lesson=<id>` picks the lesson on
 * screen, and `lib/course-access.ts` decides whether its content is sent at
 * all: an enrolled learner, the course's own instructor and an admin see
 * everything; anyone else sees the lessons marked free preview and a lock on
 * the rest. A catalog course has no lesson content and keeps its drawn player.
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
  const { via: rawVia, lesson: rawLesson } = await searchParams
  // Only a recognised origin survives, so nothing hand-typed into the URL is
  // written back into the quiz rows' links.
  const via =
    typeof rawVia === "string" && isPreviewVia(rawVia) ? rawVia : undefined
  const backLink = learningReturnLink({
    courseSlug: course.slug,
    via,
    canManage: via ? await canManageCourse(course.slug) : false,
  })

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <CoursePage
        course={course}
        backLink={backLink}
        via={via}
        // Null on a catalog course, which keeps its drawn player.
        lesson={await getLessonView(
          course,
          typeof rawLesson === "string" ? rawLesson : undefined
        )}
      />
    </main>
  )
}
