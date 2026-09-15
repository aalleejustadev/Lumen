import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { InstructorHeader } from "@/components/dashboard/instructor/instructor-header"
import { InstructorSidebar } from "@/components/dashboard/instructor/instructor-sidebar"
import { getSession } from "@/lib/auth"
import { canTeach } from "@/lib/instructor"
import { getUnreadCount } from "@/lib/notification-feed"
import { getUnreadMessageCount } from "@/lib/messages"
import { instructorNavCounts } from "@/lib/config/instructor-nav"

/**
 * The instructor workspace's shell — its own sidebar, its own cart-less app
 * bar and its own command palette, from
 * `ui-design/light/dashboard/instructor/instructor-dashboard-sidebar.png`.
 *
 * It is a **route group of its own** rather than a layout nested under
 * `(dashboard)`, for the reason `app/(admin)/layout.tsx` gives: a nested
 * layout is drawn *inside* its parent's chrome, so the workspace would have
 * ended up with the student sidebar and app bar wrapped around it. A route
 * group contributes nothing to the path, so the URLs are the plain
 * `/dashboard/instructor/*` the sidebar links at.
 *
 * **This is what makes the mode switch a real switch rather than a tab.** The
 * two workspaces are two URLs, so moving between them is a page load that
 * re-runs this guard — which is the only arrangement in which changing mode
 * can change permissions. A client-side toggle could swap the visible rows and
 * nothing else; here the server decides, on every request, whether you may see
 * this shell at all.
 *
 * The guard is `canTeach` — the `Instructor` row, or the `instructor` role
 * while a freshly approved application's profile is still being written. It is
 * the same function the student sidebar's switch consults to decide whether to
 * offer the Instructor half, so the control and the guard cannot disagree.
 *
 * `notFound()` rather than a redirect, as in the console: a signed-in learner
 * who hand-edits the URL should not be able to tell "you may not see this"
 * from "there is nothing here". The session check runs first so someone signed
 * out is sent to sign in rather than shown a 404 for a page they may well be
 * allowed.
 */
export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const { user } = session
  if (!(await canTeach(user))) notFound()

  // shadcn's provider writes `sidebar_state` on every toggle, and it is the
  // same cookie the other two shells read — so a "collapse the sidebar"
  // preference follows you across all three.
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false"
  const [unreadNotifications, unreadMessages] = await Promise.all([
    getUnreadCount("INSTRUCTOR"),
    getUnreadMessageCount("INSTRUCTOR"),
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
      <InstructorSidebar
        user={{ name: user.name, email: user.email, image: user.image }}
        navCounts={instructorNavCounts(unreadNotifications, unreadMessages)}
      />
      <SidebarInset>
        <InstructorHeader
          user={{ name: user.name, email: user.email, image: user.image }}
          unreadNotifications={unreadNotifications}
        />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
