import { redirect } from "next/navigation"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { getSession } from "@/lib/auth"

/**
 * Everything under this group requires a session — the guard lives here rather
 * than in each page so a new route can't forget it.
 *
 * `--sidebar-width` is the export's 244px panel; the bar above the content is
 * still thin on purpose, since `dashboard-header.png` (search, cart,
 * notifications) is its own build.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const { user } = session

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "244px" } as React.CSSProperties}
    >
      <DashboardSidebar
        user={{ name: user.name, email: user.email, image: user.image }}
        isAdmin={user.role === "admin"}
      />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-[70px] shrink-0 items-center gap-3 border-b bg-background px-6">
          <SidebarTrigger className="-ml-1.5 md:hidden" />
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
