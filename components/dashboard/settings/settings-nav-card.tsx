"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * The sections card every settings shell draws — the learner's
 * `setting-profile-page.png`, the console's `platform-settings.png` and the
 * instructor's `profile-page.png` all draw it identically: a 228px column of
 * 40px rows on a 10px-padded card, the current one tinted `bg-hover`.
 *
 * It lives in one module for the reason `components/dashboard/sidebar-nav.tsx`
 * does: three shells draw the same rows over different lists, so a change to
 * how a row looks or behaves has to land on all three at once. The three
 * wrappers around it (`settings-nav.tsx`, `admin-settings-nav.tsx`,
 * `instructor-settings-nav.tsx`) exist only to bind their own list, which is
 * what keeps each mode's sections owned by its own config module.
 *
 * Client only for `usePathname()`: the rows have to know which of them is
 * current, and threading the active href down from every settings page is the
 * duplication those config modules exist to prevent.
 *
 * Rows are plain links rather than a `Tabs` or `Sidebar` composition, the same
 * choice `dashboard-sidebar.tsx` made: these are navigations between routes,
 * not tab panels, so a real `<a>` carrying `aria-current` is both simpler and
 * what the browser expects.
 *
 * A section without a route yet renders as inert text — dropping it would lose
 * the page's shape, and linking it would land on a 404. See the `built` flag
 * on each mode's list.
 *
 * **Its three wrappers have to be Client Components too.** `items` carries
 * `icon` — a component, i.e. a function — and a function cannot be serialized
 * across the server→client boundary, so a Server Component passing this list
 * in throws "Only plain objects can be passed to Client Components". Each
 * wrapper therefore imports its own list on the client side, where the prop
 * never crosses a boundary at all.
 */

export type SettingsNavCardItem = {
  title: string
  href: string
  icon: LucideIcon
  built: boolean
}

function SettingsNavCard({ items }: { items: readonly SettingsNavCardItem[] }) {
  const pathname = usePathname()

  return (
    <Card className="[--card-spacing:--spacing(2.5)]">
      <CardContent className="flex flex-col gap-y-1">
        {items.map((item) => {
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

export { SettingsNavCard }
