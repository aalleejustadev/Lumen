import { StatusPage, HomeButton } from "@/components/shared/status-page"

/**
 * The app's one 404, used everywhere.
 *
 * A single global page rather than one per route group, at the user's
 * instruction — and it is also what the most important caller needs.
 * `app/(admin)/layout.tsx` calls `notFound()` for a signed-in learner who
 * guesses a console URL, deliberately, so they cannot tell "you may not see
 * this" from "there is nothing here". A group-level not-found would defeat
 * that twice over: it could not render anyway (the layout that threw cannot
 * wrap its own fallback), and admin chrome around the message would leak the
 * very fact the `notFound()` exists to hide.
 *
 * So the copy has to work for both readings — a mistyped URL and a page the
 * reader is not allowed to know about — which is why it says nothing about
 * permissions.
 */
export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Page not found"
      description="The page you're looking for doesn't exist, or has moved somewhere else."
    >
      <HomeButton />
      <HomeButton href="/" label="Go to homepage" variant="outline" />
    </StatusPage>
  )
}
