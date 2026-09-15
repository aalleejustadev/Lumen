import { redirect } from "next/navigation"

/**
 * `/dashboard/instructor/settings` has no screen of its own — the sidebar's
 * Settings row points here, and the export's first section is Profile.
 * Redirecting keeps that row working without inventing a landing page the
 * design doesn't have, the same arrangement the learner's and the console's
 * settings groups make.
 */
export default function Page() {
  redirect("/dashboard/instructor/settings/profile")
}
