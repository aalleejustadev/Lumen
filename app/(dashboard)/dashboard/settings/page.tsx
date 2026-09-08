import { redirect } from "next/navigation"

/**
 * `/dashboard/settings` has no screen of its own — the sidebar's Settings row
 * points here, and the export's first section is Profile. Redirecting keeps
 * that row working without inventing a landing page the design doesn't have.
 */
export default function Page() {
  redirect("/dashboard/settings/profile")
}
