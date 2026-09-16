import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ManageCoursePage } from "@/components/dashboard/instructor/courses/manage/manage-course-page"
import { manageGroups } from "@/lib/config/instructor-course-manage"
import { instructorNav } from "@/lib/config/instructor-nav"
import { siteConfig } from "@/lib/config/site"
import { getManageCoursePage } from "@/lib/instructor-course-manage"

/**
 * Which of the eight Manage rows lead anywhere today, resolved **off
 * `instructorNav`** rather than written down again — the arrangement
 * `app/(instructor)/dashboard/instructor/courses/page.tsx` uses for its own
 * disabled buttons and the Help Center's "Open Discussions" button records.
 * Each row names the nav href that owns it, so the day Students, Reviews or
 * Analytics flips to `built: true` its row here becomes a link on its own and
 * nothing on this page has to be remembered.
 *
 * It is resolved on the **server** so the nav config — four groups of lucide
 * icons — never reaches a client bundle, the rule `lib/config/messages.ts`
 * learned the hard way. (Nothing under this route is a Client Component today
 * except the publish button, but that is a property of the page, not a licence
 * to import the config anywhere.)
 *
 * A row still needs an entry in `manageRowHref` to be drawn as a link, and
 * that entry may still decline — Quizzes returns no href on a course with no
 * quizzes, so the row stays inert under its own empty line. The three Content
 * rows all lead into the course editor, a route under this very course rather
 * than a sidebar row, so none of them has a flag to hang off.
 */
function builtRowKeys(): Set<string> {
  const built = new Map(
    instructorNav
      .flatMap((group) => group.items)
      .map((item) => [item.href, item.built ?? true] as const)
  )

  const keys = new Set<string>()
  for (const group of manageGroups) {
    for (const row of group.rows) {
      // A row that names no nav row is decided purely by whether
      // `manageRowHref` can build it a destination — which is the case for
      // Curriculum, whose route lives under this course rather than in any
      // sidebar.
      if (row.navHref === undefined || (built.get(row.navHref) ?? false)) {
        keys.add(row.key)
      }
    }
  }
  return keys
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  // `getManageCoursePage` is wrapped in React `cache`, so this and the render
  // below are one query — see that module's note.
  const page = await getManageCoursePage(slug)
  return {
    title: page ? `${page.title} · ${siteConfig.name}` : siteConfig.name,
  }
}

/**
 * `/dashboard/instructor/courses/[slug]` — one course, from
 * `ui-design/light/dashboard/instructor/manage-course.png`.
 *
 * `notFound()` covers three different situations on purpose, and the page
 * cannot tell them apart: no teaching profile, a slug belonging to somebody
 * else's catalog, and a course that has never been live. The middle one is why
 * `getManageCoursePage` scopes its `where` by `instructorId` rather than
 * checking ownership after the read — the console's reasoning about not
 * distinguishing "you may not see this" from "there is nothing here". The
 * third is the page's own precondition: My Courses sends **Manage** here and
 * **Continue editing** to the authoring flow, so a draft's destination is that
 * wizard, and every block on this page assumes a course with students.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const course = await getManageCoursePage(slug)
  if (!course) notFound()

  return <ManageCoursePage course={course} builtRows={builtRowKeys()} />
}
