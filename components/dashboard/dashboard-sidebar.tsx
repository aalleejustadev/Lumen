"use client"

import * as React from "react"
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
import {
  NavRow,
  NavRowWithChildren,
  RowTooltip,
} from "@/components/dashboard/sidebar-nav"
import { SidebarUser } from "@/components/dashboard/sidebar-user"
import { Logo } from "@/components/shared/logo"
import { type MenuUser } from "@/lib/user"
import {
  dashboardNav,
  workspaceModes,
  type WorkspaceMode,
} from "@/lib/config/dashboard"
import { plans } from "@/lib/config/pricing"
import { siteConfig } from "@/lib/config/site"
import { cn } from "@/lib/utils"

/** Figures come from the pricing config so the two can't drift apart. */
const business = plans.find((plan) => plan.id === "lumen-business")

/**
 * Student / Instructor. Local state until instructor surfaces exist.
 *
 * Two controls, one visible at a time. Expanded it is a radiogroup with both
 * options; on the rail there is only room for one icon, and the useful one is
 * the mode you are *not* in — tapping it switches you, which is what the
 * export shows (a presentation icon while Student is active). A single
 * unchecked radio would be a strange thing to hand a screen reader, so the
 * rail gets its own button with a plain label instead.
 */
function WorkspaceSwitch() {
  const [mode, setMode] = React.useState<WorkspaceMode>("student")
  const other =
    workspaceModes.find((option) => option.value !== mode) ?? workspaceModes[1]

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Workspace"
        className="mt-3.5 flex h-10 items-center rounded-full bg-track p-1 group-data-[collapsible=icon]:hidden"
      >
        {workspaceModes.map((option) => {
          const selected = mode === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(option.value)}
              className={cn(
                "flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors",
                selected
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <option.icon className="size-4" />
              {option.label}
            </button>
          )
        })}
      </div>

      <RowTooltip label={`Switch to ${other.label}`}>
        <button
          type="button"
          onClick={() => setMode(other.value)}
          aria-label={`Switch to ${other.label}`}
          className="mx-auto mt-3.5 hidden size-9 cursor-pointer items-center justify-center rounded-lg bg-card text-foreground shadow-sm transition-colors group-data-[collapsible=icon]:flex hover:bg-hover"
        >
          <other.icon className="size-4" />
        </button>
      </RowTooltip>
    </>
  )
}

function UpgradeCard() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-[15px] font-bold">Unlock {business?.name}</p>
      {/* `text-wrap` again: the global `pretty` pulls a word down to avoid the
          short last line, which is exactly the break the export uses. */}
      <p className="mt-2 text-[13px] leading-5 [text-wrap:wrap] text-muted-foreground">
        Go beyond single courses. One plan unlocks every course from every
        instructor — {business?.price.monthly}/mo or {business?.price.yearly}
        /yr.
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
  navCounts,
}: {
  user: MenuUser
  isAdmin?: boolean
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
          <WorkspaceSwitch />
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
            <UpgradeCard />
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
