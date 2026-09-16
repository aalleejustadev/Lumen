"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

export type FollowActionResult = {
  ok: boolean
  message: string
  following: boolean
  followerCount: number
}

/**
 * Follows or unfollows an instructor — the profile header's **Follow**.
 *
 * It takes the **desired state**, not "toggle". The button flips optimistically
 * and a double-click can send two requests; a toggle would then undo itself,
 * where "set following to true" twice is still one follow. `@@unique` on the
 * pair backs that up at the database (`createMany` with `skipDuplicates`), and
 * unfollowing an instructor you do not follow deletes nothing.
 *
 * The instructor is resolved from the slug server-side, and the answer always
 * reports what landed, so the button settles on the truth rather than on what
 * it guessed.
 */
export async function setFollowingInstructor(
  instructorSlug: string,
  follow: boolean
): Promise<FollowActionResult> {
  const session = await getSession()
  if (!session) {
    return {
      ok: false,
      message: "Sign in to follow instructors.",
      following: false,
      followerCount: 0,
    }
  }

  const instructor = await db.instructor.findUnique({
    where: { slug: instructorSlug },
    select: { id: true, name: true, userId: true },
  })
  if (!instructor) {
    return {
      ok: false,
      message: "This instructor can't be followed yet.",
      following: false,
      followerCount: 0,
    }
  }
  if (instructor.userId === session.user.id) {
    return {
      ok: false,
      message: "You can't follow yourself.",
      following: false,
      followerCount: await db.instructorFollow.count({
        where: { instructorId: instructor.id },
      }),
    }
  }

  if (follow) {
    await db.instructorFollow.createMany({
      data: [{ userId: session.user.id, instructorId: instructor.id }],
      skipDuplicates: true,
    })
  } else {
    await db.instructorFollow.deleteMany({
      where: { userId: session.user.id, instructorId: instructor.id },
    })
  }

  const followerCount = await db.instructorFollow.count({
    where: { instructorId: instructor.id },
  })

  revalidatePath(`/dashboard/instructors/${instructorSlug}`)
  return {
    ok: true,
    message: follow
      ? `You're following ${instructor.name}.`
      : `You unfollowed ${instructor.name}.`,
    following: follow,
    followerCount,
  }
}
