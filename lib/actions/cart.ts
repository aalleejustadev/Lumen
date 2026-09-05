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

  revalidatePath("/dashboard/cart")
  revalidatePath(`/dashboard/courses/${slug}`)
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

  revalidatePath("/dashboard/cart")
  revalidatePath(`/dashboard/courses/${slug}`)
  const course = findCourse(slug)
  return {
    ok: true,
    message: course ? `${course.title} was removed` : "Course removed",
  }
}
