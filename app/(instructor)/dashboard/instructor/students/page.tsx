import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { StudentsPage } from "@/components/dashboard/instructor/students/students-page"
import { siteConfig } from "@/lib/config/site"
import { getStudentsPage, parseStudentsQuery } from "@/lib/instructor-students"

export const metadata: Metadata = {
  title: `Students · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/students` — everyone enrolled in this instructor's
 * courses.
 *
 * `notFound()` rather than a redirect when the read comes back null, which it
 * does for an account with no teaching profile: the role guard in
 * `app/(instructor)/layout.tsx` already covers the whole group, so this is the
 * narrower "you have no cohort to show" case, and the console's reasoning
 * about not distinguishing "you may not see this" from "there is nothing here"
 * applies to it too.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = await getStudentsPage(parseStudentsQuery(params))
  if (!page) notFound()

  return <StudentsPage page={page} />
}
