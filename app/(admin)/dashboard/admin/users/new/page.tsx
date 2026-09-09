import type { Metadata } from "next"

import { NewUserPage } from "@/components/dashboard/admin/users/new-user-page"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Add new user · ${siteConfig.name}`,
}

/**
 * Where the Users table's **Add New User** goes. The role guard lives in
 * `app/(admin)/layout.tsx`, which covers every route in this group — and
 * `createUser` re-checks it anyway, because a Server Action is a public
 * endpoint that the page guard does not cover.
 */
export default function AdminNewUserPage() {
  return <NewUserPage />
}
