import type { WishlistLine } from "@/lib/cart"
import type { CatalogCourse } from "@/lib/config/catalog-shape"

/**
 * A saved course as it crosses from the page (a Server Component) into
 * `wishlist-page.tsx` (a Client Component).
 *
 * **The stripping this module used to do is gone.** `BrowseCourse` carried an
 * `icon`, a `LucideIcon` — a function value, which cannot cross that boundary
 * — so it had to be destructured away here and looked back up on the other
 * side. `CatalogCourse` never carries one: it holds a `categorySlug` and every
 * consumer resolves the glyph itself, so the row is serializable by
 * construction. The alias and the mapper stay because a dozen call sites name
 * them, and because the boundary is still worth naming.
 */
export type WishlistCourse = CatalogCourse

export type WishlistEntry = {
  id: string
  course: WishlistCourse
}

export function toWishlistEntries(lines: WishlistLine[]): WishlistEntry[] {
  return lines.map(({ id, course }) => ({ id, course }))
}
