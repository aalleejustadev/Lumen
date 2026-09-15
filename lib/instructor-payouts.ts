import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import type {
  PayoutMethodRoleValue,
  PayoutMethodTypeValue,
} from "@/lib/config/instructor-payouts"

/**
 * Reads for `/dashboard/instructor/settings/payouts`. Writes are in
 * `lib/actions/instructor-payouts.ts`.
 *
 * Pulls in `lib/db`, so the same "never import this from a Client Component"
 * rule as `lib/cart.ts` applies — which is why every limit and label the form
 * needs lives in `lib/config/instructor-payouts.ts` instead.
 */

export type PayoutMethodView = {
  id: string
  type: PayoutMethodTypeValue
  /** A bank name, or the PayPal address. */
  label: string
  last4: string | null
  currency: string
  role: PayoutMethodRoleValue
  verified: boolean
  /** Pre-formatted "Mar 2021". Built on the server so the row's second line
   *  is a plain string by the time it reaches the client — the arrangement
   *  the audit log's relative timestamps already use, and for its second
   *  reason too: a date formatted on both sides of the boundary is a
   *  hydration mismatch waiting to happen. */
  addedOn: string
}

export type PayoutSettings = {
  methods: PayoutMethodView[]
  /** Day of the month the `PayoutRun` batch goes out. Rendered, never
   *  written — see `payoutScheduleIsFixed`. */
  payoutDayOfMonth: number
  minimumPayoutCents: number
  emailPayoutReceipt: boolean
}

/**
 * The instructor's own payout destinations and schedule, or `null` when there
 * is no session or no teaching profile.
 *
 * **Null is a real state here, unlike on the profile and account pages.**
 * `app/(instructor)/layout.tsx` admits an account carrying the `instructor`
 * role whose `Instructor` row is still being written — `canTeach`'s own
 * documented window — and that account has no payout profile to show. The page
 * says so rather than rendering an empty form that would silently write
 * nowhere.
 *
 * Methods come back primary-first, then oldest-first, which is the export's
 * own order (a bank marked Primary above a PayPal marked Backup) and the order
 * money would actually be attempted in.
 */
export async function getPayoutSettings(): Promise<PayoutSettings | null> {
  const session = await getSession()
  if (!session) return null

  const instructor = await db.instructor.findUnique({
    where: { userId: session.user.id },
    select: {
      payoutDayOfMonth: true,
      minimumPayoutCents: true,
      emailPayoutReceipt: true,
      payoutMethods: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          type: true,
          label: true,
          last4: true,
          currency: true,
          role: true,
          verifiedAt: true,
          createdAt: true,
        },
      },
    },
  })
  if (!instructor) return null

  return {
    // `role: "asc"` sorts on the enum's declaration order, and
    // `PayoutMethodRole` declares PRIMARY first — so this is primary-first by
    // construction rather than by a string comparison that would put BACKUP
    // ahead of it alphabetically.
    methods: instructor.payoutMethods.map((method) => ({
      id: method.id,
      type: method.type,
      label: method.label,
      last4: method.last4,
      currency: method.currency,
      role: method.role,
      verified: method.verifiedAt !== null,
      addedOn: method.createdAt.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
    })),
    payoutDayOfMonth: instructor.payoutDayOfMonth,
    minimumPayoutCents: instructor.minimumPayoutCents,
    emailPayoutReceipt: instructor.emailPayoutReceipt,
  }
}
