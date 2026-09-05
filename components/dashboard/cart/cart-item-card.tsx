import Link from "next/link"

import { Card } from "@/components/ui/card"
import { RemoveFromCartButton } from "@/components/dashboard/cart/remove-from-cart-button"
import type { CartLine } from "@/lib/cart"
import { cn } from "@/lib/utils"

/**
 * One row of the cart, from `cart-page.png`: a 110×70 thumbnail, the title
 * over the instructor, and the price over "Remove" on the right. Card art is
 * the per-category gradient + icon rather than the export's photo — same rule
 * as every other course surface (`lumen-course-card-art`).
 *
 * The title links through to the sale page; "Remove" is its own client button
 * outside that link, so removing doesn't also navigate — the same split
 * `course-card.tsx` makes for its "Add" button.
 */
function CartItemCard({ line }: { line: CartLine }) {
  const { course } = line

  return (
    <Card className="flex-row items-center gap-4 p-4 ring-border">
      <div
        className={cn(
          "grid h-[70px] w-[110px] shrink-0 place-items-center rounded-lg bg-gradient-to-br",
          course.art
        )}
      >
        <course.icon className="size-7 text-white/30" />
      </div>

      <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/dashboard/courses/${course.slug}`}
            className="text-[15px] font-bold hover:underline"
          >
            {course.title}
          </Link>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {course.instructor}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-[15px] font-bold tabular-nums">
            ${course.price.toFixed(2)}
          </span>
          <RemoveFromCartButton slug={course.slug} />
        </div>
      </div>
    </Card>
  )
}

export { CartItemCard }
