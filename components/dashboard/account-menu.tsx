"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CircleCheckIcon, LogOutIcon, ShieldCheckIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { initialsOf, type MenuUser } from "@/lib/user"
import { authClient } from "@/lib/auth-client"
import { accountMenu } from "@/lib/config/dashboard"
import { adminAccountMenu, EXIT_ADMIN_HREF } from "@/lib/config/admin-nav"

type Placement = React.ComponentProps<typeof DropdownMenuContent>

/**
 * The account menu from the dashboard exports, shared by the two places it
 * hangs off: the sidebar's footer row and the header's avatar. Only the
 * trigger and the placement differ, so only those are props.
 *
 * It has two forms, one per shell, and `adminMode` picks between them:
 *
 *  - The student shell's, from `access-admin-console__admin.png` — the five
 *    learner rows, then "Admin console" for an account that has the role.
 *  - The admin console's, from `exit-admin-mode__admin.png` — a shorter list
 *    (Billing, Notifications and Help Center are learner surfaces) ending in
 *    "Exit admin mode", which is the way *out* of the console and so the
 *    counterpart of the entry above rather than a second copy of it.
 *
 * `isAdmin` is only consulted in the student form: inside the console the
 * role is already established by the route guard, so an "Admin console" row
 * there would link the page to itself.
 */
function AccountMenu({
  user,
  isAdmin,
  adminMode,
  trigger,
  triggerClassName,
  side = "bottom",
  align = "end",
  sideOffset = 8,
  signingOut,
  onSignOutStart,
}: {
  user: MenuUser
  isAdmin?: boolean
  /** Render the console's shorter menu with "Exit admin mode" instead. */
  adminMode?: boolean
  trigger: React.ReactNode
  triggerClassName?: string
  side?: Placement["side"]
  align?: Placement["align"]
  sideOffset?: Placement["sideOffset"]
  signingOut?: boolean
  onSignOutStart?: () => void
}) {
  const router = useRouter()

  async function signOut() {
    onSignOutStart?.()
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClassName}>
        {trigger}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="w-60"
      >
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar className="size-9">
            <AvatarImage
              src={user.image ?? undefined}
              alt=""
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="bg-hover text-xs font-semibold text-foreground">
              {initialsOf(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold">{user.name}</span>
            <span className="truncate text-sm text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        {(adminMode ? adminAccountMenu : accountMenu).map((entry) => (
          <DropdownMenuItem
            key={entry.href}
            render={<Link href={entry.href} />}
            className="cursor-pointer p-2"
          >
            <entry.icon />
            {entry.title}
          </DropdownMenuItem>
        ))}
        {adminMode ? (
          <>
            <DropdownMenuSeparator />
            {/* Orange, like the "Admin mode" pill on Platform Overview — the
                `--role-admin` token exists for exactly this, and it is what
                the export tints this one row with. */}
            <DropdownMenuItem
              render={<Link href={EXIT_ADMIN_HREF} />}
              className="cursor-pointer p-2 [&_svg]:text-role-admin"
            >
              <CircleCheckIcon />
              Exit admin mode
            </DropdownMenuItem>
          </>
        ) : isAdmin ? (
          <>
            <DropdownMenuSeparator />
            {/* Only shown to admins — the `admin` plugin puts the role on the
                session, so this can't be a decoration. */}
            <DropdownMenuItem
              render={<Link href="/dashboard/admin" />}
              className="cursor-pointer p-2"
            >
              <ShieldCheckIcon />
              Admin console
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={signOut}
          disabled={signingOut}
          className="cursor-pointer p-2"
        >
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { AccountMenu }
