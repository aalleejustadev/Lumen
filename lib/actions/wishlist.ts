"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { browseCourses } from "@/lib/config/browse-courses"

/**
 * Wishlist mutations — same shape and same server-side session/slug checks as
 * `lib/actions/cart.ts`. Reads live in `lib/cart.ts`.
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

  revalidatePath(`/dashboard/courses/${slug}`)
  return {
    ok: true,
    wishlisted: !existing,
    message: existing
      ? `${course.title} was removed from your wishlist`
      : `${course.title} was saved to your wishlist`,
  }
}
