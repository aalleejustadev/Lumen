"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  MAX_PAYOUT_METHODS,
  PAYOUT_LABEL_MAX_LENGTH,
  PAYOUT_LAST4_LENGTH,
  payoutMethodTypeValues,
  type PayoutMethodTypeValue,
} from "@/lib/config/instructor-payouts"
import { platformCurrencyValues } from "@/lib/config/admin-settings"

/**
 * Writes for `/dashboard/instructor/settings/payouts`. Reads are in
 * `lib/instructor-payouts.ts`.
 *
 * Same shape as every other action module here: re-check the session, resolve
 * the caller's *own* `Instructor` row server-side, validate, and return
 * `{ ok, message }` for the caller to toast instead of throwing.
 *
 * Two things about that are load-bearing on this page in particular, because
 * it is the one that decides where money goes:
 *
 *  - **Every write resolves the instructor from the session**, never from
 *    anything the client sent. There is no `instructorId` parameter to be
 *    tampered with.
 *  - **Every write that names a method scopes the query by that instructor
 *    id** (`where: { id, instructorId }`), not by id alone. Method ids reach
 *    the browser, and an action that trusted the one it was handed would let
 *    any signed-in instructor repoint or delete another's bank account. This
 *    is the same check `ownsPaymentMethod` makes on the billing page, done
 *    inline because the ownership here is a plain foreign key.
 *
 * **Nothing here talks to a payment processor.** Lumen has Stripe for
 * *checkout* but no Connect account, so `PayoutMethod.externalRef` — "the
 * processor's own id for the destination" — stays null and a new method is
 * unverified. What is stored is exactly what the row renders: an institution
 * or address, a last-4, a currency. That is also why the dialog asks for the
 * last four digits rather than a full account number, which the schema's own
 * note forbids storing. Wire `externalRef` and `verifiedAt` to Connect's
 * external-account flow when it lands; nothing above them has to change.
 */

export type PayoutMethodFieldErrors = {
  label?: string
  last4?: string
  currency?: string
}

export type PayoutActionResult = {
  ok: boolean
  message: string
  errors?: PayoutMethodFieldErrors
}

export type PayoutMethodInput = {
  type: PayoutMethodTypeValue
  label: string
  last4: string
  currency: string
  primary: boolean
}

/** Good enough for a stored contact address: the real test is whether mail to
 *  it is answered, which no regular expression can tell us. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const DIGITS_ONLY = /^\d+$/

/**
 * The caller's own teaching profile, or null. Every export below starts here,
 * so none of them can act on another instructor's rows.
 */
async function currentInstructor() {
  const session = await getSession()
  if (!session) return null

  return db.instructor.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
}

function validate(input: PayoutMethodInput): PayoutMethodFieldErrors {
  const errors: PayoutMethodFieldErrors = {}
  const label = input.label.trim()

  if (label.length === 0) {
    errors.label =
      input.type === "PAYPAL"
        ? "Enter your PayPal email."
        : "Enter your bank's name."
  } else if (label.length > PAYOUT_LABEL_MAX_LENGTH) {
    errors.label = `Keep it under ${PAYOUT_LABEL_MAX_LENGTH} characters.`
  } else if (input.type === "PAYPAL" && !EMAIL_PATTERN.test(label)) {
    errors.label = "Enter a valid email address."
  }

  // A last-4 belongs to a bank account; the PayPal row renders the address
  // instead, so the field is not shown and not stored for that type.
  if (input.type === "BANK_TRANSFER") {
    const last4 = input.last4.trim()
    if (last4.length !== PAYOUT_LAST4_LENGTH || !DIGITS_ONLY.test(last4)) {
      errors.last4 = `Enter the last ${PAYOUT_LAST4_LENGTH} digits of the account.`
    }
    if (!platformCurrencyValues.has(input.currency)) {
      errors.currency = "Choose a currency."
    }
  }

  return errors
}

/** Exactly one method is PRIMARY. Promoting one demotes the rest, in the same
 *  transaction as the write that promoted it, so the list can never be read
 *  with two primaries or none. */
async function makePrimary(instructorId: string, methodId: string) {
  await db.$transaction([
    db.payoutMethod.updateMany({
      where: { instructorId, NOT: { id: methodId } },
      data: { role: "BACKUP" },
    }),
    db.payoutMethod.updateMany({
      where: { id: methodId, instructorId },
      data: { role: "PRIMARY" },
    }),
  ])
}

/**
 * Add a destination, or edit one. One action with two branches rather than
 * two, for the reason `admin-courses.ts`' `decide()` gives about its three:
 * the validation and the primary-role bookkeeping are identical, and two
 * copies would be two places for them to drift.
 *
 * `methodId` absent means create. A blank list gets its first method promoted
 * to PRIMARY whatever the switch said — there is nothing for a lone method to
 * be a fallback *to*.
 */
export async function savePayoutMethod(
  input: PayoutMethodInput,
  methodId?: string
): Promise<PayoutActionResult> {
  const instructor = await currentInstructor()
  if (!instructor) {
    return { ok: false, message: "Only instructors can set up payouts." }
  }

  if (!payoutMethodTypeValues.has(input.type)) {
    return { ok: false, message: "Choose a payout method type." }
  }

  const errors = validate(input)
  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      errors,
    }
  }

  const label = input.label.trim()
  const isBank = input.type === "BANK_TRANSFER"
  const data = {
    type: input.type,
    label,
    last4: isBank ? input.last4.trim() : null,
    // A PayPal balance is held in the account's own currency, which we are
    // not told; the platform's default is the honest stand-in until Connect
    // reports one.
    currency: isBank ? input.currency : "usd",
  }

  const existing = await db.payoutMethod.count({
    where: { instructorId: instructor.id },
  })

  let savedId: string

  if (methodId) {
    // Scoped by instructor, not by id alone — see the module note.
    const updated = await db.payoutMethod.updateMany({
      where: { id: methodId, instructorId: instructor.id },
      data,
    })
    if (updated.count === 0) {
      return { ok: false, message: "We couldn't find that payout method." }
    }
    savedId = methodId
  } else {
    if (existing >= MAX_PAYOUT_METHODS) {
      return {
        ok: false,
        message: `You can keep up to ${MAX_PAYOUT_METHODS} payout methods.`,
      }
    }
    const created = await db.payoutMethod.create({
      data: {
        ...data,
        instructorId: instructor.id,
        // The first one has to be primary; after that the switch decides.
        role: existing === 0 || input.primary ? "PRIMARY" : "BACKUP",
      },
      select: { id: true },
    })
    savedId = created.id
  }

  if (input.primary || existing === 0) {
    await makePrimary(instructor.id, savedId)
  }

  revalidatePath("/dashboard/instructor/settings/payouts")
  return {
    ok: true,
    message: methodId ? "Payout method updated." : "Payout method added.",
  }
}

/**
 * Remove a destination.
 *
 * **Removing the primary promotes the next one** rather than leaving the
 * account with methods but no primary — a state the money has no way to read.
 * Removing the last one is allowed: an instructor who wants no destination on
 * file is entitled to that, and the empty state says plainly what it costs.
 */
export async function removePayoutMethod(
  methodId: string
): Promise<PayoutActionResult> {
  const instructor = await currentInstructor()
  if (!instructor) {
    return { ok: false, message: "Only instructors can set up payouts." }
  }

  const deleted = await db.payoutMethod.deleteMany({
    where: { id: methodId, instructorId: instructor.id },
  })
  if (deleted.count === 0) {
    return { ok: false, message: "We couldn't find that payout method." }
  }

  const survivors = await db.payoutMethod.findMany({
    where: { instructorId: instructor.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true },
  })
  if (survivors.length > 0 && !survivors.some((m) => m.role === "PRIMARY")) {
    await makePrimary(instructor.id, survivors[0]!.id)
  }

  revalidatePath("/dashboard/instructor/settings/payouts")
  return { ok: true, message: "Payout method removed." }
}

/**
 * The one thing the export's **Save payout settings** button writes.
 *
 * It is a single switch, which looks like an argument for saving it on change
 * the way `platform-controls-form.tsx` does — but that page draws no submit
 * and says "Changes save automatically", and this one draws a submit. The
 * export is explicit, so the button is real.
 *
 * The methods above it do apply immediately, through their dialog. That
 * divergence is the profile page's already: the avatar applies on pick while
 * the fields wait for submit, "which is also what stops an image from being
 * uploaded and then lost when the user navigates away without saving". A bank
 * account typed into a dialog and lost to a stray click would be the same
 * mistake with worse consequences.
 */
export async function updatePayoutPreferences(
  emailPayoutReceipt: boolean
): Promise<PayoutActionResult> {
  const instructor = await currentInstructor()
  if (!instructor) {
    return { ok: false, message: "Only instructors can set up payouts." }
  }

  await db.instructor.update({
    where: { id: instructor.id },
    data: { emailPayoutReceipt: Boolean(emailPayoutReceipt) },
  })

  revalidatePath("/dashboard/instructor/settings/payouts")
  return { ok: true, message: "Payout settings saved." }
}
