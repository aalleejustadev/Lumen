import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { NewCourseForm } from "@/components/dashboard/instructor/courses/edit/new-course-form"
import { getSession } from "@/lib/auth"
import { newCourseCopy } from "@/lib/config/course-editor"
import { siteConfig } from "@/lib/config/site"
import { db } from "@/lib/db"
import { getInstructorProfile } from "@/lib/instructor"

export const metadata: Metadata = {
  title: `${newCourseCopy.title} · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/courses/new` — the sidebar's **Create Course** row.
 *
 * **Only top-level categories are offered** (`parentId: null`), which is the
 * same filter the admin Categories page lists by, so an instructor is never
 * shown a sub-category the console treats as rolled up into its parent.
 *
 * `notFound()` without a teaching profile, for the reason My Courses gives:
 * the shell's guard has already established the account may teach, so the only
 * way here is a profile that went away mid-request.
 */
export default async function Page() {
  const session = await getSession()
  if (!session) notFound()

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) notFound()

  const categories = await db.category.findMany({
    where: { parentId: null },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  })

  return <NewCourseForm categories={categories} />
}
