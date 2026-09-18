"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
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
import { type MenuUser } from "@/lib/user"
import { dashboardNav } from "@/lib/config/dashboard"
import { type BusinessOffer, plans } from "@/lib/config/pricing"
import { siteConfig } from "@/lib/config/site"

/** Figures come from the pricing config so the two can't drift apart. */
const business = plans.find((plan) => plan.id === "lumen-business")

/**
 * The sidebar's Lumen Business promo.
 *
 * **It is drawn only for a student who could actually buy the plan.** Three
 * things decide that, and only one of them was ever true here:
 *
 *  - **Student mode only.** It always was — `instructor-sidebar.tsx` and
 *    `admin-sidebar.tsx` each record refusing it, because the promo sells a
 *    *learner* plan. This file is the student shell's own sidebar, so there
 *    was nothing to fix; the note is here so the next shell to appear knows
 *    the card is not shared furniture.
 *  - **Not already subscribed.** A card selling somebody the plan they are
 *    paying for is the dead affordance every unbuilt row in this app refuses.
 *    The layout asks `hasBusinessPlan()` and passes `showUpgrade`.
 *  - **Configured at all.** With no Stripe prices the button would open a
 *    checkout that cannot be built, so the card is dropped rather than drawn
 *    inert — an advert nobody can act on is worse than no advert.
 *
 * Its amounts come from the same `BusinessOffer` the pricing page renders, so
 * the sidebar cannot quote a price the checkout would not charge.
 */
function UpgradeCard({ offer }: { offer?: BusinessOffer }) {
  const monthly = offer?.price.monthly ?? business?.price.monthly
  const yearly = offer?.price.yearly ?? business?.price.yearly

  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-[15px] font-bold">Unlock {business?.name}</p>
      {/* `text-wrap` again: the global `pretty` pulls a word down to avoid the
          short last line, which is exactly the break the export uses. */}
      <p className="mt-2 text-[13px] leading-5 [text-wrap:wrap] text-muted-foreground">
        Go beyond single courses. One plan unlocks every course from every
        instructor — {monthly}/mo or {yearly}/yr.
      </p>
      <Button
        nativeButton={false}
        className="mt-4 h-10 w-full gap-2 text-sm font-semibold"
        render={<Link href="/pricing" />}
      >
        <span className="size-2 rounded-full bg-success" />
        Upgrade Plan
      </Button>
    </div>
  )
}

/**
 * The dashboard's navigation, on shadcn's Sidebar so the mobile drawer and the
 * keyboard shortcut come for free. The panel is 244px wide with a 12px gutter,
 * measured off the export; `--sidebar-width` is set on the provider in the
 * layout.
 */
function DashboardSidebar({
  user,
  isAdmin,
  canTeach,
  navCounts,
  showUpgrade,
  businessOffer,
}: {
  user: MenuUser
  isAdmin?: boolean
  /** Whether to draw the Lumen Business promo at all — see `UpgradeCard`. The
   *  layout resolves it, because it is the only place that already has the
   *  session and can read the subscription. */
  showUpgrade?: boolean
  businessOffer?: BusinessOffer
  /** Whether the switch offers Instructor — decided in the layout by
   *  `canTeach`, the same answer the instructor shell's guard acts on. */
  canTeach?: boolean
  /** Live row counts from the layout, keyed by href. A row that isn't listed
   *  keeps the placeholder `badge` from `lib/config/dashboard.ts`. */
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
          <WorkspaceSwitch mode="student" canTeach={canTeach} />
        </SidebarHeader>

        {/* The promo card lives inside the scroll area rather than a fixed
          footer — pinned to the footer it looked identical on a tall screen
          but ate the drawer on a phone, leaving Help Center unreachable.
          `sticky bottom-0` gets the "always visible" the fixed footer would
          have given for free, without that cost: `mt-auto` still sends it to
          the bottom of the list when everything fits, and once the list
          itself needs to scroll, sticky keeps the card glued to the visible
          bottom edge instead of scrolling out of view with the rows above
          it. The wrapper needs its own opaque `bg-sidebar` so scrolled rows
          don't show through underneath it while it's stuck. */}
        <SidebarContent className="gap-0 px-3 pt-8 group-data-[collapsible=icon]:px-0">
          {dashboardNav.map((group) => (
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
          <div className="sticky bottom-0 mt-auto bg-sidebar pt-8 pb-1 group-data-[collapsible=icon]:hidden">
            {showUpgrade ? <UpgradeCard offer={businessOffer} /> : null}
          </div>
        </SidebarContent>

        <SidebarFooter className="px-3 pt-5 pb-5 group-data-[collapsible=icon]:px-0">
          <SidebarUser user={user} isAdmin={isAdmin} />
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
}

export { DashboardSidebar }
