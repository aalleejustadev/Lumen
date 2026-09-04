"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Password field with a reveal toggle. The toggle is a real button so it is
 * reachable by keyboard, but it stays out of the tab order between the field
 * and the submit button — `tabIndex={-1}` is the convention here, since the
 * shortcut for "show it" is rarely worth a tab stop.
 */
function PasswordInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(
          "h-11.5 bg-card pr-11 text-[15px] md:text-[15px] dark:bg-card",
          className
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center rounded-r-lg text-subtle-foreground transition-colors hover:text-foreground"
      >
        {visible ? (
          <EyeOffIcon className="size-4.5" />
        ) : (
          <EyeIcon className="size-4.5" />
        )}
      </button>
    </div>
  )
}

export { PasswordInput }
