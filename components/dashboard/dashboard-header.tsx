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
 *
 * `cartCount` comes down from the layout — the header is a Server Component,
 * so the badge is server-rendered rather than held in client state. It stays
 * current because the cart actions in `lib/actions/cart.ts` revalidate, which
 * makes Next re-render this layout as part of the action's response; see the
 * note there.
 *
 * `showInstructorCta` is decided in the layout by `canBecomeInstructor`, not
 * here: "Become an Instructor" is an invitation, so it is only shown to a
 * learner who hasn't taken it up. Admins and accounts that already have a
 * teaching profile never see it.
 */
function DashboardHeader({
  user,
  isAdmin,
  cartCount = 0,
  unreadNotifications = 0,
  showInstructorCta = false,
}: {
  user: MenuUser
  isAdmin?: boolean
  cartCount?: number
  /** Unread rows in the learner's feed, counted in `app/(dashboard)/layout.tsx`. */
  unreadNotifications?: number
  showInstructorCta?: boolean
}) {
  return (
    <header className="sticky top-0 z-40 flex h-[70px] shrink-0 items-center gap-3 border-b bg-background px-4 sm:gap-4 sm:px-6">
      <SidebarTrigger className="size-9.5 shrink-0 cursor-pointer border bg-card shadow-sm dark:bg-card" />

      <DashboardSearch />

      <div className="ml-auto flex items-center gap-3">
        {/* The one coloured thing in the bar, so it reads as the invitation it
            is rather than another icon — and only for someone it is still an
            invitation to. */}
        {showInstructorCta ? (
          <Link
            href="/teach"
            className="text-gradient hidden text-sm font-semibold transition-opacity hover:opacity-80 lg:block"
          >
            Become an Instructor
          </Link>
        ) : null}

        <Button
          variant="ghost"
          size="icon"
          aria-label={
            cartCount > 0
              ? `Cart, ${cartCount} ${cartCount === 1 ? "course" : "courses"}`
              : "Cart"
          }
          nativeButton={false}
          className="relative hidden size-9.5 cursor-pointer sm:inline-flex"
          render={<Link href="/dashboard/cart" />}
        >
          <ShoppingCartIcon />
          {/* Sits on the glyph's top-right corner. `min-w-4` + `px-1` rather
              than a fixed circle so a two-digit count widens the pill instead
              of overflowing it; the count itself is already in `aria-label`,
              so the badge is hidden from assistive tech. */}
          {cartCount > 0 ? (
            <span
              aria-hidden
              className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums"
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          ) : null}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unreadNotifications > 0
              ? `Notifications — ${unreadNotifications} unread`
              : "Notifications"
          }
          nativeButton={false}
          className="relative hidden size-9.5 cursor-pointer sm:inline-flex"
          render={<Link href="/dashboard/notifications" />}
        >
          <BellIcon />
          {/* Real now that the feed exists: the layout counts the learner's
              unread rows. Drawn only when there is something unread, so a
              clear feed shows a clean bell rather than a marker that never
              goes out. */}
          {unreadNotifications > 0 ? (
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-destructive" />
          ) : null}
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
