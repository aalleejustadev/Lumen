import type { Metadata } from "next"

import { CoursesPage } from "@/components/dashboard/admin/courses/courses-page"
import { parseCoursesQuery } from "@/lib/admin/courses"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Courses · ${siteConfig.name}`,
}

/**
 * The console's course review queue. The role guard lives in
 * `app/(admin)/layout.tsx`, which covers every route in this group.
 *
 * The status filter and the page number are read from the URL — see
 * `lib/admin/courses.ts` — so this page re-renders on the server for each of
 * them, and `parseCoursesQuery` is what stops a hand-edited query string
 * reaching Prisma.
 */
export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <CoursesPage query={parseCoursesQuery(params)} />
}
