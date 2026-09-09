import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { BellIcon } from "lucide-react"
import { DashboardSearch } from "@/components/dashboard/dashboard-search"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { AccountMenu } from "@/components/dashboard/account-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initialsOf, type MenuUser } from "@/lib/user"

/**
 * The app bar in admin mode, from the right-hand crop in
 * `ui-design/light/dashboard/admin/exit-admin-mode__admin.png`: the same 70px
 * row as the student shell's `DashboardHeader`, minus the two things that
 * belong to a learner.
 *
 *  - **No cart.** An admin in the console is not shopping, and the badge would
 *    be advertising their own basket on a platform-administration screen.
 *  - **No "Become an Instructor".** That invitation is for learners who
 *    haven't taken it up — see `canBecomeInstructor` in `lib/instructor.ts`,
 *    which excludes admins outright.
 *
 * The search stays, over the console's own navigation rather than the
 * student palette: jumping to My Learning from in here would silently drop
 * you out of admin mode.
 */
function AdminHeader({ user }: { user: MenuUser }) {
  return (
    <header className="sticky top-0 z-40 flex h-[70px] shrink-0 items-center gap-3 border-b bg-background px-4 sm:gap-4 sm:px-6">
      <SidebarTrigger className="size-9.5 shrink-0 cursor-pointer border bg-card shadow-sm dark:bg-card" />

      <DashboardSearch variant="admin" />

      <div className="ml-auto flex items-center gap-3">
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
          adminMode
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

export { AdminHeader }
