"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { StatusPage, HomeButton } from "@/components/shared/status-page"

/**
 * The learner dashboard's error boundary — the sibling of
 * `app/(admin)/error.tsx`, and there for the same reason: a failed page
 * keeps the sidebar and app bar, so the reader can move somewhere else
 * instead of being dropped to a bare screen.
 */
export default function DashboardError({
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
      description="Something went wrong. Trying again often fixes it — if it doesn't, the error reference below will be in the server logs."
      className="min-h-[70vh]"
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
