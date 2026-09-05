import Link from "next/link"
import { ShoppingCartIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { CartItemCard } from "@/components/dashboard/cart/cart-item-card"
import { OrderSummaryCard } from "@/components/dashboard/cart/order-summary-card"
import type { CartSummary } from "@/lib/cart"

/**
 * `/dashboard/cart`, from `ui-design/light/dashboard/student/cart-page.png`.
 * Measured off that export at DPR 2: a 920px content column centred in the
 * page (the export's gutters are equal), split `[1fr_346px]` with a 22px gap.
 *
 * The export only shows a filled cart; an empty one gets the `Empty`
 * component rather than a bare summary card totalling $0.00, which is what
 * the layout would otherwise collapse to.
 */
function CartPage({ summary }: { summary: CartSummary }) {
  const count = summary.lines.length

  return (
    <div className="mx-auto w-full max-w-[920px]">
      <h1 className="text-[26px] leading-none">Your Cart</h1>
      <p className="mt-2.5 text-[15px] text-muted-foreground">
        {count === 0
          ? "Your cart is empty"
          : `${count} course${count === 1 ? "" : "s"} in your cart`}
      </p>

      {count === 0 ? (
        <Empty className="mt-6 rounded-xl border bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingCartIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>
              Courses you add to your cart will show up here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/courses" />}
            >
              Browse courses
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="mt-6 grid gap-5.5 lg:grid-cols-[1fr_346px] lg:items-start">
          <div className="flex flex-col gap-4">
            {summary.lines.map((line) => (
              <CartItemCard key={line.id} line={line} />
            ))}
          </div>
          <OrderSummaryCard summary={summary} />
        </div>
      )}
    </div>
  )
}

export { CartPage }
