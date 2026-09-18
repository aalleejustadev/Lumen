import "server-only"

import type Stripe from "stripe"

import { db } from "@/lib/db"
import { enrolInCourse } from "@/lib/enrolment"

/**
 * Order fulfilment. Called from the Stripe webhook
 * (`app/api/stripe/webhook/route.ts`) and from nowhere else — in particular
 * *not* from the return page. A customer is not guaranteed to ever load that
 * page: they can pay and then lose their connection, or close the tab on the
 * redirect, and any fulfilment that only ran there would silently drop the
 * order. Stripe's own guidance is emphatic about this.
 *
 * Everything here is idempotent, because it has to be: webhooks are delivered
 * at least once, `checkout.session.completed` and
 * `checkout.session.async_payment_succeeded` can both fire for the same
 * session, and Stripe retries on any non-2xx.
 */

/**
 * Marks an order paid and empties the cart rows it was built from.
 *
 * Returns whether this call is the one that did it, so the caller can log a
 * genuine fulfilment separately from a replayed event.
 */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  // With a delayed-notification payment method (bank debit, vouchers),
  // `checkout.session.completed` arrives while the money is still in flight.
  // Fulfilling on that event alone would grant access for payments that later
  // fail — and never fulfil the ones that succeed, since their success
  // arrives as `async_payment_succeeded` instead.
  if (session.payment_status === "unpaid") {
    return { fulfilled: false, reason: "unpaid" as const }
  }

  const order = await db.order.findUnique({
    where: { stripeSessionId: session.id },
    include: {
      items: {
        select: {
          id: true,
          courseSlug: true,
          courseId: true,
          instructorId: true,
          revenueShareBps: true,
          unitAmount: true,
        },
      },
    },
  })

  if (!order) {
    // A session we never recorded — a stray event from another integration
    // sharing this endpoint, or a session created outside the app. Nothing to
    // fulfil, and worth a 200 so Stripe stops retrying it.
    return { fulfilled: false, reason: "unknown-order" as const }
  }

  if (order.status === "PAID") {
    return { fulfilled: false, reason: "already-fulfilled" as const }
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)

  await db.$transaction([
    // `updateMany` with the status in the filter rather than `update` by id:
    // two concurrent deliveries of the same event then race on the database's
    // own row lock, and the loser updates nothing instead of double-writing.
    db.order.updateMany({
      where: { id: order.id, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
        amountTotal: session.amount_total ?? order.amountTotal,
        email: session.customer_details?.email ?? order.email,
      },
    }),
    // Only the courses actually bought leave the cart — anything added while
    // the Stripe form was open is not part of this order and stays put.
    db.cartItem.deleteMany({
      where: {
        userId: order.userId,
        courseSlug: { in: order.items.map((item) => item.courseSlug) },
      },
    }),
  ])

  // **Access is granted here, and only once the money is in.** This is what
  // the order was *for*: before it existed, fulfilment marked the row PAID and
  // stopped, so a paying customer got no course. It runs outside the
  // transaction above on purpose — `enrolInCourse` also sends the instructor's
  // welcome message and writes notifications, and none of that should be able
  // to roll back a payment that succeeded.
  //
  // Sequential rather than `Promise.all`: a basket is a handful of courses,
  // and each enrolment increments a counter on its own course row.
  for (const item of order.items) {
    const courseId =
      item.courseId ??
      (
        await db.course.findUnique({
          where: { slug: item.courseSlug },
          select: { id: true },
        })
      )?.id
    // An item naming no course we hold is skipped rather than failing the
    // webhook — the order is still paid, and Stripe must not retry forever.
    if (!courseId) continue

    await enrolInCourse({
      userId: order.userId,
      courseId,
      source: "PURCHASE",
      orderId: order.id,
    }).catch((error) => {
      console.error("[fulfil] enrolment failed", item.courseSlug, error)
    })

    // **What the instructor earned.** Without this a sale was money the
    // platform kept silently: Revenue & Payouts, My Courses' revenue column,
    // the manage page's figure and the console's "Platform share" all read
    // `InstructorEarning`, and nothing wrote one — every real sale showed as
    // zero earned. The rate is the **snapshot on the item**, not today's
    // setting, which is the whole reason `OrderItem.revenueShareBps` exists.
    await recordEarning(item).catch((error) => {
      console.error("[fulfil] earning failed", item.courseSlug, error)
    })
  }

  return { fulfilled: true, orderId: order.id }
}

/** `checkout.session.async_payment_failed` — the money never arrived. */
export async function failCheckoutSession(session: Stripe.Checkout.Session) {
  await db.order.updateMany({
    where: { stripeSessionId: session.id, status: "PENDING" },
    data: { status: "FAILED" },
  })
}

/**
 * `checkout.session.expired` — the customer opened checkout and never paid.
 * Closes the PENDING row out so an abandoned order stops looking in-flight;
 * the cart is left alone, since nothing was bought and they may come back.
 */
export async function expireCheckoutSession(session: Stripe.Checkout.Session) {
  await db.order.updateMany({
    where: { stripeSessionId: session.id, status: "PENDING" },
    data: { status: "EXPIRED" },
  })
}

/** How long a sale is held before it can be paid out — the instructor Revenue
 *  page's "clears within 30 days". */
const CLEARING_DAYS = 30

/**
 * One `InstructorEarning` per sold item, idempotently.
 *
 * Keyed on `orderItemId`, so a replayed webhook finds the row rather than
 * writing a second one — the same rule every other write on this path follows.
 * An item with no instructor snapshot is skipped rather than guessed at: that
 * means it was bought before the snapshot existed, and inventing a rate would
 * put a number in a ledger nobody agreed to.
 */
async function recordEarning(item: {
  id: string
  instructorId: string | null
  revenueShareBps: number | null
  unitAmount: number
  courseId: string | null
}) {
  if (!item.instructorId || item.revenueShareBps === null) return

  const existing = await db.instructorEarning.findFirst({
    where: { orderItemId: item.id },
    select: { id: true },
  })
  if (existing) return

  const gross = item.unitAmount
  const net = Math.round((gross * item.revenueShareBps) / 10000)

  await db.instructorEarning.create({
    data: {
      instructorId: item.instructorId,
      courseId: item.courseId,
      source: "SALE",
      orderItemId: item.id,
      grossCents: gross,
      // The platform's cut is the remainder, so the two always add back to
      // gross however the rate is rounded.
      platformFeeCents: gross - net,
      netCents: net,
      status: "PENDING",
      clearsAt: new Date(Date.now() + CLEARING_DAYS * 24 * 60 * 60 * 1000),
    },
  })
}
