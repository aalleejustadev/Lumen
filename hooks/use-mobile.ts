import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Whether the viewport is phone-sized. Used by `components/ui/sidebar.tsx` to
 * swap the panel for a drawer.
 *
 * **`useSyncExternalStore`, not `useState` + `useEffect`.** The generated
 * version set state synchronously inside an effect body, which is the
 * `react-hooks/set-state-in-effect` error this repo otherwise has none of: it
 * causes a cascading render on every mount, and React's own guidance is that a
 * value read from an external system — which a media query is — should be
 * subscribed to rather than copied into state.
 *
 * The server snapshot is `false`, which is what the old hook effectively
 * returned on the first render (`!!undefined`), so nothing about the markup
 * React hydrates has changed. `npx shadcn@latest add sidebar` will revert
 * this; re-apply it.
 */
export function useIsMobile() {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    query.addEventListener("change", onStoreChange)
    return () => query.removeEventListener("change", onStoreChange)
  }, [])

  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    // There is no viewport on the server; the panel renders and the drawer
    // takes over after hydration.
    () => false
  )
}
