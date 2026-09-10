import { redirect } from "next/navigation"

/**
 * `/dashboard/admin/settings` has no screen of its own — the sidebar's
 * Platform Settings row points here, and the export's first section is
 * Profile. Redirecting keeps that row working without inventing a landing
 * page the design doesn't have, the same arrangement
 * `app/(dashboard)/dashboard/settings/page.tsx` makes for the learner's four.
 */
export default function Page() {
  redirect("/dashboard/admin/settings/profile")
}
