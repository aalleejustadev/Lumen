"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  isPromotionDiscountType,
  isPromotionScope,
  MAX_FIXED_PRICE_CENTS,
  MAX_PERCENT_OFF,
  MAX_PROMOTION_DAYS,
  MIN_FIXED_PRICE_CENTS,
  MIN_PERCENT_OFF,
  PROMOTION_NAME_MAX_LENGTH,
} from "@/lib/config/admin-promotions"
import type {
  PromotionDiscountType,
  PromotionScope,
} from "@/lib/generated/prisma/client"

/**
 * The writes behind `/dashboard/admin/promotions`. Reads live in
 * `lib/admin/promotions.ts`.
 *
 * **Every one re-checks the admin role.** A Server Action is a public
 * endpoint: the console's layout guard covers the page, not the function, and
 * these set the price every course in the catalog sells at. They return
 * `{ ok, message }` for the caller to toast rather than throwing, the shape
 * `lib/actions/cart.ts` established.
 *
 * Nothing here trusts what it is handed: the discount type and scope are
 * checked against their enums, the amount against the limits its type has, the
 * dates against each other and the clock, and every category id is re-read
 * from the database before it is written.
 *
 * All four log under **BILLING**. A promotion is a price change — the one act
 * in this console that moves what a customer is charged — so it belongs on the
 * audit tab somebody opens to answer "why did we take $9.99 for that course in
 * April". That includes the participation switch: it decides whether an
 * instructor's list prices get overridden, which is the same question about a
 * smaller set of courses. (The categories page reaches the opposite conclusion
 * for its own writes and logs under COURSES; a category is taxonomy, not
 * money.)
 */

export type AdminPromotionsResult = { ok: boolean; message: string }

const DENIED: AdminPromotionsResult = {
  ok: false,
  message: "You do not have access to the promotions console.",
}

const GONE: AdminPromotionsResult = {
  ok: false,
  message: "That promotion no longer exists — reload the page.",
}

const ENDED: AdminPromotionsResult = {
  ok: false,
  message: "That promotion has already ended — reload the page.",
}

async function requireAdmin() {
  const session = await getSession()
  if (session?.user.role !== "admin") return null
  return session
}

/**
 * The console **layout**, not this page: the participation list pages through
 * the URL, so each page of it is a different entry to invalidate, and a
 * promotion's own card is read by the page underneath either way. Same
 * mechanism `lib/actions/admin-community.ts` documents.
 */
function revalidateConsole() {
  revalidatePath("/dashboard/admin", "layout")
}

async function log(
  session: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>,
  action: string,
  targetType: string,
  targetId: string,
  targetLabel: string
) {
  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role ?? null,
      action,
      targetType,
      targetId,
      targetLabel,
      category: "BILLING",
    },
  })
}

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

export type PromotionInput = {
  name: string
  discountType: string
  /** Percent when PERCENT, **cents** when FIXED_PRICE — see `Promotion.value`. */
  value: number
  scope: string
  categoryIds: string[]
  /** `yyyy-MM-dd`, or null for "Immediately". */
  startsOn: string | null
  /** `yyyy-MM-dd`. */
  endsOn: string
  forceOnAllCourses: boolean
}

/**
 * A calendar day from the dialog to an instant.
 *
 * The two date fields pick a **day**, not a moment, so they cross the boundary
 * as `yyyy-MM-dd` and are anchored here — the arrangement `lib/account.ts`
 * records for `dateOfBirth`, and for its reason: a `Date` built from a bare
 * date string is parsed as UTC while one built from parts is local, so letting
 * either side guess slides a sale by a day. A start is the beginning of its
 * day and an end is the **end** of its day, because "Ends 31 Aug" means the
 * 31st is still on sale.
 */
function dayStart(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "")
  if (!match) return null
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  )
  return Number.isNaN(date.getTime()) ? null : date
}

function dayEnd(value: string): Date | null {
  const start = dayStart(value)
  if (!start) return null
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
}

type CleanPromotion = {
  name: string
  discountType: PromotionDiscountType
  value: number
  scope: PromotionScope
  categoryIds: string[]
  startsAt: Date
  endsAt: Date
  forceOnAllCourses: boolean
}

/**
 * Validates and normalises the dialog's payload, or returns the sentence to
 * toast. Nothing downstream re-checks, so everything a row needs is settled
 * here — including that the categories exist, which is the one check that has
 * to reach the database.
 */
async function clean(
  input: PromotionInput,
  now: Date
): Promise<CleanPromotion | { error: string }> {
  const name = (input?.name ?? "").trim().slice(0, PROMOTION_NAME_MAX_LENGTH)
  if (name.length === 0) return { error: "Give the promotion a name." }

  if (!isPromotionDiscountType(input?.discountType)) {
    return { error: "Pick a discount type." }
  }
  const discountType = input.discountType

  const value = Math.round(Number(input?.value))
  if (!Number.isFinite(value)) return { error: "Enter a discount." }
  if (discountType === "PERCENT") {
    if (value < MIN_PERCENT_OFF || value > MAX_PERCENT_OFF) {
      return {
        error: `A percentage off has to be between ${MIN_PERCENT_OFF} and ${MAX_PERCENT_OFF}.`,
      }
    }
  } else if (value < MIN_FIXED_PRICE_CENTS || value > MAX_FIXED_PRICE_CENTS) {
    return {
      error: `A flat sale price has to be between $${(
        MIN_FIXED_PRICE_CENTS / 100
      ).toFixed(2)} and $${(MAX_FIXED_PRICE_CENTS / 100).toFixed(2)}.`,
    }
  }

  if (!isPromotionScope(input?.scope))
    return { error: "Pick what it applies to." }
  const scope = input.scope

  let categoryIds: string[] = []
  if (scope === "CATEGORIES") {
    const wanted = [
      ...new Set(
        (Array.isArray(input?.categoryIds) ? input.categoryIds : []).filter(
          (id): id is string => typeof id === "string" && id.length > 0
        )
      ),
    ]
    // Re-read rather than trusted: these ids came from the browser, and a
    // hand-edited one would otherwise scope a sale to a category that is not
    // one — or to a row somebody deleted while the dialog was open.
    const real = await db.category.findMany({
      where: { id: { in: wanted } },
      select: { id: true },
    })
    categoryIds = real.map((row) => row.id)
    if (categoryIds.length === 0) {
      return { error: "Pick at least one category." }
    }
  }

  // "Immediately" is the export's own placeholder, so an empty Starts is not a
  // missing value — it means now.
  const startsAt = input?.startsOn ? dayStart(input.startsOn) : now
  if (!startsAt) return { error: "That start date isn't a date." }

  const endsAt = dayEnd(input?.endsOn ?? "")
  if (!endsAt) return { error: "Pick the day the sale ends." }
  if (endsAt <= startsAt) {
    return { error: "The sale has to end after it starts." }
  }
  if (endsAt <= now) return { error: "Pick an end date in the future." }
  const days = (endsAt.getTime() - startsAt.getTime()) / 86_400_000
  if (days > MAX_PROMOTION_DAYS) {
    return {
      error: `A promotion can run for at most ${MAX_PROMOTION_DAYS} days.`,
    }
  }

  return {
    name,
    discountType,
    value,
    scope,
    categoryIds,
    startsAt,
    endsAt,
    forceOnAllCourses: input?.forceOnAllCourses === true,
  }
}

export async function createPromotion(
  input: PromotionInput
): Promise<AdminPromotionsResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  const now = new Date()
  const values = await clean(input, now)
  if ("error" in values) return { ok: false, message: values.error }

  const promotion = await db.promotion.create({
    data: {
      name: values.name,
      discountType: values.discountType,
      value: values.value,
      scope: values.scope,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      forceOnAllCourses: values.forceOnAllCourses,
      categories: { connect: values.categoryIds.map((id) => ({ id })) },
    },
    select: { id: true, name: true, startsAt: true },
  })

  await log(
    session,
    "Launched platform promotion",
    "promotion",
    promotion.id,
    promotion.name
  )
  revalidateConsole()
  return {
    ok: true,
    message:
      promotion.startsAt <= now
        ? `${promotion.name} is live`
        : `${promotion.name} is scheduled`,
  }
}

/**
 * Edit, refused once the sale has ended.
 *
 * A finished promotion is **history**: the numbers beside it in the table are
 * what it earned at the terms it ran on, and re-pointing those at a different
 * discount would make the row a lie. It is the same reasoning
 * `admin-courses.ts` gives for refusing a decision on anything not currently
 * IN_REVIEW, and for the same practical reason — two admins on one queue is
 * the ordinary case, and a stale tab must not overwrite what one of them did.
 */
export async function updatePromotion(
  promotionId: string,
  input: PromotionInput
): Promise<AdminPromotionsResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  const existing = await db.promotion.findUnique({
    where: { id: promotionId },
    select: { id: true, endsAt: true },
  })
  if (!existing) return GONE

  const now = new Date()
  if (existing.endsAt <= now) return ENDED

  const values = await clean(input, now)
  if ("error" in values) return { ok: false, message: values.error }

  const promotion = await db.promotion.update({
    where: { id: existing.id },
    data: {
      name: values.name,
      discountType: values.discountType,
      value: values.value,
      scope: values.scope,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      forceOnAllCourses: values.forceOnAllCourses,
      // `set` rather than `connect`: this is the whole intended list, so a
      // category the admin unticked has to come off the row.
      categories: { set: values.categoryIds.map((id) => ({ id })) },
    },
    select: { id: true, name: true },
  })

  await log(
    session,
    "Updated platform promotion",
    "promotion",
    promotion.id,
    promotion.name
  )
  revalidateConsole()
  return { ok: true, message: `${promotion.name} was updated` }
}

/**
 * "End sale" — a write to `endsAt`, not a status flip, because a promotion's
 * state *is* its dates (see `lib/admin/promotions.ts`).
 *
 * `startsAt` is pulled back with it when the sale had not begun. Without that,
 * cancelling a scheduled sale would leave a row whose window still opens in
 * the future, and it would reappear as a live promotion on the day it was
 * meant to start — the opposite of what the button says. The row is kept
 * either way rather than deleted, which is what `Promotion`'s own note asks
 * for ("Past promotions stay as rows so the history table has something to
 * read").
 */
export async function endPromotion(
  promotionId: string
): Promise<AdminPromotionsResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  const promotion = await db.promotion.findUnique({
    where: { id: promotionId },
    select: { id: true, name: true, startsAt: true, endsAt: true },
  })
  if (!promotion) return GONE

  const now = new Date()
  if (promotion.endsAt <= now) return ENDED
  const started = promotion.startsAt <= now

  await db.promotion.update({
    where: { id: promotion.id },
    data: {
      endsAt: now,
      ...(started ? {} : { startsAt: now }),
    },
  })

  await log(
    session,
    started ? "Ended platform promotion" : "Cancelled platform promotion",
    "promotion",
    promotion.id,
    promotion.name
  )
  revalidateConsole()
  return {
    ok: true,
    message: started
      ? `${promotion.name} has ended`
      : `${promotion.name} was cancelled`,
  }
}

// ---------------------------------------------------------------------------
// Instructor participation
// ---------------------------------------------------------------------------

/**
 * One row's switch.
 *
 * It writes the instructor's **standing preference**, which is what
 * `Course.promotionOptIn`'s null inherits from — so it moves every course of
 * theirs that has not been decided individually, and leaves the ones that have
 * alone. That is the whole point of the column being nullable, and it is why
 * the two course tiles on a promotion card can move by more than one when a
 * single switch is flipped.
 */
export async function setInstructorPromotionOptIn(
  instructorId: string,
  participating: boolean
): Promise<AdminPromotionsResult> {
  const session = await requireAdmin()
  if (!session) return DENIED

  const instructor = await db.instructor.findUnique({
    where: { id: instructorId },
    select: { id: true, name: true, promotionOptIn: true },
  })
  if (!instructor) {
    return {
      ok: false,
      message: "That instructor no longer exists — reload the page.",
    }
  }

  const next = participating === true
  if (instructor.promotionOptIn === next) {
    // Not an error: two tabs, or a double click. Saying so beats writing a
    // row and an audit entry that record no change.
    return {
      ok: true,
      message: next
        ? `${instructor.name} is already participating`
        : `${instructor.name} is already opted out`,
    }
  }

  await db.instructor.update({
    where: { id: instructor.id },
    data: { promotionOptIn: next },
  })

  await log(
    session,
    next
      ? "Opted an instructor into promotions"
      : "Opted an instructor out of promotions",
    "instructor",
    instructor.id,
    instructor.name
  )
  revalidateConsole()
  return {
    ok: true,
    message: next
      ? `${instructor.name} now joins Lumen promotions`
      : `${instructor.name} is opted out of Lumen promotions`,
  }
}
