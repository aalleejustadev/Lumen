import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { getSession } from "@/lib/auth"

/**
 * Everything under this group requires a session — the guard lives here rather
 * than in each page so a new route can't forget it.
 *
 * `--sidebar-width` is the export's 244px panel, and `DashboardHeader` is the
 * bar from `dashboard-header.png`. Both read the session from here rather than
 * fetching their own.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const { user } = session
  // shadcn's provider writes `sidebar_state` on every toggle; reading it here
  // is what makes the rail survive a reload.
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider
      defaultOpen={sidebarOpen}
      style={
        {
          "--sidebar-width": "244px",
          // The collapsed rail from `sidebar-toggled.png`.
          "--sidebar-width-icon": "76px",
        } as React.CSSProperties
      }
    >
      <DashboardSidebar
        user={{ name: user.name, email: user.email, image: user.image }}
        isAdmin={user.role === "admin"}
      />
      <SidebarInset>
        <DashboardHeader
          user={{ name: user.name, email: user.email, image: user.image }}
          isAdmin={user.role === "admin"}
        />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
