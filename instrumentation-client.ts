import { startNavigationProgress } from "@/lib/navigation-progress"

/**
 * Next calls this at the *start* of every client-side navigation. It is the
 * only global "navigation began" signal the App Router exposes — there are no
 * router events, and `history.pushState` is patched by the router but only
 * fires once the transition has already committed, which is too late to be a
 * start signal. `components/shared/navigation-progress.tsx` listens for the
 * `NAVIGATION_PROGRESS_EVENT` this dispatches.
 */
export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse"
) {
  // A push/replace to the URL we are already on paints nothing, so don't run
  // the bar for it. `traverse` (back/forward) is exempt: it is dispatched from
  // `popstate`, by which point `location` is *already* the destination, so the
  // same comparison would suppress every back/forward navigation.
  if (navigationType !== "traverse") {
    const target = new URL(url, window.location.href)

    if (
      target.pathname === window.location.pathname &&
      target.search === window.location.search
    ) {
      return
    }
  }

  startNavigationProgress()
}
