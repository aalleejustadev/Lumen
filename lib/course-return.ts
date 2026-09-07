import { browseCourses } from "@/lib/config/browse-courses"
import { instructorSlug } from "@/lib/config/instructor-profiles"

/**
 * The "where did you come from" seam between a course page and the instructor
 * profile it links to.
 *
 * A course has two pages — the sale page at `/dashboard/courses/[slug]` and
 * the enrolled course page at `/dashboard/learning/[slug]` — and both carry a
 * "View profile" link. `?from=<slug>` alone can't tell them apart, so the
 * profile's "Back to course" used to land everyone on the sale page even when
 * they'd come from the course they already own. `?via=` carries the surface
 * alongside it.
 *
 * Both directions live here rather than in the three components that use them
 * so a new caller can't invent a fourth spelling of the same query string.
 */

const SURFACE_SEGMENTS = {
  sale: "courses",
  learning: "learning",
} as const

export type CourseSurface = keyof typeof SURFACE_SEGMENTS

/** The "View profile" href on a course page's instructor card. */
export function instructorProfileHref(
  instructorName: string,
  { courseSlug, via }: { courseSlug: string; via: CourseSurface }
) {
  return `/dashboard/instructors/${instructorSlug(instructorName)}?from=${courseSlug}&via=${via}`
}

/**
 * The instructor profile's "Back to …" link, resolved from its own query
 * string. Both values come off the URL, so neither is trusted: `from` has to
 * name a course that actually exists and `via` has to be one of the two
 * surfaces, or the link falls back to Browse. That keeps a hand-edited
 * `?from=../../somewhere` out of an `href`.
 *
 * `via` defaults to the sale page when absent, which is what a link written
 * before this existed meant.
 */
export function courseReturnLink({
  from,
  via,
}: {
  from?: string
  via?: string
}) {
  const course = from
    ? browseCourses.find((entry) => entry.slug === from)
    : undefined

  if (!course) return { href: "/dashboard/courses", label: "Back to Browse" }

  const surface: CourseSurface = via === "learning" ? "learning" : "sale"
  return {
    href: `/dashboard/${SURFACE_SEGMENTS[surface]}/${course.slug}`,
    label: "Back to course",
  }
}
