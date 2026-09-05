"use client"

import * as React from "react"

import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { removeFromCart } from "@/lib/actions/cart"

/**
 * The "Remove" link on a cart row. A plain text button rather than a
 * `Button` — the export draws it as muted body text, not a control, and the
 * only affordance is the hover colour.
 */
function RemoveFromCartButton({ slug }: { slug: string }) {
  const [pending, startTransition] = React.useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await removeFromCart(slug)
          toast.add({
            title: result.message,
            type: result.ok ? "success" : "error",
          })
        })
      }
      className="flex cursor-pointer items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? <Spinner className="size-3.5" /> : null}
      Remove
    </button>
  )
}

export { RemoveFromCartButton }
