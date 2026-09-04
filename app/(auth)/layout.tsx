import Link from "next/link"

import { AuthShowcase } from "@/components/auth/auth-showcase"
import { Logo } from "@/components/shared/logo"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { siteConfig } from "@/lib/config/site"

/**
 * The two-up auth shell: form on the left, gradient showcase on the right,
 * a 50/50 split from lg up (measured off the export at a 1800px viewport).
 * Below lg the showcase drops and the form takes the full width.
 *
 * The form column itself is 410px wide, centred in its half, with the logo and
 * the theme toggle pinned to the top on a 40px gutter.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 pt-6 pb-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label={`${siteConfig.name} home`}>
            <Logo markClassName="size-8" />
          </Link>
          <ThemeToggle />
        </div>

        {/* Small, flexible gutter rather than a fixed `py-12`: the register
            form is 260px taller than the sign-in one, and that padding was the
            difference between fitting the viewport and scrolling. */}
        <div className="flex flex-1 items-center justify-center py-4">
          <div className="w-full max-w-[410px]">{children}</div>
        </div>
      </div>

      <AuthShowcase />
    </div>
  )
}
