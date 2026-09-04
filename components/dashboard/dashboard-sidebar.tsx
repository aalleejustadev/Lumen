"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { SidebarUser } from "@/components/dashboard/sidebar-user"
import { Logo } from "@/components/shared/logo"
import { type MenuUser } from "@/components/shared/user-menu"
import {
  dashboardNav,
  workspaceModes,
  type DashboardNavItem,
  type WorkspaceMode,
} from "@/lib/config/dashboard"
import { plans } from "@/lib/config/pricing"
import { siteConfig } from "@/lib/config/site"
import { cn } from "@/lib/utils"

/** Figures come from the pricing config so the two can't drift apart. */
const business = plans.find((plan) => plan.id === "lumen-business")

/**
 * Rows are 36px on a 37px pitch, 18px icons at a 12px inset, 14px labels —
 * all measured off `ui-design/light/dashboard/dashboard-sidebar.png`. The
 * active row is a white card with a shadow rather than a tint.
 */
const rowClass =
  "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors"

function NavRow({ item, active }: { item: DashboardNavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        rowClass,
        active
          ? "bg-card font-medium text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-hover hover:text-foreground"
      )}
    >
      <item.icon className="size-4.5 shrink-0" />
      <span className="truncate">{item.title}</span>
      {item.badge ? (
        <span className="ml-auto text-[13px] text-subtle-foreground tabular-nums">
          {item.badge}
        </span>
      ) : null}
    </Link>
  )
}

/** Settings is the one row with children, hence the chevron in the export. */
function NavRowWithChildren({
  item,
  pathname,
}: {
  item: DashboardNavItem
  pathname: string
}) {
  const childActive = item.items?.some((child) => pathname === child.href)
  const [open, setOpen] = React.useState(Boolean(childActive))

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          rowClass,
          "cursor-pointer",
          pathname === item.href || childActive
            ? "bg-card font-medium text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-hover hover:text-foreground"
        )}
      >
        <item.icon className="size-4.5 shrink-0" />
        <span className="truncate">{item.title}</span>
        <ChevronDownIcon
          className={cn(
            "ml-auto size-4 shrink-0 text-subtle-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub className="mt-px mr-0 gap-px border-border pr-0">
          {item.items?.map((child) => (
            <SidebarMenuSubItem key={child.href}>
              <SidebarMenuSubButton
                isActive={pathname === child.href}
                render={<Link href={child.href} />}
                className="h-8 text-sm text-muted-foreground data-[active=true]:bg-card data-[active=true]:text-foreground data-[active=true]:shadow-sm"
              >
                {child.title}
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** Student / Instructor. Local state until instructor surfaces exist. */
function WorkspaceSwitch() {
  const [mode, setMode] = React.useState<WorkspaceMode>("student")

  return (
    <div
      role="radiogroup"
      aria-label="Workspace"
      className="mt-3.5 flex h-10 items-center rounded-full bg-track p-1"
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
  )
}

function UpgradeCard() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-[15px] font-bold">Unlock {business?.name}</p>
      {/* `text-wrap` again: the global `pretty` pulls a word down to avoid the
          short last line, which is exactly the break the export uses. */}
      <p className="mt-2 text-[13px] leading-5 text-muted-foreground [text-wrap:wrap]">
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
}: {
  user: MenuUser
  isAdmin?: boolean
}) {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r bg-sidebar">
      <SidebarHeader className="gap-0 px-3 pt-5 pb-0">
        <Link href="/" aria-label={`${siteConfig.name} home`}>
          <Logo />
        </Link>
        <WorkspaceSwitch />
      </SidebarHeader>

      {/* The promo card lives inside the scroll area, pushed down by
          `mt-auto`: pinned to the footer it looked identical on a tall screen
          but ate the drawer on a phone, leaving Help Center unreachable. */}
      <SidebarContent className="gap-0 px-3 pt-8">
        {dashboardNav.map((group) => (
          <div key={group.title} className="not-first:mt-4.5">
            <p className="px-3 pb-1.5 text-[11px] font-semibold text-subtle-foreground">
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
                  />
                )
              )}
            </div>
          </div>
        ))}
        <div className="mt-auto pt-8">
          <UpgradeCard />
        </div>
      </SidebarContent>

      <SidebarFooter className="px-3 pt-5 pb-5">
        <SidebarUser user={user} isAdmin={isAdmin} />
      </SidebarFooter>
    </Sidebar>
  )
}

export { DashboardSidebar }
