import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { InstructorProfilePage } from "@/components/dashboard/instructors/instructor-profile-page"
import { browseCourses } from "@/lib/config/browse-courses"
import { siteConfig } from "@/lib/config/site"
import { courseReturnLink } from "@/lib/course-return"
import { db } from "@/lib/db"
import { getProfileRelationship } from "@/lib/instructor-relationship"
import { getPublicInstructor } from "@/lib/public-instructor"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const instructor = await getPublicInstructor(slug)
  return {
    title: instructor
      ? `${instructor.name} · ${siteConfig.name}`
      : siteConfig.name,
  }
}

/**
 * The instructor profile page, built against
 * `ui-design/light/dashboard/student/instructor-page__part{1,2}.png`.
 *
 * Reads `lib/public-instructor.ts`, which resolves the static demo profiles
 * first and the database second — the arrangement the enrolled course page
 * already has. Before it, this route read the static profiles alone, so *View
 * profile* on a course built in the app 404'd.
 *
 * `?from=<course-slug>&via=<surface>` (set by the "View profile" button on
 * both `courses/sale/instructor-card.tsx` and
 * `learning/course/course-instructor-bar.tsx`) drives the "Back to course"
 * link, and `?preview=` carries an instructor's preview origin through. All
 * three are resolved and validated in `lib/course-return.ts`; a `from` that is
 * not a catalog course is looked up here, since that module has no database
 * client, and anything unrecognised falls back to Browse Courses.
 */
export default async function InstructorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ from?: string; via?: string; preview?: string }>
}) {
  const { slug } = await params
  const { from, via, preview } = await searchParams
  const instructor = await getPublicInstructor(slug)
  if (!instructor) notFound()

  // Only asked for a slug the static catalog does not know, so a catalog
  // profile costs no extra query — and it decides a *back link*, nothing the
  // page is about, so a database that cannot answer falls back to "Back to
  // Browse" rather than taking the profile down with it. Same reasoning as
  // `getProfileRelationship`'s own guard, which logs the cause.
  const databaseCourse =
    typeof from === "string" &&
    from !== "" &&
    !browseCourses.some((course) => course.slug === from)
      ? await db.course
          .findUnique({ where: { slug: from }, select: { id: true } })
          .then((row) => row !== null)
          .catch(() => false)
      : false

  const { href: backHref, label: backLabel } = courseReturnLink({
    from,
    via,
    preview,
    databaseCourse,
  })

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <InstructorProfilePage
        instructor={instructor}
        backHref={backHref}
        backLabel={backLabel}
        // Follow and Message, resolved for this viewer on the server.
        relationship={await getProfileRelationship(instructor.slug)}
      />
    </main>
  )
}
