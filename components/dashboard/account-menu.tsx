"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOutIcon, ShieldCheckIcon } from "lucide-react"

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

type Placement = React.ComponentProps<typeof DropdownMenuContent>

/**
 * The account menu from the dashboard exports, shared by the two places it
 * hangs off: the sidebar's footer row and the header's avatar. Only the
 * trigger and the placement differ, so only those are props.
 */
function AccountMenu({
  user,
  isAdmin,
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
        {accountMenu.map((entry) => (
          <DropdownMenuItem
            key={entry.href}
            render={<Link href={entry.href} />}
            className="cursor-pointer"
          >
            <entry.icon />
            {entry.title}
          </DropdownMenuItem>
        ))}
        {/* Only shown to admins — the `admin` plugin puts the role on the
            session, so this can't be a decoration. */}
        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href="/dashboard/admin" />}
              className="cursor-pointer"
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
          className="cursor-pointer"
        >
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { AccountMenu }
