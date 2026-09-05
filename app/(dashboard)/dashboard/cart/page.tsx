import type { Metadata } from "next"

import { CartPage } from "@/components/dashboard/cart/cart-page"
import { getCart } from "@/lib/cart"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Your Cart · ${siteConfig.name}`,
}

/**
 * `/dashboard/cart`, built against
 * `ui-design/light/dashboard/student/cart-page.png`. Unlike the catalog and
 * sale pages this one reads the database directly — `cart_item` rows are real
 * (see `lib/cart.ts`); only the course each row points at still resolves
 * through `lib/config/browse-courses.ts`.
 */
export default async function Page() {
  const summary = await getCart()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <CartPage summary={summary} />
    </main>
  )
}
