"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { StatusPage, HomeButton } from "@/components/shared/status-page"

/**
 * The app-wide error boundary — every route below `app/` that has no nearer
 * one falls back to this.
 *
 * `error.tsx` must be a Client Component: React needs a boundary that can
 * hold state and re-render, and `reset()` is what re-runs the failed segment
 * without a full page load.
 *
 * **The message is deliberately generic and the digest is shown.** `error`
 * here is redacted in production — Next replaces the real message with a
 * digest hash and logs the original server-side — so printing `error.message`
 * would show a placeholder in production and a stack-ish string in
 * development, neither of which helps a reader. The digest is the one thing
 * that ties what they are looking at to the server log, so it is surfaced
 * rather than swallowed.
 *
 * The route groups that own chrome have their own boundary
 * (`app/(admin)/error.tsx`, `app/(dashboard)/error.tsx`) so a failure inside
 * the console keeps its sidebar and app bar; this one catches everything
 * else, including the marketing and checkout routes.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // The server already logged the original; this is the browser's copy, so
    // a client-side throw is not lost entirely.
    console.error(error)
  }, [error])

  return (
    <StatusPage
      code="500"
      title="Something went wrong"
      description="That page couldn't be loaded. Trying again often fixes it — if it doesn't, the error reference below will be in the server logs."
    >
      <Button onClick={reset} className="h-10 px-5">
        Try again
      </Button>
      <HomeButton variant="outline" />
      {error.digest ? (
        <p className="mt-3 w-full text-[13px] text-subtle-foreground">
          Error reference: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </StatusPage>
  )
}
