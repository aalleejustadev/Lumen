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

// ---------------------------------------------------------------------------
// The enrolled course page's own "Back to …"
// ---------------------------------------------------------------------------

/**
 * The second seam of exactly the same kind, and it is here rather than in a
 * module of its own for this file's own stated reason — one place to spell
 * "where did you come from", so a third caller cannot invent a third query
 * string for it.
 *
 * `/dashboard/learning/[slug]` now has two kinds of visitor: a student who
 * bought the course, and an **instructor previewing their own** through
 * *Preview as student* on `/dashboard/instructor/courses/[slug]`. Its back
 * link was hard-coded at `/dashboard/learning`, which dropped the instructor
 * into the student shell's My Learning — a page about courses they bought,
 * reached from a page about a course they teach.
 *
 * So the origin rides along as `?via=manage` and the page resolves its own
 * back link from it, the arrangement `courseReturnLink` above already uses.
 */
export const PREVIEW_VIA = "manage"

/** *Preview as student*, on the instructor's manage page. */
export function previewAsStudentHref(courseSlug: string) {
  return `/dashboard/learning/${courseSlug}?via=${PREVIEW_VIA}`
}

/**
 * `/dashboard/learning/[slug]`'s own back link.
 *
 * **`canManage` is resolved server-side and is not optional**, because `via`
 * comes off the URL and nothing else about it can be trusted: without that
 * check a student who hand-edited `?via=manage` would be handed a link into
 * the instructor shell, which answers `notFound()` for them — a dead link,
 * which is the one thing every surface here refuses to render. It is the same
 * posture `courseReturnLink` takes when it insists `from` name a real course.
 *
 * The label says **Exit preview** rather than "Back to …". The instructor
 * arrived by pressing *Preview as student* and the page they are looking at is
 * otherwise indistinguishable from what a student sees, so naming the way out
 * after the mode they are in tells them something "Back to course management"
 * would not.
 */
export function learningReturnLink({
  courseSlug,
  via,
  canManage,
}: {
  courseSlug: string
  via?: string
  canManage: boolean
}) {
  if (via === PREVIEW_VIA && canManage) {
    return {
      href: `/dashboard/instructor/courses/${courseSlug}`,
      label: "Exit preview",
    }
  }
  return { href: "/dashboard/learning", label: "Back to courses" }
}

/**
 * The course page's own URL with the origin preserved — what the quiz rows in
 * the completion accordion link at, and what the quiz page's "Back to course"
 * returns to. Without it the chain breaks one level down: an instructor who
 * opened a quiz from a preview would come back to the course page having lost
 * the fact that they were previewing, and the next click would drop them into
 * the student shell after all.
 */
export function learningCourseHref(courseSlug: string, via?: string) {
  return via === PREVIEW_VIA
    ? previewAsStudentHref(courseSlug)
    : `/dashboard/learning/${courseSlug}`
}
