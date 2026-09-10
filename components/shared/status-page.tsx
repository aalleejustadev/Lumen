import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The shared body of the app's error and not-found screens.
 *
 * One component rather than a layout per boundary: Next wants a separate
 * file for each of `error`, `global-error` and `not-found`, and for each
 * route group that wants to keep its own chrome — so without this the same
 * centred block would be written five times and drift the first time one of
 * them was touched. The files themselves stay thin: they decide the copy and
 * the actions, this decides how it looks.
 *
 * Deliberately plain. These screens appear when something has already gone
 * wrong, so they use nothing but tokens, a heading and up to two buttons —
 * no card, no illustration, nothing that could itself fail to load. It is
 * also why `global-error.tsx`, which replaces the root layout and therefore
 * loses the fonts and providers, can render the same markup and still look
 * like the app.
 */
function StatusPage({
  code,
  title,
  description,
  children,
  className,
}: {
  /** The big muted number — "404", "500". Omitted where there isn't one. */
  code?: string
  title: string
  description: string
  /** The actions. Usually one or two `Button`s. */
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] w-full flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      {code ? (
        <p className="text-[64px] leading-none font-extrabold tracking-[-0.03em] text-subtle-foreground tabular-nums">
          {code}
        </p>
      ) : null}
      <h1 className="mt-5 text-[26px] leading-tight font-bold">{title}</h1>
      <p className="mt-2.5 max-w-md text-[15px] text-muted-foreground">
        {description}
      </p>
      {children ? (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {children}
        </div>
      ) : null}
    </div>
  )
}

/** "Back to dashboard" — the one action every status screen offers. */
function HomeButton({
  href = "/dashboard",
  label = "Back to dashboard",
  variant = "default",
}: {
  href?: string
  label?: string
  variant?: "default" | "outline"
}) {
  return (
    <Button
      nativeButton={false}
      variant={variant}
      className={cn("h-10 px-5", variant === "outline" && "bg-card shadow-sm")}
      render={<Link href={href} />}
    >
      {label}
    </Button>
  )
}

export { StatusPage, HomeButton }
