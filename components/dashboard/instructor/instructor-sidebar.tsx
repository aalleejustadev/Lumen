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
import { WorkspaceSwitch } from "@/components/dashboard/workspace-switch"
import { SidebarUser } from "@/components/dashboard/sidebar-user"
import { Logo } from "@/components/shared/logo"
import { instructorNav } from "@/lib/config/instructor-nav"
import { siteConfig } from "@/lib/config/site"
import { type MenuUser } from "@/lib/user"

/**
 * The instructor workspace's sidebar, from
 * `ui-design/light/dashboard/instructor/instructor-dashboard-sidebar.png`.
 *
 * The same 244px panel, the same 36px rows and the same collapsed rail as the
 * other two shells — that vocabulary lives in `sidebar-nav.tsx` so the three
 * can't drift — over `instructorNav`'s four groups (Teach, Audience, Business,
 * General) instead of `dashboardNav`'s three.
 *
 * Two things distinguish it from the admin console's sidebar, and both come
 * straight off the export:
 *
 *  - **The Student / Instructor switch is here**, under the logo, where the
 *    console deliberately has none. The console is a privileged mode you leave
 *    through the account menu; these two are peer workspaces belonging to the
 *    same person, and the switch is the way between them — so it is also the
 *    way *out*, which is why there is no "Exit instructor mode" row to go with
 *    it. `canTeach` is not passed: being rendered inside this shell already
 *    proves the guard let you in, so the switch offers both halves.
 *  - **No upgrade card.** The student sidebar's promo sells a *learner* plan,
 *    which is not what this surface is for. The export leaves the same space
 *    empty, so the nav list simply ends and the footer row sits at the bottom
 *    — exactly as in the console.
 *
 * The footer's account menu is the learner's, not a mode-specific one: every
 * row in it (Profile, Account, Billing, Help) is a *personal account* surface
 * that already exists, where the instructor equivalents in the sidebar's
 * Settings row do not yet. Point it at `instructorAccountMenu` when those four
 * pages land.
 */
function InstructorSidebar({
  user,
  navCounts,
}: {
  user: MenuUser
  /** Live counts from the layout, keyed by href — see `instructorNavCounts`. */
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
          <WorkspaceSwitch mode="instructor" canTeach />
        </SidebarHeader>

        <SidebarContent className="gap-0 px-3 pt-8 group-data-[collapsible=icon]:px-0">
          {instructorNav.map((group) => (
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
          <SidebarUser user={user} />
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
}

export { InstructorSidebar }
