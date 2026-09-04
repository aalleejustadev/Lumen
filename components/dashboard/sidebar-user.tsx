"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EllipsisVerticalIcon, LogOutIcon, ShieldCheckIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { useSidebar } from "@/components/ui/sidebar"
import { initialsOf, type MenuUser } from "@/components/shared/user-menu"
import { authClient } from "@/lib/auth-client"
import { accountMenu } from "@/lib/config/dashboard"

/**
 * The sidebar's footer row: avatar, name, address, and the ⋮ that opens the
 * account menu from `user-menu__sidebar.png`. The whole row is the trigger —
 * a 38px target in the corner would be needlessly fiddly.
 */
function SidebarUser({ user, isAdmin }: { user: MenuUser; isAdmin?: boolean }) {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [signingOut, setSigningOut] = React.useState(false)

  async function signOut() {
    setSigningOut(true)
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors outline-none hover:bg-hover focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:bg-hover">
        <Avatar className="size-9.5">
          {signingOut ? (
            <AvatarFallback className="bg-hover text-foreground">
              <Spinner className="size-4" />
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage
                src={user.image ?? undefined}
                alt=""
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="bg-hover text-xs font-semibold text-foreground">
                {initialsOf(user.name, user.email)}
              </AvatarFallback>
            </>
          )}
        </Avatar>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-semibold">
            {user.name}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </span>
        <EllipsisVerticalIcon className="size-4 shrink-0 text-subtle-foreground" />
      </DropdownMenuTrigger>

      {/* Out to the right of the sidebar, bottom-aligned with the row that
          opened it — as in `user-menu__sidebar.png`. The offset has to clear
          the sidebar's own 12px gutter before it reads as a gap.
          On a phone the drawer fills the screen and there is no "right" to
          open into — Base UI doesn't shift it back on its own, so it goes
          above the row instead. */}
      <DropdownMenuContent
        side={isMobile ? "top" : "right"}
        align="end"
        sideOffset={isMobile ? 8 : 20}
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

export { SidebarUser }
