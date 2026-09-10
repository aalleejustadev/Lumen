"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { adminSettingsNav } from "@/lib/config/admin-settings"
import { cn } from "@/lib/utils"

/**
 * The sections card on `/dashboard/admin/settings/*`, from
 * `ui-design/light/dashboard/admin/platform-settings.png` — a 228px column of
 * four 40px rows on a 10px-padded card, the current one tinted `bg-hover`.
 *
 * Measured against that export, the geometry is **identical** to the
 * learner's `settings-nav.tsx`: a 228px nav card, a 28px gutter and a 922px
 * form card, adding to the same 1178px content column. So none of it is
 * re-measured here — the two cards are the same component drawn over two
 * different lists, and the lists are two because the sections differ (the
 * learner has Billing where the admin has Platform Controls).
 *
 * Client only for `usePathname()`, the reason `settings-nav.tsx` gives: the
 * rows have to know which of them is current, and threading the active href
 * down from four pages is the duplication `lib/config/admin-settings.ts`
 * exists to prevent.
 *
 * A row whose route does not exist renders as inert text rather than a link
 * onto a 404 — all four are built today, so the flag currently changes
 * nothing and stays for the reason `settingsNav`'s does: it is what lets a
 * fifth section be listed (and so appear in the sidebar, which derives its
 * Platform Settings children from the same hrefs) before its route lands.
 */
function AdminSettingsNav() {
  const pathname = usePathname()

  return (
    <Card className="[--card-spacing:--spacing(2.5)]">
      <CardContent className="flex flex-col gap-y-1">
        {adminSettingsNav.map((item) => {
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

export { AdminSettingsNav }
