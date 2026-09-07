/**
 * The bridge between Next's navigation lifecycle and the progress bar.
 *
 * `instrumentation-client.ts` exports `onRouterTransitionStart`, which Next
 * calls for *every* client-side navigation — `<Link>` clicks, `router.push`
 * /`router.replace`, and back/forward — but it runs outside React, before
 * hydration. A window event is the simplest thing that both sides can agree
 * on: no shared module instance, no provider, no import cycle between the
 * instrumentation entry and the component tree.
 *
 * Exported so a rare navigation Next doesn't own (a `window.location`
 * assignment, say) can still light the bar up by hand.
 */
const NAVIGATION_PROGRESS_EVENT = "lumen:navigation-start"

function startNavigationProgress() {
  window.dispatchEvent(new Event(NAVIGATION_PROGRESS_EVENT))
}

export { NAVIGATION_PROGRESS_EVENT, startNavigationProgress }
