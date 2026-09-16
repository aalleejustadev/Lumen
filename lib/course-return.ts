import { browseCourses } from "@/lib/config/browse-courses"
import {
  editorStepHref,
  editorStepKeys,
  type EditorStepKey,
} from "@/lib/config/course-editor"
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

/**
 * The "View profile" href on a course page's instructor card.
 *
 * It takes the instructor's **stored slug** when the page has one, and derives
 * one from the name only when it does not. A database course knows
 * `Instructor.slug`, which is what the profile route looks a database
 * instructor up by; re-deriving it from `name` would 404 the day the two
 * differ. Catalog courses have no stored slug, and their profiles are keyed by
 * the derived one.
 *
 * `preview` carries an instructor's preview origin (`manage`, `edit-pricing`)
 * across the profile and back, so *Back to course* returns them to the preview
 * rather than to a course page that has forgotten it was one.
 */
export function instructorProfileHref(
  instructor: { name: string; slug?: string },
  {
    courseSlug,
    via,
    preview,
  }: { courseSlug: string; via: CourseSurface; preview?: string }
) {
  const slug = instructor.slug ?? instructorSlug(instructor.name)
  const carried = isPreviewVia(preview) ? `&preview=${preview}` : ""
  return `/dashboard/instructors/${slug}?from=${courseSlug}&via=${via}${carried}`
}

/**
 * The instructor profile's "Back to …" link, resolved from its own query
 * string. Every value comes off the URL, so none is trusted: `from` has to
 * name a course that actually exists, `via` has to be one of the two
 * surfaces and `preview` a recognised origin, or the link falls back. That
 * keeps a hand-edited `?from=../../somewhere` out of an `href`.
 *
 * **A database course is recognised too**, but only when the route has looked
 * it up (`databaseCourse`), because this module holds the static catalog and no
 * database client. It returns to whichever surface `via` names, like a catalog
 * course: both pages resolve a database course now (`lib/course-sale.ts`).
 *
 * `via` defaults to the sale page when absent, which is what a link written
 * before this existed meant.
 */
export function courseReturnLink({
  from,
  via,
  preview,
  databaseCourse = false,
}: {
  from?: string
  via?: string
  preview?: string
  /** Set by the route after confirming `from` names a `Course` row. */
  databaseCourse?: boolean
}) {
  const course = from
    ? browseCourses.find((entry) => entry.slug === from)
    : undefined
  const carried = isPreviewVia(preview) ? `?via=${preview}` : ""

  const slug = course?.slug ?? (from && databaseCourse ? from : null)
  if (!slug) return { href: "/dashboard/courses", label: "Back to Browse" }

  const surface: CourseSurface = via === "learning" ? "learning" : "sale"
  return {
    href: `/dashboard/${SURFACE_SEGMENTS[surface]}/${slug}${
      surface === "learning" ? carried : ""
    }`,
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
 * `/dashboard/learning/[slug]` has two kinds of visitor: a student who bought
 * the course, and an **instructor previewing their own** through *Preview as
 * student*. Its back link was hard-coded at `/dashboard/learning`, which
 * dropped the instructor into the student shell's My Learning — a page about
 * courses they bought, reached from a page about a course they teach.
 *
 * So the origin rides along as `?via=` and the page resolves its own back link
 * from it. **The value names the exact screen to return to**, because *Preview
 * as student* is offered in two places: `manage` for the manage page, and
 * `edit-<step>` for a step of the course editor (`edit-pricing`), so an
 * instructor checking how their pricing reads comes back to Pricing rather
 * than to a different page. Keeping it one parameter is what lets the course
 * page and its quiz rows carry it through untouched.
 */
export const PREVIEW_VIA = "manage"
const EDITOR_VIA_PREFIX = "edit-"

/** *Preview as student* — from the manage page, or from an editor step. */
export function previewAsStudentHref(courseSlug: string, from?: EditorStepKey) {
  const via = from ? `${EDITOR_VIA_PREFIX}${from}` : PREVIEW_VIA
  return `/dashboard/learning/${courseSlug}?via=${via}`
}

/**
 * Whether a `via` off the URL is a preview origin this module recognises —
 * `manage`, or `edit-` followed by a step that has a screen. Anything else is
 * dropped by the route before it reaches a link, so a hand-edited value can
 * never be written back into an `href`.
 */
export function isPreviewVia(via: string | undefined): via is string {
  if (via === PREVIEW_VIA) return true
  return (
    via !== undefined &&
    via.startsWith(EDITOR_VIA_PREFIX) &&
    editorStepKeys.has(via.slice(EDITOR_VIA_PREFIX.length))
  )
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
 * would not. `preview` is what lets the page mark itself as one.
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
  if (canManage && isPreviewVia(via)) {
    return {
      href:
        via === PREVIEW_VIA
          ? `/dashboard/instructor/courses/${courseSlug}`
          : editorStepHref(
              courseSlug,
              via.slice(EDITOR_VIA_PREFIX.length) as EditorStepKey
            ),
      label: "Exit preview",
      preview: true,
    }
  }
  return {
    href: "/dashboard/learning",
    label: "Back to courses",
    preview: false,
  }
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
  return isPreviewVia(via)
    ? `/dashboard/learning/${courseSlug}?via=${via}`
    : `/dashboard/learning/${courseSlug}`
}
