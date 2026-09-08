"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { settingsNav } from "@/lib/config/settings"
import { cn } from "@/lib/utils"

/**
 * The settings sections card, from
 * `ui-design/light/dashboard/student/setting-profile-page.png` — a 228px
 * column of four 40px rows on a 10px-padded card, the current one tinted
 * `bg-hover`.
 *
 * Client only for `usePathname()`: the rows have to know which of them is
 * current, and the alternative (threading the active href down from every
 * settings page) is the kind of duplication `lib/config/settings.ts` exists
 * to prevent.
 *
 * Rows and active state are plain links rather than a `Tabs` or `Sidebar`
 * composition, the same choice `dashboard-sidebar.tsx` made: these are
 * navigations between routes, not tab panels, so a real `<a>` with a
 * `aria-current` is both simpler and what the browser expects.
 *
 * The three sections without a route yet render as inert text — the export
 * draws all four identically and dropping them would lose the page's shape,
 * but linking them would land on a 404. See `settingsNav`'s `built` flag.
 */
function SettingsNav() {
  const pathname = usePathname()

  return (
    <Card className="[--card-spacing:--spacing(2.5)]">
      <CardContent className="flex flex-col">
        {settingsNav.map((item) => {
          const active = pathname === item.href
          const className = cn(
            "flex h-10 items-center gap-3.5 rounded-lg px-3.5 text-sm font-medium transition-colors",
            active ? "bg-hover" : "hover:bg-hover",
            item.built
              ? ""
              : "cursor-default text-foreground/90 hover:bg-transparent"
          )

          if (!item.built) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                title="Coming soon"
                className={className}
              >
                <item.icon className="size-4 text-muted-foreground" />
                {item.title}
              </span>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={className}
            >
              <item.icon className="size-4 text-muted-foreground" />
              {item.title}
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

export { SettingsNav }
