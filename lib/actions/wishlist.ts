"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { browseCourses } from "@/lib/config/browse-courses"

/**
 * Wishlist mutations — same shape and same server-side session/slug checks as
 * `lib/actions/cart.ts`. Reads live in `lib/cart.ts`.
 *
 * Both revalidate the dashboard *layout* rather than the course page they
 * were pressed on, for the reason `lib/actions/cart.ts` spells out: the count
 * beside the sidebar's Wishlist row is chrome rendered by
 * `app/(dashboard)/layout.tsx`, so every route under the shell shows it, and
 * `/dashboard/wishlist` itself has to pick the change up too.
 */

export type WishlistActionResult = {
  ok: boolean
  message: string
  /** The state the course ended up in, so the button can settle on the real
   *  answer rather than assuming its optimistic guess was right. */
  wishlisted: boolean
}

export async function toggleWishlist(
  slug: string
): Promise<WishlistActionResult> {
  const session = await getSession()
  if (!session) {
    return {
      ok: false,
      message: "Sign in to save courses to your wishlist.",
      wishlisted: false,
    }
  }

  const course = browseCourses.find((candidate) => candidate.slug === slug)
  if (!course) {
    return {
      ok: false,
      message: "That course is no longer available.",
      wishlisted: false,
    }
  }

  const where = {
    userId_courseSlug: { userId: session.user.id, courseSlug: slug },
  }
  const existing = await db.wishlistItem.findUnique({
    where,
    select: { id: true },
  })

  if (existing) {
    await db.wishlistItem.delete({ where })
  } else {
    await db.wishlistItem.create({
      data: { userId: session.user.id, courseSlug: slug },
    })
  }

  revalidatePath("/dashboard", "layout")
  return {
    ok: true,
    wishlisted: !existing,
    message: existing
      ? `${course.title} was removed from your wishlist`
      : `${course.title} was saved to your wishlist`,
  }
}

/**
 * Drop one course from the wishlist — the heart on a `/dashboard/wishlist`
 * row, which is only ever a removal (everything on that page is already
 * saved). `toggleWishlist` would do the same thing, but it answers "what
 * state did this end up in?", which a row that is about to disappear has no
 * use for.
 */
export async function removeFromWishlist(
  slug: string
): Promise<WishlistActionResult> {
  const session = await getSession()
  if (!session) {
    return {
      ok: false,
      message: "Sign in to manage your wishlist.",
      wishlisted: false,
    }
  }

  // Scoped by userId as well as slug, so the delete can only ever hit the
  // caller's own row.
  const deleted = await db.wishlistItem.deleteMany({
    where: { userId: session.user.id, courseSlug: slug },
  })
  if (deleted.count === 0) {
    return {
      ok: false,
      message: "That course was not on your wishlist.",
      wishlisted: false,
    }
  }

  revalidatePath("/dashboard", "layout")
  const course = browseCourses.find((candidate) => candidate.slug === slug)
  return {
    ok: true,
    wishlisted: false,
    message: course
      ? `${course.title} was removed from your wishlist`
      : "Course removed from your wishlist",
  }
}
