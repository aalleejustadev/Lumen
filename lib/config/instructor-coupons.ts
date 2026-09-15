/**
 * Every word the Coupons page and its dialog say, plus the handful of rules
 * both halves agree on. Built to
 * `ui-design/light/dashboard/instructor/coupons-page__main.png` and
 * `create-coupon__dialog.png`.
 *
 * No `lib/db` import on purpose: the table, the toolbar and the dialog are all
 * Client Components and need this, while `lib/instructor-coupons.ts` drags the
 * Postgres driver. The split `lib/config/admin-users.ts` records the reason
 * for — and it holds **data, never components**, which is the trap
 * `lib/config/messages.ts` already paid for.
 */

/** The export's four segments. `all` is the default, so it never reaches the URL. */
export type CouponTab = "all" | "active" | "scheduled" | "expired"

export const couponTabs: { value: CouponTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired", label: "Expired" },
]

export const couponTabValues = new Set<string>(
  couponTabs.map((tab) => tab.value)
)

/**
 * A coupon's state, **read off the clock and never stored** — the call
 * `Promotion` already makes, and for its reason: `startsAt`/`endsAt` carry the
 * answer, so a status column would be a second one free to drift.
 *
 * A coupon that has reached its redemption limit is deliberately *not*
 * "expired": it is exhausted, which is a different fact, and the export's own
 * EARLYBIRD row sits at 148/150 and is drawn **Active**. The table says so in
 * the redemption cell rather than the pill.
 */
export type CouponStatus = "active" | "scheduled" | "expired"

export const couponStatusLabel: Record<CouponStatus, string> = {
  active: "Active",
  scheduled: "Scheduled",
  expired: "Expired",
}

/**
 * Pills use `bg-<token>/10 text-<token>` on the semantic tokens rather than
 * the export's literal fills, so dark mode follows — the rule
 * `settings-billing.tsx`
 * records. Sampled, its Scheduled blue is `--info` at 10% exactly; Expired is
 * not drawn at all (no row on page one is expired) and takes the neutral
 * treatment the Users table gives its majority case, because a third colour
 * would be saying something the state does not mean.
 */
export const couponStatusBadge: Record<CouponStatus, string> = {
  active: "bg-success/10 text-success",
  scheduled: "bg-info/10 text-info",
  expired: "bg-hover text-muted-foreground",
}

/** The dialog's two radio cards. Stored as `Coupon.discountType`. */
export const discountTypes = [
  {
    value: "PERCENT" as const,
    title: "Percentage off",
    description: "e.g. 40% off the list price",
  },
  {
    value: "FIXED_PRICE" as const,
    title: "Fixed price",
    description: "e.g. sell at $9.99 flat",
  },
]

/**
 * **Three active coupons per course**, which is the rule the dialog's own lead
 * states out loud. It is enforced in `lib/actions/instructor-coupons.ts`
 * rather than only written here — a sentence in a dialog that nothing checks
 * is the kind of promise this codebase refuses to make elsewhere.
 */
export const ACTIVE_COUPONS_PER_COURSE = 3

/** Rows per page. The export's footer reads "Showing 1–5 of 8 coupons". */
export const COUPONS_PAGE_SIZE = 5

export const COUPON_CODE_MAX = 24
export const COUPON_CODE_MIN = 3

export const couponsCopy = {
  title: "Coupons",
  description: "Discount codes across every course you teach.",
  newCoupon: "New coupon",
  allCourses: "All courses",
  edit: "Edit",
  empty: {
    title: "No coupons yet",
    description:
      "Create a discount code and it will apply at checkout for the course you choose.",
  },
  noMatches: "No coupons match this filter.",
  /** "Showing 1–5 of 8 coupons" — the export's own footer, to the dash. */
  showing: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total} ${total === 1 ? "coupon" : "coupons"}`,
} as const

export const couponStats = {
  active: "Active coupons",
  redemptions: "Total redemptions",
  revenue: "Revenue from coupons",
  averageDiscount: "Avg. discount given",
} as const

export const couponDialogCopy = {
  createTitle: "Create coupon",
  editTitle: "Edit coupon",
  description: `Codes are case-insensitive and apply at checkout. You can run up to ${ACTIVE_COUPONS_PER_COURSE} active coupons per course.`,
  code: "Coupon code",
  codePlaceholder: "AUTUMN30",
  appliesTo: "Applies to",
  appliesToPlaceholder: "Choose a course",
  discountType: "Discount type",
  percentOff: "Percentage off",
  fixedPrice: "Price",
  redemptionLimit: "Redemption limit",
  redemptionLimitPlaceholder: "Unlimited",
  starts: "Starts",
  startsPlaceholder: "Immediately",
  expires: "Expires",
  expiresPlaceholder: "Never",
  create: "Create coupon",
  save: "Save changes",
  /**
   * The export's callout, which states a **real** rule: an instructor's share
   * is taken on what the learner actually paid, which is what
   * `OrderItem.revenueShareBps` is applied to. The figures in it are computed
   * from the form's live values rather than written into the sentence, for the
   * reason the Help Center's FAQ answers give — a number in copy is a second
   * source of truth free to drift from the one the money runs on.
   */
  earningsNote: (discounted: string, payout: string, list: string) =>
    `Your earnings are calculated on the discounted price. This coupon sells a ${list} course at ${discounted} and pays out roughly ${payout} per sale.`,
  earningsNotePending:
    "Your earnings are calculated on the discounted price, not the list price.",
} as const
