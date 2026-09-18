/**
 * The catalog row's shape, kept apart from the reads that build it.
 *
 * `lib/catalog.ts` is `server-only` — it pulls in `lib/db` — and the catalog
 * card and its filter bar are client components. A client module importing the
 * *type* from a server module is fine (types are erased), but importing
 * anything else from it drags the Postgres driver into the browser bundle, the
 * trap `lib/admin/users.ts` records about `USERS_PAGE_SIZE`. So the shape
 * lives here, where both sides can reach it freely, and the reads live there.
 *
 * **It carries a `categorySlug`, not an icon.** A glyph is a function and a
 * function cannot cross the server→client boundary; the card looks the icon up
 * from the slug, the arrangement `ProfileCourse` already uses.
 */
export type CatalogCourse = {
  id: string
  slug: string
  title: string
  instructor: string
  instructorSlug: string
  /** The `Instructor` row's id — snapshotted onto an `OrderItem` so a sale can
   *  become an `InstructorEarning`. */
  instructorId: string
  categoryName: string
  categorySlug: string
  /** Tailwind gradient stops, resolved from `Category.accentColor`. */
  art: string
  /** An instructor-uploaded cover, drawn over the gradient when set. */
  thumbnailUrl: string | null
  level: string
  durationHours: number
  rating: number
  reviews: number
  students: number
  /** Dollars — the card draws "$13.99" and the filters compare against it. */
  price: number
  listPrice: number
  /** `publishedAt` as an ordinal, so "Newest" sorts without re-parsing. */
  publishedAtMs: number
}
