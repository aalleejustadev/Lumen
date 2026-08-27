import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/shared/logo"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { MarketingMobileNav } from "@/components/marketing/marketing-mobile-nav"
import { marketingNav, siteConfig } from "@/lib/config/site"

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      {/* 70px bar over a 1152px content box, per the design. */}
      <div className="mx-auto flex h-[70px] w-full max-w-[1200px] items-center gap-8 px-6">
        <Link href="/" aria-label={`${siteConfig.name} home`}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            nativeButton={false}
            className="hidden h-10 px-4 text-muted-foreground sm:inline-flex"
            render={<Link href="/login" />}
          >
            Log in
          </Button>
          <Button
            nativeButton={false}
            // `px-4.5!` beats the variant's `has-data-[icon=inline-end]:pr-2`,
            // which would otherwise pull the arrow in off-design.
            className="hidden h-10 gap-2 px-4.5! font-semibold sm:inline-flex"
            render={<Link href="/register" />}
          >
            Get started
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <MarketingMobileNav />
        </div>
      </div>
    </header>
  )
}

export { SiteHeader }
