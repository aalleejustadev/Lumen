import type { WishlistLine } from "@/lib/cart"
import type { BrowseCourse } from "@/lib/config/browse-courses"

/**
 * A saved course as it crosses from the page (a Server Component) into
 * `wishlist-page.tsx` (a Client Component).
 *
 * `BrowseCourse.icon` is a `LucideIcon` — a function value, which can't cross
 * that boundary — so it's stripped here and looked back up from `category`
 * via `categoryIcons` on the other side. Same arrangement
 * `instructor-profile-page.tsx` uses for `InstructorCourseCard`.
 */
export type WishlistCourse = Omit<BrowseCourse, "icon">

export type WishlistEntry = {
  id: string
  course: WishlistCourse
}

export function toWishlistEntries(lines: WishlistLine[]): WishlistEntry[] {
  return lines.map(({ id, course }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to drop it
    const { icon, ...rest } = course
    return { id, course: rest }
  })
}
