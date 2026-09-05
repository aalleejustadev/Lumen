"use client"

import * as React from "react"
import { ShoppingCartIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { addToCart } from "@/lib/actions/cart"

/**
 * The catalog card's "Add" button (`course-card.tsx`). Same server action and
 * same toast as the sale page's own button — the sale page has its own
 * component only because it pairs with "Buy now" there.
 */
function AddToCartButton({ slug }: { slug: string }) {
  const [pending, startTransition] = React.useTransition()

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await addToCart(slug)
          toast.add({
            title: result.message,
            type: result.ok ? "success" : "error",
          })
        })
      }
      className="h-9 gap-1.5 px-3.5! font-semibold"
    >
      {pending ? (
        <Spinner data-icon="inline-start" className="size-4" />
      ) : (
        <ShoppingCartIcon data-icon="inline-start" className="size-4" />
      )}
      Add
    </Button>
  )
}

export { AddToCartButton }
