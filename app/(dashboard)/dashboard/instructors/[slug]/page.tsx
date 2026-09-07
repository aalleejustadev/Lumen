import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { InstructorProfilePage } from "@/components/dashboard/instructors/instructor-profile-page"
import { getInstructorProfile } from "@/lib/config/instructor-profiles"
import { courseReturnLink } from "@/lib/course-return"
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
 * `?from=<course-slug>&via=<surface>` (set by the "View profile" button on
 * both `courses/sale/instructor-card.tsx` and
 * `learning/course/course-instructor-bar.tsx`) drives the "Back to course"
 * link. `via` is what keeps a student who came from the course they own from
 * being sent back to its sale page. Both values are resolved and validated in
 * `lib/course-return.ts`; anything it doesn't recognise falls back to Browse
 * Courses.
 */
export default async function InstructorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ from?: string; via?: string }>
}) {
  const { slug } = await params
  const { from, via } = await searchParams
  const instructor = getInstructorProfile(slug)
  if (!instructor) notFound()

  const { href: backHref, label: backLabel } = courseReturnLink({ from, via })

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
