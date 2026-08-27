"use client"

import * as React from "react"
import Link from "next/link"
import { MenuIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Logo } from "@/components/shared/logo"
import { marketingNav } from "@/lib/config/site"

function MarketingMobileNav() {
  const [open, setOpen] = React.useState(false)

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
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="right" className="bg-background">
        <SheetHeader>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo />
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
            >
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <Button
            variant="ghost"
            nativeButton={false}
            className="h-10"
            render={<Link href="/login" onClick={() => setOpen(false)} />}
          >
            Log in
          </Button>
          <Button
            nativeButton={false}
            className="h-10 font-semibold"
            render={<Link href="/register" onClick={() => setOpen(false)} />}
          >
            Get started
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { MarketingMobileNav }
