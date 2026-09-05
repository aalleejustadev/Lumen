import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { CartSummary } from "@/lib/cart"

/**
 * The right column of `cart-page.png`: Subtotal and Discount rows, a rule,
 * then Total, the checkout CTA and a "Continue browsing" link back to the
 * catalog. Measured off that export — 22px padding, 25px row pitch, a 44px
 * primary button.
 *
 * There's no checkout flow yet, so "Proceed to checkout" is deliberately
 * disabled rather than pointing at a route that would 404.
 */
function OrderSummaryCard({ summary }: { summary: CartSummary }) {
  const rows = [
    { label: "Subtotal", value: summary.subtotal },
    { label: "Discount", value: summary.discount },
  ]

  return (
    <Card className="gap-0 px-5.5 py-5 ring-border">
      {/* h3, not h2 — this is a card title, which the base rule in
          `globals.css` already sets to 700 (h2 would render 800). */}
      <h3 className="text-base">Order summary</h3>

      <dl className="mt-3 flex flex-col gap-1.25">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="text-sm tabular-nums">${row.value.toFixed(2)}</dd>
          </div>
        ))}
      </dl>

      <Separator className="my-3" />

      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold">Total</span>
        <span className="text-lg font-bold tabular-nums">
          ${summary.total.toFixed(2)}
        </span>
      </div>

      <Button
        disabled={summary.lines.length === 0}
        className="mt-4 h-11 w-full text-sm font-semibold shadow-sm"
      >
        Proceed to checkout
      </Button>

      {/* Plain centred text rather than a ghost `Button`: the export draws no
          control here, and a 36px button box would push the card taller. */}
      <Link
        href="/dashboard/courses"
        className="mt-3 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Continue browsing
      </Link>
    </Card>
  )
}

export { OrderSummaryCard }
