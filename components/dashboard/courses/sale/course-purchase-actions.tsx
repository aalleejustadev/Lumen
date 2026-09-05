"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HeartIcon, Share2Icon, ShoppingCartIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { addToCart } from "@/lib/actions/cart"
import { toggleWishlist } from "@/lib/actions/wishlist"
import { cn } from "@/lib/utils"

/**
 * The interactive half of `course-purchase-card.tsx`. The card itself stays a
 * Server Component — only these two button groups need state, so only they
 * cross into the client.
 *
 * They're two exports rather than one because the export separates them: the
 * buy pair sits under the price, the save pair under "This course includes".
 * Both call server actions that re-check the session and re-resolve the
 * course title, so the toast copy comes from the server rather than from
 * whatever the client claims it added.
 */

/** "Add to cart" + "Buy now". Buy now is the same add, then straight to the
 *  cart — the checkout flow it eventually wants doesn't exist yet. */
function CourseBuyButtons({ slug }: { slug: string }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [pendingAction, setPendingAction] = React.useState<
    "add" | "buy" | null
  >(null)

  function run(action: "add" | "buy") {
    setPendingAction(action)
    startTransition(async () => {
      const result = await addToCart(slug)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      setPendingAction(null)
      if (result.ok && action === "buy") router.push("/dashboard/cart")
    })
  }

  return (
    <>
      <Button
        onClick={() => run("add")}
        disabled={pending}
        className="mt-4.5 h-11 w-full gap-2 text-sm font-semibold shadow-sm"
      >
        {pendingAction === "add" ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <ShoppingCartIcon data-icon="inline-start" />
        )}
        Add to cart
      </Button>
      <Button
        variant="outline"
        onClick={() => run("buy")}
        disabled={pending}
        className="mt-2.5 h-11 w-full bg-card text-sm font-semibold shadow-sm"
      >
        {pendingAction === "buy" ? <Spinner data-icon="inline-start" /> : null}
        Buy now
      </Button>
    </>
  )
}

/** "Wishlist" + "Share". The wishlist button flips immediately and settles on
 *  whatever the server reports, so a rejected toggle (signed out, course
 *  gone) doesn't leave the heart lying. */
function CourseSaveButtons({
  slug,
  wishlisted: initialWishlisted,
}: {
  slug: string
  wishlisted: boolean
}) {
  const [wishlisted, setWishlisted] = React.useState(initialWishlisted)
  const [pending, startTransition] = React.useTransition()

  function onWishlist() {
    setWishlisted((saved) => !saved)
    startTransition(async () => {
      const result = await toggleWishlist(slug)
      setWishlisted(result.wishlisted)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
    })
  }

  async function onShare() {
    const url = window.location.href
    // `navigator.share` is the right affordance on touch devices and the only
    // one that can reach native targets; `navigator.clipboard` needs a secure
    // context, so fall through to a plain message rather than throwing.
    if (navigator.share) {
      try {
        await navigator.share({ url })
        return
      } catch {
        // Dismissing the native sheet rejects — not an error worth a toast.
        return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.add({ title: "Course link copied to clipboard", type: "success" })
    } catch {
      toast.add({ title: "Couldn't copy the link", type: "error" })
    }
  }

  return (
    <div className="flex gap-2.5">
      <Button
        variant="outline"
        onClick={onWishlist}
        disabled={pending}
        aria-pressed={wishlisted}
        className="h-10 flex-1 gap-1.5 bg-card shadow-sm"
      >
        <HeartIcon
          data-icon="inline-start"
          className={cn(
            "size-4",
            wishlisted && "fill-destructive text-destructive"
          )}
        />
        {wishlisted ? "Wishlisted" : "Wishlist"}
      </Button>
      <Button
        variant="outline"
        onClick={onShare}
        className="h-10 flex-1 gap-1.5 bg-card shadow-sm"
      >
        <Share2Icon data-icon="inline-start" className="size-4" />
        Share
      </Button>
    </div>
  )
}

export { CourseBuyButtons, CourseSaveButtons }
