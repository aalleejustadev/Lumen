import Link from "next/link"
import { redirect } from "next/navigation"

import { Logo } from "@/components/shared/logo"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { UserMenu } from "@/components/shared/user-menu"
import { getSession } from "@/lib/auth"
import { siteConfig } from "@/lib/config/site"

/**
 * Everything under this group requires a session — the guard lives here rather
 * than in each page so a new route can't forget it.
 *
 * The bar is deliberately thin: `ui-design/light/dashboard/` has the real
 * shell (sidebar, search, notifications, the full account menu) and that is a
 * build of its own. This is enough to land on, see who you are, and get out.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const { user } = session

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="mx-auto flex h-[70px] w-full max-w-[1200px] items-center gap-8 px-6">
          <Link href="/" aria-label={`${siteConfig.name} home`}>
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <UserMenu
              user={{ name: user.name, email: user.email, image: user.image }}
            />
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
