"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeHotkey />
      {children}
    </NextThemesProvider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      // **Checked before the key, not after.** Nothing typed into a field is
      // ever this hotkey, so leaving early is both cheaper and the honest
      // reading — and it is what keeps a browser's own autofill dropdown,
      // which targets the field, out of the branch below.
      if (isTypingTarget(event.target)) {
        return
      }

      // **`event.key` is not always a string**, whatever `KeyboardEvent` says.
      // Chrome dispatches a `keydown` with no `key` at all when a suggestion
      // is chosen from its autofill dropdown, and this read `undefined
      // .toLowerCase()` and threw. TypeScript types the field as a plain
      // `string`, so nothing but running it could have caught this.
      if (typeof event.key !== "string" || event.key.toLowerCase() !== "d") {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider }
