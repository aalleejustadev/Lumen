"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { NavRow, NavRowWithChildren } from "@/components/dashboard/sidebar-nav"
import { SidebarUser } from "@/components/dashboard/sidebar-user"
import { Logo } from "@/components/shared/logo"
import { adminNav } from "@/lib/config/admin-nav"
import { siteConfig } from "@/lib/config/site"
import { type MenuUser } from "@/lib/user"

/**
 * The admin console's sidebar, from
 * `ui-design/light/dashboard/admin/admin-sidebar.png`. Same 244px panel, same
 * rows and same collapsed rail as the student shell's `DashboardSidebar` —
 * that vocabulary lives in `sidebar-nav.tsx` so the two can't drift — over
 * `adminNav`'s four groups instead of `dashboardNav`'s three.
 *
 * Two deliberate differences from the export:
 *
 *  - **No Student / Instructor switch.** The export draws one under the logo,
 *    but an admin in the console is in a mode of its own, left through "Exit
 *    admin mode" in the account menu; a second, contradictory way out of it
 *    directly above the navigation would be worse than none.
 *  - **No upgrade card.** The student sidebar's promo is an invitation to buy
 *    a learner plan, which is not what this surface is for — the export leaves
 *    the same space empty, so the nav list simply ends and the footer row sits
 *    at the bottom.
 *
 * Everything but Dashboard renders inert: those pages are still to build, and
 * `NavRow` reads the `built` flag on each row. See `lib/config/admin-nav.ts`.
 */
function AdminSidebar({
  user,
  navCounts,
}: {
  user: MenuUser
  /** Queue sizes from the layout, keyed by href — see `adminNavCounts`. */
  navCounts?: Record<string, number>
}) {
  const pathname = usePathname()

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon" className="border-r bg-sidebar">
        <SidebarHeader className="gap-0 px-3 pt-5 pb-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
          <Link href="/" aria-label={`${siteConfig.name} home`}>
            <Logo labelClassName="group-data-[collapsible=icon]:hidden" />
          </Link>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-3 pt-8 group-data-[collapsible=icon]:px-0">
          {adminNav.map((group) => (
            <div key={group.title} className="not-first:mt-4.5">
              <p className="px-3 pb-1.5 text-[11px] font-semibold text-subtle-foreground group-data-[collapsible=icon]:hidden">
                {group.title}
              </p>
              <div className="flex flex-col gap-px">
                {group.items.map((item) =>
                  item.items ? (
                    <NavRowWithChildren
                      key={item.href}
                      item={item}
                      pathname={pathname}
                    />
                  ) : (
                    <NavRow
                      key={item.href}
                      item={item}
                      active={pathname === item.href}
                      badge={navCounts?.[item.href] ?? item.badge}
                    />
                  )
                )}
              </div>
            </div>
          ))}
        </SidebarContent>

        <SidebarFooter className="px-3 pt-5 pb-5 group-data-[collapsible=icon]:px-0">
          <SidebarUser user={user} adminMode />
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
}

export { AdminSidebar }
