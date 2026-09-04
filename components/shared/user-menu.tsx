"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LayoutDashboardIcon, LogOutIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type MenuUser = {
  name: string
  email: string
  image?: string | null
}

/**
 * Two letters from the display name, falling back to the address. Only ever
 * seen when the provider gave us no picture, or the picture fails to load.
 */
function initialsOf(name: string, email: string) {
  const source = name.trim() || email
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase()
}

/**
 * The signed-in half of the site header: an avatar that opens the account
 * menu. It exists so the header answers "am I logged in?" at a glance — the
 * name and address in the menu are the confirmation, and sign-out has to live
 * somewhere reachable.
 *
 * A trimmed cousin of the dashboard's own user menu; the rest of that menu
 * (billing, notifications, admin console) belongs to the app shell, not here.
 */
function UserMenu({ user, className }: { user: MenuUser; className?: string }) {
  const router = useRouter()
  const [signingOut, setSigningOut] = React.useState(false)

  async function signOut() {
    setSigningOut(true)
    await authClient.signOut()
    // The header is server-rendered from the session cookie, so the page has
    // to be refetched for it to flip back to the signed-out state.
    router.push("/")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(
          "cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
      >
        {/* The menu closes the moment "Log out" is clicked, and clearing the
            session is a round trip — so the pending state lives on the trigger,
            which is still on screen. */}
        <Avatar className="size-9.5">
          {signingOut ? (
            <AvatarFallback className="bg-hover text-foreground">
              <Spinner className="size-4" />
            </AvatarFallback>
          ) : (
            <>
              {/* Base UI swaps in the fallback while this loads and if it
                  errors, so a dead provider URL degrades to initials rather
                  than a broken image. `no-referrer` keeps the page URL out of
                  requests to the provider's CDN. */}
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
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        {/* The dashboard export leads its account menu with the avatar beside
            the name and address; same here, so the picture is the first thing
            that confirms who you're signed in as. */}
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
        <DropdownMenuItem
          render={<Link href="/dashboard" />}
          className="cursor-pointer"
        >
          <LayoutDashboardIcon />
          Dashboard
        </DropdownMenuItem>
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

export { UserMenu, initialsOf, type MenuUser }
