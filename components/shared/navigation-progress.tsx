"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { NAVIGATION_PROGRESS_EVENT } from "@/lib/navigation-progress"

/** How far the bar crawls while we wait — never all the way, it hasn't arrived yet. */
const CRAWL_TARGET = "90%"
/** Long enough that the tail is a genuine crawl; the easing does the real work. */
const CRAWL_MS = 6000
/** Fast routes would otherwise flash for two frames and read as a glitch. */
const MIN_VISIBLE_MS = 420
/** A navigation that never lands (an aborted transition) must not pin the bar. */
const SAFETY_MS = 12000

const FILL_MS = 190
const FADE_MS = 280

const IDLE: React.CSSProperties = {
  width: "0%",
  opacity: 0,
  transitionProperty: "none",
}

/**
 * The app-wide navigation indicator: a 5px gradient line across the top edge,
 * shown for the whole of a client-side route change.
 *
 * The two halves come from different places. The *start* is the window event
 * `instrumentation-client.ts` dispatches from Next's `onRouterTransitionStart`
 * — the App Router has no router events, so that hook is the only global
 * "navigation began" signal. The *end* is this component re-rendering with a
 * new pathname/search, which only happens once the destination has committed.
 *
 * The crawl is one CSS transition rather than a timer loop: a 6s ease-out to
 * 90% covers most of the bar in the first few hundred milliseconds and then
 * inches, which is the nprogress feel without a `setInterval` running.
 */
function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [style, setStyle] = React.useState<React.CSSProperties>(IDLE)

  const activeRef = React.useRef(false)
  const startedAtRef = React.useRef(0)
  const timersRef = React.useRef<number[]>([])
  const frameRef = React.useRef(0)

  const clearPending = React.useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    cancelAnimationFrame(frameRef.current)
  }, [])

  const after = React.useCallback((ms: number, run: () => void) => {
    timersRef.current.push(window.setTimeout(run, ms))
  }, [])

  const finish = React.useCallback(() => {
    if (!activeRef.current) {
      return
    }

    activeRef.current = false
    clearPending()

    // Hold a fast navigation on screen long enough to read as a sweep.
    const hold = Math.max(
      0,
      MIN_VISIBLE_MS - (performance.now() - startedAtRef.current)
    )

    after(hold, () => {
      setStyle({
        width: "100%",
        opacity: 1,
        transitionProperty: "width",
        transitionDuration: `${FILL_MS}ms`,
        transitionTimingFunction: "ease-out",
      })

      after(FILL_MS, () => {
        setStyle({
          width: "100%",
          opacity: 0,
          transitionProperty: "opacity",
          transitionDuration: `${FADE_MS}ms`,
          transitionTimingFunction: "ease-out",
        })

        // Snap back to zero width only once it is invisible, so the reset
        // isn't a visible rewind.
        after(FADE_MS, () => setStyle(IDLE))
      })
    })
  }, [after, clearPending])

  const start = React.useCallback(() => {
    clearPending()
    activeRef.current = true
    startedAtRef.current = performance.now()

    // Back to zero with no transition, then crawl — two frames apart so the
    // browser can't collapse the reset and the target into one style change.
    setStyle(IDLE)
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = requestAnimationFrame(() => {
        setStyle({
          width: CRAWL_TARGET,
          opacity: 1,
          transitionProperty: "width, opacity",
          transitionDuration: `${CRAWL_MS}ms, 120ms`,
          transitionTimingFunction: "cubic-bezier(0.1, 0.8, 0.2, 1), linear",
        })
      })
    })

    after(SAFETY_MS, finish)
  }, [after, clearPending, finish])

  React.useEffect(() => {
    window.addEventListener(NAVIGATION_PROGRESS_EVENT, start)

    return () => {
      window.removeEventListener(NAVIGATION_PROGRESS_EVENT, start)
      clearPending()
    }
  }, [clearPending, start])

  // The destination has rendered. `searchParams` is in the key so a
  // query-string-only navigation ends the bar too.
  const route = `${pathname}?${searchParams}`
  const lastRouteRef = React.useRef(route)

  React.useEffect(() => {
    if (lastRouteRef.current === route) {
      return
    }

    lastRouteRef.current = route
    finish()
  }, [finish, route])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className="h-full bg-[image:var(--gradient-brand)] bg-no-repeat shadow-[0_0_10px_rgba(59,130,246,0.5)]"
        style={{
          // Anchor the gradient to the viewport, not to the bar: the fill then
          // *reveals* violet → blue → cyan instead of squashing all three
          // stops into whatever width it currently has.
          backgroundSize: "100vw 100%",
          ...style,
        }}
      />
    </div>
  )
}

export { NavigationProgress }
