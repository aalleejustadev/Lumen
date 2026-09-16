import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { MyCoursesPage } from "@/components/dashboard/instructor/courses/my-courses-page"
import {
  getInstructorCoursesPage,
  parseInstructorCoursesQuery,
} from "@/lib/instructor-courses"
import { instructorNav } from "@/lib/config/instructor-nav"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `My Courses · ${siteConfig.name}`,
}

/**
 * Whether the course authoring flow exists yet, read off `instructorNav`
 * rather than written down again — the arrangement
 * `instructor-help-page.tsx` uses for its own "Open Discussions" button. Every
 * disabled control on this page (the header's **Create Course** and each row's
 * **Manage** / **Continue editing**) hangs off this one flag, so the day that
 * row flips to `built: true` they light up together and nothing here has to be
 * remembered.
 *
 * It is resolved on the server so the nav config — four groups of lucide icons
 * — never reaches the board's bundle, the rule `lib/config/messages.ts`
 * learned the hard way.
 */
const AUTHORING_HREF = "/dashboard/instructor/courses/new"

function authoringBuilt(): boolean {
  const row = instructorNav
    .flatMap((group) => group.items)
    .find((item) => item.href === AUTHORING_HREF)
  return row?.built ?? false
}

/**
 * `/dashboard/instructor/courses` — what this account teaches, from
 * `ui-design/light/dashboard/instructor/my-courses-page.png`. The sidebar has
 * named this route since the shell was built; this is the page it was naming.
 *
 * `notFound()` when there is no teaching profile rather than a redirect: the
 * shell's own guard has already established the account may teach, so the only
 * way to reach this branch is an account whose `Instructor` row went away
 * mid-request — and the console's reasoning about not distinguishing "you may
 * not see this" from "there is nothing here" applies just as well.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = await getInstructorCoursesPage(
    parseInstructorCoursesQuery(params)
  )
  if (!page) notFound()

  return <MyCoursesPage page={page} authoringBuilt={authoringBuilt()} />
}
