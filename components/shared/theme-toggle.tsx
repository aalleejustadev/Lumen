"use client"

import * as React from "react"
import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Both icons are always rendered and swapped by the `dark` class, so the
 * button is identical on the server and the client — no mount flag, no
 * hydration mismatch, no flash of the wrong icon.
 */
function ThemeToggle({
  className,
  variant = "outline",
}: {
  className?: string
  /** The dashboard header wants it bare; the marketing one wants the card. */
  variant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant={variant}
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "size-9.5 cursor-pointer",
        variant === "outline" && "bg-card shadow-sm dark:bg-card",
        className
      )}
    >
      <MoonIcon className="dark:hidden" />
      <SunIcon className="hidden dark:block" />
    </Button>
  )
}

export { ThemeToggle }
