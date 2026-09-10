import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AdminHeader } from "@/components/dashboard/admin/admin-header"
import { AdminSidebar } from "@/components/dashboard/admin/admin-sidebar"
import { getAttentionFacts } from "@/lib/admin/overview"
import { getUnreadCount } from "@/lib/notification-feed"
import { getSession } from "@/lib/auth"
import { adminNavCounts } from "@/lib/config/admin-nav"

/**
 * The admin console's shell — its own sidebar, its own cart-less app bar, and
 * its own account menu, from `admin-sidebar.png` and
 * `exit-admin-mode__admin.png`.
 *
 * It is a route group of its own rather than a layout nested under
 * `(dashboard)`: a nested layout is drawn *inside* its parent's chrome, so the
 * console would have ended up with the student sidebar and header wrapped
 * around it. The URL is unchanged — a route group contributes nothing to the
 * path — so `/dashboard/admin` still resolves here and every existing link to
 * it keeps working.
 *
 * The role guard therefore moves here from the page. `notFound()` rather than
 * a redirect, for the reason the page gave: a signed-in learner who guesses
 * the URL should not be able to tell "you may not see this" from "there is
 * nothing here". The session check comes first so someone signed out is sent
 * to sign in rather than shown a 404 for a page they may well be allowed.
 *
 * `getAttentionFacts` feeds the sidebar's Users / Courses / Reviews counts.
 * It is wrapped in React `cache`, so Platform Overview underneath asks for the
 * same facts without a second set of queries.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.user.role !== "admin") notFound()

  const { user } = session
  // shadcn's provider writes `sidebar_state` on every toggle, and it is the
  // same cookie the student shell reads — so the rail follows you across the
  // two shells, which is what a single "collapse the sidebar" preference
  // should do.
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false"
  const [attention, unreadNotifications] = await Promise.all([
    getAttentionFacts(),
    getUnreadCount("ADMIN"),
  ])

  return (
    <SidebarProvider
      defaultOpen={sidebarOpen}
      style={
        {
          "--sidebar-width": "244px",
          "--sidebar-width-icon": "76px",
        } as React.CSSProperties
      }
    >
      <AdminSidebar
        user={{ name: user.name, email: user.email, image: user.image }}
        navCounts={adminNavCounts(attention, unreadNotifications)}
      />
      <SidebarInset>
        <AdminHeader
          user={{ name: user.name, email: user.email, image: user.image }}
          unreadNotifications={unreadNotifications}
        />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
