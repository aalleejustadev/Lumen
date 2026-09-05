import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { browseCourses, type BrowseCourse } from "@/lib/config/browse-courses"

/**
 * Server-side reads for the cart and wishlist — it pulls in `lib/db`, so the
 * same "never import this from a Client Component" rule applies. Writes live
 * in `lib/actions/cart.ts` and `lib/actions/wishlist.ts`.
 *
 * Both tables store a `courseSlug` rather than a course row id — see the
 * `CartItem` note in `prisma/schema.prisma`. Resolving that slug against
 * `lib/config/browse-courses.ts` is what every other course surface already
 * does, so the cart shows the same title/price/art as the catalog without a
 * second source of truth. A slug that no longer resolves (a course pulled
 * from the catalog while it sat in someone's cart) is dropped rather than
 * rendered as a broken row.
 */

export type CartLine = {
  /** The cart row's own id, so "Remove" can target it directly. */
  id: string
  course: BrowseCourse
}

export type CartSummary = {
  lines: CartLine[]
  /** Sum of the line prices — the "Subtotal" row. Course prices are already
   *  the sale prices, so the list-vs-sale saving is not part of this
   *  arithmetic; it's shown per course on the catalog card instead. */
  subtotal: number
  /** An order-level discount (promo code, bundle). Always 0 today — there's
   *  no promo system yet, which is exactly why the export shows $0.00. Kept
   *  as a field so `Total` stays `subtotal - discount` rather than a second
   *  copy of the subtotal. */
  discount: number
  total: number
}

function courseBySlug(slug: string) {
  return browseCourses.find((course) => course.slug === slug)
}

/** The signed-in user's cart, newest first. Empty for signed-out visitors. */
export async function getCart(): Promise<CartSummary> {
  const session = await getSession()
  if (!session) return { lines: [], subtotal: 0, discount: 0, total: 0 }

  const rows = await db.cartItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  const lines = rows.flatMap((row) => {
    const course = courseBySlug(row.courseSlug)
    return course ? [{ id: row.id, course }] : []
  })

  const subtotal = lines.reduce((sum, line) => sum + line.course.price, 0)
  const discount = 0

  return { lines, subtotal, discount, total: subtotal - discount }
}

/** Whether this course is on the signed-in user's wishlist. */
export async function isWishlisted(slug: string) {
  const session = await getSession()
  if (!session) return false
  const row = await db.wishlistItem.findUnique({
    where: { userId_courseSlug: { userId: session.user.id, courseSlug: slug } },
    select: { id: true },
  })
  return row !== null
}
