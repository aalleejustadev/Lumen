import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CourseEditorPage } from "@/components/dashboard/instructor/courses/edit/course-editor-page"
import { EditorNav } from "@/components/dashboard/instructor/courses/edit/editor-nav"
import { courseEditorCopy, parseEditorStep } from "@/lib/config/course-editor"
import { previewAsStudentHref } from "@/lib/course-return"
import { getPlatformSettings } from "@/lib/admin/settings"
import { getCourseCoupons } from "@/lib/instructor-coupons"
import { siteConfig } from "@/lib/config/site"
import { getCourseForEditor } from "@/lib/instructor-course-edit"

type EditorParams = Promise<{ slug: string; step: string }>

export async function generateMetadata({
  params,
}: {
  params: EditorParams
}): Promise<Metadata> {
  const { slug } = await params
  // `getCourseForEditor` is wrapped in React `cache`, so this and the render
  // below are one query — the arrangement `getManageCoursePage` records.
  const course = await getCourseForEditor(slug)
  return {
    title: course
      ? `${courseEditorCopy.title} · ${course.title} · ${siteConfig.name}`
      : siteConfig.name,
  }
}

/**
 * `/dashboard/instructor/courses/[slug]/edit/[step]` — the course editor, from
 * `ui-design/light/dashboard/instructor/create-course-page.png` and
 * `create-course-page__curriculum.png`.
 *
 * It is reached from three places, which is why it is keyed by course rather
 * than being a `/new` wizard: **Continue editing** on My Courses, the
 * **Curriculum** row on a course's manage page, and the nav card's own step
 * links. Every one of those names a course that already exists.
 *
 * `notFound()` covers "no teaching profile" and "not your course" together, on
 * purpose — `getCourseForEditor` scopes its `where` by `instructorId` rather
 * than checking ownership after the read, the console's reasoning about not
 * distinguishing "you may not see this" from "there is nothing here".
 *
 * An **unknown step falls back to the first one** rather than 404ing, the way
 * `parseUsersQuery` falls back to its default tab: the six steps are a list
 * that will grow, and a link written against a step that has since been
 * renamed should land somewhere useful.
 */
export default async function Page({ params }: { params: EditorParams }) {
  const { slug, step } = await params
  const course = await getCourseForEditor(slug)
  if (!course) notFound()

  const active = parseEditorStep(step)

  // Read only on the step that draws them: the table, its figures and the
  // platform share behind the dialog's payout callout would otherwise be
  // queried on every step for nothing.
  const coupons =
    active === "coupons"
      ? await getCourseCoupons(
          course.id,
          (await getPlatformSettings()).defaultRevenueShareBps
        )
      : null

  return (
    <CourseEditorPage
      course={course}
      step={active}
      // Built here rather than in the client editor: `lib/course-return.ts`
      // imports the static catalog, which has no business in that bundle.
      previewHref={previewAsStudentHref(course.slug, active)}
      coupons={coupons}
      nav={
        <EditorNav
          courseSlug={course.slug}
          active={active}
          completed={course.completed}
        />
      }
    />
  )
}
