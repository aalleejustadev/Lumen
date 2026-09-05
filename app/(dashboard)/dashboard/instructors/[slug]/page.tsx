import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { InstructorProfilePage } from "@/components/dashboard/instructors/instructor-profile-page"
import { getInstructorProfile } from "@/lib/config/instructor-profiles"
import { siteConfig } from "@/lib/config/site"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const instructor = getInstructorProfile(slug)
  return {
    title: instructor
      ? `${instructor.name} · ${siteConfig.name}`
      : siteConfig.name,
  }
}

/**
 * The instructor profile page, built against
 * `ui-design/light/dashboard/student/instructor-page__part{1,2}.png`. Reads
 * `lib/config/instructor-profiles.ts` — see that file's header for why.
 * `?from=<course-slug>` (set by the "View profile" button on
 * `instructor-card.tsx`) drives the "Back to course" link; without it there's
 * no course to go back to, so it falls back to Browse Courses.
 */
export default async function InstructorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { slug } = await params
  const { from } = await searchParams
  const instructor = getInstructorProfile(slug)
  if (!instructor) notFound()

  const backHref = from ? `/dashboard/courses/${from}` : "/dashboard/courses"
  const backLabel = from ? "Back to course" : "Back to Browse"

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <InstructorProfilePage
        instructor={instructor}
        backHref={backHref}
        backLabel={backLabel}
      />
    </main>
  )
}
