import type { Metadata } from "next"

import { CategoriesPage } from "@/components/dashboard/admin/categories/categories-page"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Categories · ${siteConfig.name}`,
}

/**
 * The console's category manager. The role guard lives in
 * `app/(admin)/layout.tsx`, which covers every route in this group.
 *
 * Nothing about this view is driven by the URL — there is no filter, no search
 * and no pager, because a platform has a handful of top-level categories
 * rather than pages of them — so unlike the Courses, Users and Audit Log pages
 * this route reads no `searchParams`.
 */
export default async function AdminCategoriesPage() {
  return <CategoriesPage />
}
