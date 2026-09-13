import Link from "next/link"
import { BellIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSearch } from "@/components/dashboard/dashboard-search"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { AccountMenu } from "@/components/dashboard/account-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initialsOf, type MenuUser } from "@/lib/user"

/**
 * The app bar in instructor mode — the same 70px row as the other two shells,
 * minus the two things that belong to a learner, for the reasons
 * `AdminHeader` already gives about the console:
 *
 *  - **No cart.** Someone in instructor mode is selling, not shopping, and
 *    their own basket badge on a teaching screen is off-surface. It is one
 *    click away in student mode, which is where it means something.
 *  - **No "Become an Instructor".** They already are one — `canBecomeInstructor`
 *    excludes an account with a teaching profile outright, so the invitation
 *    would never have rendered here anyway.
 *
 * The search stays, over this mode's own navigation: a palette that jumped to
 * My Learning from in here would quietly drop you back into the student shell.
 * The bell is the same — it points at `/dashboard/instructor/notifications`,
 * this mode's feed, and its marker is drawn only while something is actually
 * unread.
 */
function InstructorHeader({
  user,
  unreadNotifications = 0,
}: {
  user: MenuUser
  /** Unread rows in this mode's feed, counted in `app/(instructor)/layout.tsx`. */
  unreadNotifications?: number
}) {
  return (
    <header className="sticky top-0 z-40 flex h-[70px] shrink-0 items-center gap-3 border-b bg-background px-4 sm:gap-4 sm:px-6">
      <SidebarTrigger className="size-9.5 shrink-0 cursor-pointer border bg-card shadow-sm dark:bg-card" />

      <DashboardSearch variant="instructor" />

      <div className="ml-auto flex items-center gap-3">
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
          render={<Link href="/dashboard/instructor/notifications" />}
        >
          <BellIcon />
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

export { InstructorHeader }
