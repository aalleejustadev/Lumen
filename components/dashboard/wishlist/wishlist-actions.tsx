"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HeartIcon, ShoppingCartIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { addToCart, addWishlistToCart } from "@/lib/actions/cart"
import { removeFromWishlist } from "@/lib/actions/wishlist"

/**
 * The three controls on `/dashboard/wishlist`. Kept together because they are
 * the page's only client code — the rows and the header around them render on
 * the server.
 *
 * All three call server actions that re-check the session and re-resolve the
 * course from the catalog, so the toast copy comes from the server rather
 * than from whatever the client claims it acted on.
 */

/**
 * The heart on a wishlist row. Every course on this page is already saved, so
 * this is a removal rather than a toggle — hence `removeFromWishlist` and not
 * `toggleWishlist`. The outline heart is the export's own drawing; the
 * *filled* one on the sale page is what marks a course as saved, and this
 * page's whole existence already says that.
 *
 * The row disappears when the action's `revalidatePath` lands, so there is no
 * optimistic state to settle — only a spinner while it's in flight.
 */
function RemoveFromWishlistButton({
  slug,
  title,
}: {
  slug: string
  title: string
}) {
  const [pending, startTransition] = React.useTransition()

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Remove ${title} from your wishlist`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await removeFromWishlist(slug)
          toast.add({
            title: result.message,
            type: result.ok ? "success" : "error",
          })
        })
      }
      className="size-10 bg-card"
    >
      {pending ? (
        <Spinner className="size-4.5" />
      ) : (
        <HeartIcon className="size-4.5 text-destructive" />
      )}
    </Button>
  )
}

/**
 * "Enroll now" on a wishlist row. Adds the course and goes straight to
 * `/checkout`, exactly like the sale page's "Buy now" — the saved course is
 * already the decision, so a cart review step in between is a click that only
 * costs conversions. Checkout bills the whole cart, which the checkout
 * summary lists in full.
 *
 * A successful enrol is deliberately silent: the navigation is the feedback,
 * and the spinner is left running rather than snapped back to idle, so the
 * button doesn't look finished while the checkout page is still loading.
 */
function EnrollNowButton({ slug }: { slug: string }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await addToCart(slug)
          if (!result.ok) {
            toast.add({ title: result.message, type: "error" })
            return
          }
          router.push("/checkout")
        })
      }
      className="h-10 gap-2 px-4.5 text-sm font-semibold"
    >
      {pending ? <Spinner className="size-4" /> : null}
      Enroll now
    </Button>
  )
}

/**
 * "Add all to cart" in the page header. Takes no slugs: the action reads the
 * caller's own wishlist rows server-side, so the page can't be talked into
 * adding anything that wasn't saved.
 */
function AddAllToCartButton() {
  const [pending, startTransition] = React.useTransition()

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await addWishlistToCart()
          toast.add({
            title: result.message,
            type: result.ok ? "success" : "error",
          })
        })
      }
      className="h-10 gap-2 px-4.5 text-sm font-semibold"
    >
      {pending ? (
        <Spinner className="size-4" />
      ) : (
        <ShoppingCartIcon className="size-4" />
      )}
      Add all to cart
    </Button>
  )
}

export { AddAllToCartButton, EnrollNowButton, RemoveFromWishlistButton }
