import Link from "next/link"
import { BellIcon, ShoppingCartIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSearch } from "@/components/dashboard/dashboard-search"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { AccountMenu } from "@/components/dashboard/account-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initialsOf, type MenuUser } from "@/lib/user"

/**
 * The app bar, measured off `ui-design/light/dashboard/dashboard-header.png`:
 * a 70px row over the content column, a 38px collapse control, the 40px search
 * field, then the instructor link, cart, notifications, theme and avatar — the
 * three icons bare rather than boxed, with a rule before the avatar.
 */
function DashboardHeader({
  user,
  isAdmin,
}: {
  user: MenuUser
  isAdmin?: boolean
}) {
  return (
    <header className="sticky top-0 z-40 flex h-[70px] shrink-0 items-center gap-3 border-b bg-background px-4 sm:gap-4 sm:px-6">
      <SidebarTrigger className="size-9.5 shrink-0 cursor-pointer border bg-card shadow-sm dark:bg-card" />

      <DashboardSearch />

      <div className="ml-auto flex items-center gap-3">
        {/* The one coloured thing in the bar, so it reads as the invitation it
            is rather than another icon. */}
        <Link
          href="/teach"
          className="text-gradient hidden text-sm font-semibold transition-opacity hover:opacity-80 lg:block"
        >
          Become an Instructor
        </Link>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Cart"
          nativeButton={false}
          className="hidden size-9.5 cursor-pointer sm:inline-flex"
          render={<Link href="/dashboard/cart" />}
        >
          <ShoppingCartIcon />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          nativeButton={false}
          className="relative hidden size-9.5 cursor-pointer sm:inline-flex"
          render={<Link href="/dashboard/notifications" />}
        >
          <BellIcon />
          {/* Unread marker. Static until notifications have a source. */}
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-destructive" />
        </Button>

        <ThemeToggle variant="ghost" />

        <Separator
          orientation="vertical"
          className="mx-1 hidden h-6 sm:block"
        />

        <AccountMenu
          user={user}
          isAdmin={isAdmin}
          triggerClassName="cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          trigger={
            <Avatar className="size-9.5">
              <AvatarImage
                src={user.image ?? undefined}
                alt=""
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="bg-hover text-xs font-semibold text-foreground">
                {initialsOf(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
          }
        />
      </div>
    </header>
  )
}

export { DashboardHeader }
