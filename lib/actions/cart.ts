"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { browseCourses } from "@/lib/config/browse-courses"

/**
 * Cart mutations. Reads live in `lib/cart.ts`.
 *
 * Every action re-checks the session server-side rather than trusting a user
 * id from the client, and validates the slug against the catalog so a crafted
 * request can't park arbitrary strings in someone's cart. They return a
 * `{ ok, message }` result instead of throwing: the caller turns it straight
 * into a toast, and a failed add shouldn't blow up the page.
 *
 * Both revalidate the dashboard *layout* rather than the two pages that list
 * cart contents. Cart state is no longer only on those pages: the header's
 * badge is counted in `app/(dashboard)/layout.tsx`, and every route under the
 * shell shows it. One layout-scoped call says that and subsumes the two
 * page-scoped ones.
 *
 * What makes the badge move without a reload is a different mechanism, worth
 * not confusing with the above: an action that revalidated *anything* makes
 * Next re-render the current URL's whole tree — layout included — and ship it
 * back with the action's return value (`skipPageRendering` in
 * `next/dist/server/app-render/action-handler.js` keys off whether any
 * revalidation happened, not off which path was named). The path argument is
 * what invalidates the *other* dashboard routes' cache entries.
 */

export type CartActionResult = {
  ok: boolean
  /** Toast copy — the course title is resolved here so the client doesn't
   *  have to pass (and therefore be trusted for) it. */
  message: string
}

function findCourse(slug: string) {
  return browseCourses.find((course) => course.slug === slug)
}

export async function addToCart(slug: string): Promise<CartActionResult> {
  const session = await getSession()
  if (!session)
    return { ok: false, message: "Sign in to add courses to your cart." }

  const course = findCourse(slug)
  if (!course)
    return { ok: false, message: "That course is no longer available." }

  // A course is bought once, so re-adding is a no-op rather than a duplicate
  // row — `@@unique([userId, courseSlug])` backs this up at the database.
  const existing = await db.cartItem.findUnique({
    where: { userId_courseSlug: { userId: session.user.id, courseSlug: slug } },
    select: { id: true },
  })
  if (existing) {
    return { ok: true, message: `${course.title} is already in your cart` }
  }

  await db.cartItem.create({
    data: { userId: session.user.id, courseSlug: slug },
  })

  revalidatePath("/dashboard", "layout")
  return { ok: true, message: `${course.title} was added to your cart` }
}

export async function removeFromCart(slug: string): Promise<CartActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, message: "Sign in to manage your cart." }

  // Scoped by userId as well as slug, so the delete can only ever hit the
  // caller's own row.
  const deleted = await db.cartItem.deleteMany({
    where: { userId: session.user.id, courseSlug: slug },
  })
  if (deleted.count === 0) {
    return { ok: false, message: "That course was not in your cart." }
  }

  revalidatePath("/dashboard", "layout")
  const course = findCourse(slug)
  return {
    ok: true,
    message: course ? `${course.title} was removed` : "Course removed",
  }
}
