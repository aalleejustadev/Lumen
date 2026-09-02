"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Logo } from "@/components/shared/logo"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { marketingNav, siteConfig } from "@/lib/config/site"
import { cn } from "@/lib/utils"

/**
 * Two bars rather than three — 18x2px, 7px between centres. The panel's close
 * button starts from this exact geometry and animates them into a cross, so
 * the control reads as morphing instead of being swapped out.
 */
function MenuBars({ crossed }: { crossed?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="flex flex-col items-center justify-center gap-[5px]"
    >
      <span
        className={cn(
          "h-0.5 w-4.5 origin-center rounded-full bg-current",
          crossed && "animate-menu-x-top"
        )}
      />
      <span
        className={cn(
          "h-0.5 w-4.5 origin-center rounded-full bg-current",
          crossed && "animate-menu-x-bottom"
        )}
      />
    </span>
  )
}

/**
 * Full-height menu that unrolls from under the header: the panel is clipped to
 * nothing and grows downward, its own 70px bar landing exactly over the real
 * one, while the rows rise in on a stagger. Base UI's Dialog underneath keeps
 * the focus trap, the scroll lock and Escape; only the choreography is ours.
 *
 * Everything animation-related is a CSS keyframe, so the global
 * prefers-reduced-motion rule already flattens it to an instant open.
 */
function MarketingMobileNav() {
  const [open, setOpen] = React.useState(false)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="Open menu"
            className="size-9.5 bg-card shadow-sm md:hidden dark:bg-card"
          />
        }
      >
        <MenuBars />
      </SheetTrigger>

      <SheetContent
        side="top"
        showCloseButton={false}
        className={cn(
          "gap-0 overflow-y-auto bg-background p-0 shadow-none",
          "data-[side=top]:h-dvh data-[side=top]:border-b-0",
          // The unroll. `transition` doesn't cover clip-path, so the property
          // list is spelled out; the base slide-down is kept, the fade is not
          // — a translucent panel over an identical header looks like a bug.
          "transition-[clip-path,transform] duration-[520ms] ease-[var(--ease-out-soft)]",
          "[clip-path:inset(0_0_0_0)]",
          "data-starting-style:opacity-100 data-starting-style:[clip-path:inset(0_0_100%_0)]",
          "data-ending-style:opacity-100 data-ending-style:[clip-path:inset(0_0_100%_0)]"
        )}
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        {/* The hero's orbs, without its grid — at this size the 58px rules
            read as graph paper and fight the rows. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="orb top-[22%] left-[86%] size-[420px] -translate-x-1/2 -translate-y-1/2 animate-drift-2 bg-accent-1 opacity-[var(--orb-soft)]" />
          <div className="orb top-[88%] left-[6%] size-[380px] -translate-x-1/2 -translate-y-1/2 animate-drift-3 bg-accent-3 opacity-[var(--ambient)]" />
        </div>

        <div className="relative flex min-h-full flex-col">
          {/* mirrors the header bar, down to the 70px height and the border */}
          <div className="flex h-[70px] shrink-0 items-center justify-between border-b px-6">
            <Link
              href="/"
              onClick={close}
              aria-label={`${siteConfig.name} home`}
            >
              <Logo markClassName="size-8" />
            </Link>
            <SheetClose
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Close menu"
                  className="size-9.5 bg-card shadow-sm dark:bg-card"
                />
              }
            >
              <MenuBars crossed />
            </SheetClose>
          </div>

          {/* Centred in whatever is left between the bar and the actions, so a
              tall phone doesn't leave the rows stranded at the top. */}
          <nav className="flex flex-1 flex-col justify-center px-6 py-4">
            {marketingNav.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                style={{ animationDelay: `${110 + index * 55}ms` }}
                className="group flex animate-nav-item items-center gap-4 border-b border-border-subtle py-5 last:border-b-0 [@media(max-height:680px)]:py-3.5"
              >
                <span className="w-5 font-mono text-[11px] text-subtle-foreground tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[26px] font-extrabold tracking-[-0.03em] transition-colors group-active:text-accent-1 [@media(max-height:680px)]:text-[22px]">
                  {item.title}
                </span>
                <ArrowUpRightIcon className="ml-auto size-5 text-subtle-foreground transition-transform group-active:translate-x-0.5 group-active:-translate-y-0.5" />
              </Link>
            ))}
          </nav>

          <div
            style={{ animationDelay: `${110 + marketingNav.length * 55}ms` }}
            className="flex animate-nav-item flex-col gap-2.5 px-6 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))]"
          >
            <Button
              nativeButton={false}
              className="h-12 gap-2 px-5! font-semibold"
              render={<Link href="/register" onClick={close} />}
            >
              Get started
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              className="h-12 bg-card font-semibold"
              render={<Link href="/login" onClick={close} />}
            >
              Log in
            </Button>

            <div className="mt-4 flex items-center justify-between rounded-xl border bg-card px-4 py-3 [@media(max-height:680px)]:mt-2">
              <span className="text-sm text-muted-foreground">Appearance</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { MarketingMobileNav }
