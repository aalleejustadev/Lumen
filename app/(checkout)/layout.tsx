import { redirect } from "next/navigation"

import { getSession } from "@/lib/auth"

/**
 * The checkout shell. Deliberately chrome-free — no sidebar, no app bar —
 * matching `ui-design/light/dashboard/student/checkout-page.png`, which shows
 * the payment panel alone on the page. That is also how checkout flows are
 * normally built: once someone is paying, every other navigation is a way to
 * lose them.
 *
 * The session guard is repeated here rather than shared with
 * `app/(dashboard)/layout.tsx`, because a route group's layout only covers its
 * own subtree and this one sits outside the dashboard's.
 */
export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  return <div className="min-h-svh bg-background">{children}</div>
}
