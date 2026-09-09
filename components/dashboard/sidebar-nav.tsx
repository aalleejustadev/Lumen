"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDownIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { type DashboardNavItem } from "@/lib/config/dashboard"
import { cn } from "@/lib/utils"

/**
 * The row vocabulary both sidebars render — the student shell's
 * `dashboard-sidebar.tsx` and the admin console's `admin-sidebar.tsx`. The
 * two draw different navigation over identical rows, so the rows live here
 * rather than being copied: a change to the rail's collapse behaviour or the
 * active treatment has to land on both at once.
 *
 * Rows are 36px on a 37px pitch, 18px icons at a 12px inset, 14px labels —
 * measured off `ui-design/light/dashboard/dashboard-sidebar.png` and
 * unchanged by `admin/admin-sidebar.png`, which draws the same panel. The
 * active row is a white card with a shadow rather than a tint.
 */
const rowClass =
  "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"

const activeRowClass = "bg-card font-medium text-foreground shadow-sm"
const idleRowClass =
  "text-muted-foreground hover:bg-hover hover:text-foreground"

/**
 * On the rail the label is gone, so the tooltip is the only thing naming the
 * row — it's the affordance that makes an icon-only sidebar usable, not a
 * decoration. Expanded, it would just repeat the visible text, so it's off.
 */
function RowTooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactElement
}) {
  const { state, isMobile } = useSidebar()

  if (state !== "collapsed" || isMobile) return children

  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * `badge` is passed in rather than read off `item` so a row can carry a real
 * count alongside the placeholders still baked into `lib/config/dashboard.ts`
 * — see `navCounts` on `DashboardSidebar`.
 *
 * A row whose route hasn't been built yet renders as inert text rather than a
 * link, the same treatment `settings-nav.tsx` and `attention-list.tsx` give an
 * unbuilt destination: the admin console draws nine sections and only one of
 * them exists, and eight chevrons onto a 404 would be worse than none. See
 * `DashboardNavItem`'s `built` flag.
 */
function NavRow({
  item,
  active,
  badge,
}: {
  item: DashboardNavItem
  active: boolean
  badge?: number
}) {
  const built = item.built ?? true

  const body = (
    <>
      <item.icon className="size-4.5 shrink-0" />
      <span className="truncate group-data-[collapsible=icon]:hidden">
        {item.title}
      </span>
      {badge ? (
        <span className="ml-auto text-[13px] text-subtle-foreground tabular-nums group-data-[collapsible=icon]:hidden">
          {badge}
        </span>
      ) : null}
    </>
  )

  if (!built) {
    return (
      <RowTooltip label={item.title}>
        <span
          aria-disabled="true"
          title="Coming soon"
          className={cn(rowClass, "cursor-default text-muted-foreground")}
        >
          {body}
        </span>
      </RowTooltip>
    )
  }

  return (
    <RowTooltip label={item.title}>
      <Link
        href={item.href}
        className={cn(rowClass, active ? activeRowClass : idleRowClass)}
      >
        {body}
      </Link>
    </RowTooltip>
  )
}

/**
 * The one row with children, hence the chevron in the exports (Settings in the
 * student sidebar, Platform Settings in the admin one). Expanded, that's a
 * normal inline `Collapsible`. On the rail there's no room to expand inline,
 * so the same row instead opens its sub-items as a flyout menu to the right —
 * and still carries a tooltip, like every other rail icon. (`RowTooltip` can't
 * be reused as-is here: it hands its child straight to `TooltipTrigger`'s
 * `render`, which needs a single Base UI–composable element, and a
 * `DropdownMenuTrigger` has to be *that* element too — so the two are nested
 * by hand instead of stacking two independent wrappers.)
 */
function NavRowWithChildren({
  item,
  pathname,
}: {
  item: DashboardNavItem
  pathname: string
}) {
  const { state, isMobile } = useSidebar()
  const childActive = item.items?.some((child) => pathname === child.href)
  const active = pathname === item.href || childActive
  const [open, setOpen] = React.useState(Boolean(childActive))
  // A parent whose own route hasn't landed has no built children either — the
  // admin console's Platform Settings is the case. The chevron and the four
  // section names still render, because that is the shape the export draws and
  // it says what the console will hold; only the links are withheld.
  const built = item.built ?? true

  if (state === "collapsed" && !isMobile) {
    return (
      <Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      rowClass,
                      "cursor-pointer",
                      active ? activeRowClass : idleRowClass
                    )}
                  />
                }
              />
            }
          >
            <item.icon className="size-4.5 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            sideOffset={12}
            className="w-48"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
              {item.items?.map((child) =>
                built ? (
                  <DropdownMenuItem
                    key={child.href}
                    render={<Link href={child.href} />}
                    data-active={pathname === child.href}
                    className="cursor-pointer data-[active=true]:bg-hover data-[active=true]:font-medium data-[active=true]:text-foreground"
                  >
                    {child.title}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    key={child.href}
                    disabled
                    className="cursor-default"
                  >
                    {child.title}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent side="right" sideOffset={8}>
          {item.title}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          rowClass,
          "cursor-pointer",
          active ? activeRowClass : idleRowClass
        )}
      >
        <item.icon className="size-4.5 shrink-0" />
        <span className="truncate group-data-[collapsible=icon]:hidden">
          {item.title}
        </span>
        <ChevronDownIcon
          className={cn(
            "ml-auto size-4 shrink-0 text-subtle-foreground transition-transform group-data-[collapsible=icon]:hidden",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
        <SidebarMenuSub className="mt-px mr-0 gap-px border-border pr-0">
          {item.items?.map((child) => (
            <SidebarMenuSubItem key={child.href}>
              {built ? (
                <SidebarMenuSubButton
                  isActive={pathname === child.href}
                  render={<Link href={child.href} />}
                  className="h-8 text-sm text-muted-foreground data-[active=true]:bg-card data-[active=true]:text-foreground data-[active=true]:shadow-sm"
                >
                  {child.title}
                </SidebarMenuSubButton>
              ) : (
                <SidebarMenuSubButton
                  aria-disabled="true"
                  title="Coming soon"
                  render={<span />}
                  className="h-8 cursor-default text-sm text-muted-foreground hover:bg-transparent"
                >
                  {child.title}
                </SidebarMenuSubButton>
              )}
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

export {
  rowClass,
  activeRowClass,
  idleRowClass,
  RowTooltip,
  NavRow,
  NavRowWithChildren,
}
