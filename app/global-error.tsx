"use client"

import * as React from "react"

/**
 * The last-resort boundary: the only one that catches a throw in the **root
 * layout** itself.
 *
 * It replaces the entire document, so it has to render its own `<html>` and
 * `<body>` — and it therefore gets none of what `app/layout.tsx` provides:
 * no fonts, no `ThemeProvider`, no `globals.css` tokens are guaranteed to
 * have applied. That is why this file, alone in the app, uses inline styles
 * and hard-coded colours instead of `StatusPage` and Tailwind classes: a
 * boundary that depends on the thing that just failed is not a boundary.
 *
 * Everything below the root layout is caught by `app/error.tsx` or by a route
 * group's own boundary, so in practice this should never be seen.
 */
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          textAlign: "center",
          background: "#f4f4f3",
          color: "#18181b",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "10px", fontSize: "15px", color: "#5c5c66" }}>
            The application failed to load. Try again, and if the problem
            continues the reference below will be in the server logs.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "24px",
              height: "40px",
              padding: "0 20px",
              borderRadius: "10px",
              border: 0,
              cursor: "pointer",
              background: "#18181b",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p
              style={{ marginTop: "16px", fontSize: "13px", color: "#8a8a94" }}
            >
              Error reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  )
}
