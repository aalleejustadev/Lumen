"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { StatusPage, HomeButton } from "@/components/shared/status-page"

/**
 * The admin console's error boundary.
 *
 * A boundary here rather than only at `app/` so a failed page renders
 * **inside the console shell** — sidebar, app bar and all — instead of
 * replacing the whole screen. The admin who hit it can then move to another
 * page without going back through `/dashboard`, which matters more here than
 * anywhere else in the app: every console page is dynamic and runs several
 * queries, so a cold start or a dropped connection is the ordinary failure,
 * not a rare one.
 *
 * "Back to dashboard" points at the console's own landing page, not the
 * learner's — a boundary that quietly ejected an admin from admin mode would
 * be its own small bug.
 *
 * See `app/error.tsx` for why the message is generic and the digest is shown.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusPage
      title="This page couldn't be loaded"
      description="Something went wrong reading the platform data. Trying again often fixes it — if it doesn't, the error reference below will be in the server logs."
      className="min-h-[70vh]"
    >
      <Button onClick={reset} className="h-10 px-5">
        Try again
      </Button>
      <HomeButton
        href="/dashboard/admin"
        label="Back to console"
        variant="outline"
      />
      {error.digest ? (
        <p className="mt-3 w-full text-[13px] text-subtle-foreground">
          Error reference: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </StatusPage>
  )
}
