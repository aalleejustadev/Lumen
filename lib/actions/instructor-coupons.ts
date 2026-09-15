"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { canTeach, getInstructorProfile } from "@/lib/instructor"
import {
  ACTIVE_COUPONS_PER_COURSE,
  COUPON_CODE_MAX,
  COUPON_CODE_MIN,
} from "@/lib/config/instructor-coupons"
import type { PromotionDiscountType } from "@/lib/generated/prisma/client"

/**
 * The two writes behind `/dashboard/instructor/coupons`. Reads live in
 * `lib/instructor-coupons.ts`.
 *
 * Both **re-resolve the instructor from the session and scope every `where` by
 * it**, never by the id they were handed. Coupon and course ids reach the
 * browser, and an action that trusted one would let any instructor repoint
 * another's discount codes — the check `lib/actions/instructor-payouts.ts`
 * makes inline, for its reason. Both also re-check `canTeach`, the same
 * function `app/(instructor)/layout.tsx` guards the shell with, so the two
 * cannot disagree; a Server Action is a public endpoint and the layout's guard
 * covers the page, not this.
 *
 * They return `{ ok, message }` for the caller to toast rather than throwing,
 * the shape `lib/actions/cart.ts` set.
 */

export type CouponActionResult = {
  ok: boolean
  message: string
  /** Set on success, so the board can settle on the row that actually landed. */
  couponId?: string
}

export type CouponInput = {
  code: string
  courseId: string
  discountType: PromotionDiscountType
  /** Percent when PERCENT; ignored otherwise. */
  percentOff: number
  /** Cents when FIXED_PRICE; ignored otherwise. */
  priceCents: number
  redemptionLimit: number | null
  startsAt: string | null
  endsAt: string | null
}

/**
 * Turns the dialog's two shapes into the pair of columns the table draws.
 *
 * **Both are always written**, whichever card was chosen: the table shows
 * "40% off" *and* "$59.99" on the same row, and `Coupon.resultingPriceCents`
 * exists precisely so the second survives a later change to the list price.
 * `discountType` records which of the two the instructor actually typed, so
 * the Edit dialog re-opens on the right card.
 */
function resolveDiscount(
  input: CouponInput,
  listPriceCents: number
): { percentOff: number; resultingPriceCents: number } | null {
  if (input.discountType === "FIXED_PRICE") {
    const price = Math.round(input.priceCents)
    if (!Number.isFinite(price) || price < 0 || price >= listPriceCents) {
      return null
    }
    return {
      // Rounded to whole percent, which is all the table ever draws.
      percentOff: Math.round(((listPriceCents - price) / listPriceCents) * 100),
      resultingPriceCents: price,
    }
  }

  const percent = Math.round(input.percentOff)
  if (!Number.isFinite(percent) || percent < 1 || percent > 100) return null
  return {
    percentOff: percent,
    resultingPriceCents: Math.round((listPriceCents * (100 - percent)) / 100),
  }
}

function normaliseCode(code: string) {
  // Stored upper-case because the dialog promises the code is
  // case-insensitive; `Coupon.code` is unique, so one spelling has to win and
  // the table draws them upper-case.
  return code.trim().toUpperCase().replace(/\s+/g, "")
}

function parseDate(value: string | null): Date | null | undefined {
  if (value === null || value.trim() === "") return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

/**
 * Everything the two writes check in common: who is asking, whether they may
 * teach, whether the course is theirs, and whether the form makes sense.
 */
type Validated = {
  profileId: string
  courseId: string
  code: string
  limit: number | null
  startsAt: Date | null
  endsAt: Date | null
  percentOff: number
  resultingPriceCents: number
}

type ValidationResult =
  { ok: false; message: string } | { ok: true; value: Validated }

const invalid = (message: string): ValidationResult => ({ ok: false, message })

async function validate(
  input: CouponInput,
  couponId: string | null
): Promise<ValidationResult> {
  const session = await getSession()
  if (!session) return invalid("Sign in to manage coupons.")
  if (!(await canTeach(session.user))) {
    return invalid("Only instructors can manage coupons.")
  }

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return invalid("Only instructors can manage coupons.")

  const code = normaliseCode(input.code)
  if (code.length < COUPON_CODE_MIN || code.length > COUPON_CODE_MAX) {
    return invalid(
      `Use a code between ${COUPON_CODE_MIN} and ${COUPON_CODE_MAX} characters.`
    )
  }
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return invalid("Codes can use letters, numbers, hyphens and underscores.")
  }

  // Scoped by `instructorId`, so a course belonging to somebody else simply
  // does not resolve — the guard, not a check on a value from the client.
  const course = await db.course.findFirst({
    where: { id: input.courseId, instructorId: profile.id },
    select: { id: true, listPriceCents: true },
  })
  if (!course) return invalid("Choose one of your own courses.")

  const discount = resolveDiscount(input, course.listPriceCents)
  if (!discount) {
    return invalid(
      input.discountType === "FIXED_PRICE"
        ? "Enter a price below the course's list price."
        : "Enter a percentage between 1 and 100."
    )
  }

  const startsAt = parseDate(input.startsAt)
  const endsAt = parseDate(input.endsAt)
  if (startsAt === undefined || endsAt === undefined) {
    return invalid("That date isn't valid.")
  }
  if (startsAt && endsAt && endsAt <= startsAt) {
    return invalid("The end date has to come after the start date.")
  }

  const limit =
    input.redemptionLimit === null ? null : Math.round(input.redemptionLimit)
  if (limit !== null && (!Number.isFinite(limit) || limit < 1)) {
    return invalid("A redemption limit has to be at least 1.")
  }

  const taken = await db.coupon.findFirst({
    where: { code, ...(couponId ? { NOT: { id: couponId } } : {}) },
    select: { id: true },
  })
  if (taken) return invalid(`${code} is already taken.`)

  return {
    ok: true,
    value: {
      profileId: profile.id,
      courseId: course.id,
      code,
      limit,
      startsAt,
      endsAt,
      ...discount,
    },
  }
}

/**
 * **The three-active-coupons rule the dialog states out loud**, enforced where
 * it can actually hold.
 *
 * It counts by the clock, the same way `getCouponsPage` derives the pill, so
 * the number an instructor is refused on is the number the Active tab shows.
 * An expired or scheduled code does not count — only what is running.
 */
async function activeCountFor(
  courseId: string,
  now: Date,
  excludeId: string | null
) {
  return db.coupon.count({
    where: {
      courseId,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  })
}

function wouldBeActive(startsAt: Date | null, endsAt: Date | null, now: Date) {
  if (startsAt && startsAt > now) return false
  if (endsAt && endsAt < now) return false
  return true
}

export async function createCoupon(
  input: CouponInput
): Promise<CouponActionResult> {
  const result = await validate(input, null)
  if (!result.ok) return { ok: false, message: result.message }
  const checked = result.value

  const now = new Date()
  if (wouldBeActive(checked.startsAt, checked.endsAt, now)) {
    const running = await activeCountFor(checked.courseId, now, null)
    if (running >= ACTIVE_COUPONS_PER_COURSE) {
      return {
        ok: false,
        message: `That course already has ${ACTIVE_COUPONS_PER_COURSE} active coupons. End one first, or schedule this to start later.`,
      }
    }
  }

  const coupon = await db.coupon.create({
    data: {
      code: checked.code,
      courseId: checked.courseId,
      instructorId: checked.profileId,
      discountType: input.discountType,
      percentOff: checked.percentOff,
      resultingPriceCents: checked.resultingPriceCents,
      redemptionLimit: checked.limit,
      ...(checked.startsAt ? { startsAt: checked.startsAt } : {}),
      endsAt: checked.endsAt,
    },
    select: { id: true },
  })

  revalidatePath("/dashboard/instructor/coupons")
  return { ok: true, message: `${checked.code} created.`, couponId: coupon.id }
}

export async function updateCoupon(
  couponId: string,
  input: CouponInput
): Promise<CouponActionResult> {
  const result = await validate(input, couponId)
  if (!result.ok) return { ok: false, message: result.message }
  const checked = result.value

  // Scoped by the instructor as well as the id, for the reason the module note
  // gives — never by id alone.
  const existing = await db.coupon.findFirst({
    where: { id: couponId, instructorId: checked.profileId },
    select: { id: true },
  })
  if (!existing) return { ok: false, message: "That coupon isn't available." }

  const now = new Date()
  if (wouldBeActive(checked.startsAt, checked.endsAt, now)) {
    const running = await activeCountFor(checked.courseId, now, couponId)
    if (running >= ACTIVE_COUPONS_PER_COURSE) {
      return {
        ok: false,
        message: `That course already has ${ACTIVE_COUPONS_PER_COURSE} active coupons. End one first, or schedule this to start later.`,
      }
    }
  }

  await db.coupon.update({
    where: { id: couponId },
    data: {
      code: checked.code,
      courseId: checked.courseId,
      discountType: input.discountType,
      percentOff: checked.percentOff,
      resultingPriceCents: checked.resultingPriceCents,
      redemptionLimit: checked.limit,
      ...(checked.startsAt ? { startsAt: checked.startsAt } : {}),
      endsAt: checked.endsAt,
    },
  })

  revalidatePath("/dashboard/instructor/coupons")
  return { ok: true, message: `${checked.code} saved.`, couponId }
}
