import type { Metadata } from "next"

import { WishlistPage } from "@/components/dashboard/wishlist/wishlist-page"
import { toWishlistEntries } from "@/components/dashboard/wishlist/wishlist-course"
import { getWishlist } from "@/lib/cart"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Wishlist · ${siteConfig.name}`,
}

/**
 * `/dashboard/wishlist`, built against
 * `ui-design/light/dashboard/student/wishlist-page.png`. Like the cart, this
 * page reads the database directly — `wishlist_item` rows are real (see
 * `lib/cart.ts`); only the course each row points at still resolves through
 * `lib/config/browse-courses.ts`.
 *
 * `toWishlistEntries` strips `BrowseCourse.icon` before the rows cross into
 * the client component below — a function value can't make that trip.
 */
export default async function Page() {
  const { lines, total } = await getWishlist()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <WishlistPage entries={toWishlistEntries(lines)} total={total} />
    </main>
  )
}
