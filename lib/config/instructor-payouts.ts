import { CreditCardIcon, WalletIcon, type LucideIcon } from "lucide-react"

/**
 * Everything `/dashboard/instructor/settings/payouts` *says*, and nothing it
 * reads — the split every surface in this app makes.
 *
 * It also carries the client-safe limits and guards, for the mechanical reason
 * `lib/config/admin-users.ts` records: the form and its dialog are Client
 * Components and need all of them, and importing any *value* from
 * `lib/instructor-payouts.ts` would drag `lib/db` and the Postgres driver into
 * the browser bundle. This module imports nothing but icons, so it crosses
 * freely.
 */

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export const payoutSettingsCopy = {
  title: "Payout settings",
  description:
    "Choose where your earnings are sent and how often. Changes apply to the next scheduled payout.",

  methodsHeading: "Payout methods",
  addMethod: "Add payout method",
  editMethod: "Edit",
  /** Drawn when the instructor has no destination at all — the export only
   *  draws a filled list, so this state is invented (as the cart's and the
   *  wishlist's empty states were). It is the one that matters most: with no
   *  method there is nowhere for the money to go. */
  emptyTitle: "No payout method yet",
  emptyDescription:
    "Add a bank account or PayPal address so your earnings have somewhere to go.",

  scheduleHeading: "Payout schedule",
  /** The pill beside the schedule row. The schedule is a platform rule rather
   *  than a preference — see `payoutScheduleIsFixed` below. */
  scheduleFixed: "Fixed",

  receiptTitle: "Email me each payout receipt",
  receiptDescription: "A summary lands in your inbox whenever funds are sent.",

  submit: "Save payout settings",
  saved: "Payout settings saved.",
} as const

/**
 * **The schedule row is read-only, and the export says so** — it carries a
 * "Fixed" pill where every other row on the page carries a control.
 *
 * `Instructor.payoutDayOfMonth` and `.minimumPayoutCents` are therefore
 * *rendered* here and written nowhere: they are a platform rule the instructor
 * is told about, not a preference they set. The same two columns are what the
 * Help Center's payout answers quote (`app/(instructor)/dashboard/instructor/
 * help/page.tsx`), so the rule an instructor reads about and the rule drawn on
 * this row cannot disagree.
 *
 * If per-instructor schedules ever become editable, the admin console is where
 * that belongs — an instructor choosing their own payout day would let them
 * outrun the `PayoutRun` batch this platform actually pays from.
 */
export const payoutScheduleIsFixed = true

export const payoutMethodDialogCopy = {
  createTitle: "Add payout method",
  editTitle: "Edit payout method",
  description:
    "Where your earnings are sent. We only ever store the last four digits of an account number.",

  typeLabel: "Method",
  bankNameLabel: "Bank name",
  bankNamePlaceholder: "Barclays",
  last4Label: "Account ending",
  last4Placeholder: "4471",
  paypalLabel: "PayPal email",
  paypalPlaceholder: "you@example.com",
  currencyLabel: "Currency",

  primaryTitle: "Use as my primary payout method",
  primaryDescription: "Earnings are sent here first; the rest are fallbacks.",
  /** Shown instead when this is the only method on the account — there is
   *  nothing to fall back to, so the switch is on and inert. */
  primaryOnlyDescription:
    "Your only payout method, so this is where earnings are sent.",

  createSubmit: "Add payout method",
  editSubmit: "Save changes",
  remove: "Remove method",
} as const

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export type PayoutMethodTypeValue = "BANK_TRANSFER" | "PAYPAL"
export type PayoutMethodRoleValue = "PRIMARY" | "BACKUP"

export const payoutMethodTypes: {
  value: PayoutMethodTypeValue
  label: string
  icon: LucideIcon
}[] = [
  { value: "BANK_TRANSFER", label: "Bank transfer", icon: CreditCardIcon },
  { value: "PAYPAL", label: "PayPal", icon: WalletIcon },
]

export const payoutMethodTypeValues = new Set<string>(
  payoutMethodTypes.map((type) => type.value)
)

export function payoutMethodTypeLabel(type: PayoutMethodTypeValue) {
  return type === "PAYPAL" ? "PayPal" : "Bank transfer"
}

/**
 * The two role pills. Primary is outlined in `--info` and Backup in the muted
 * foreground — sampled off the export, whose blue is #3b82f6 exactly, which is
 * `--info` (used rather than `--role-student`, the identical value: this says
 * "first destination", not "student").
 *
 * Both are outlined rather than filled, unlike the console's status pills,
 * because they sit *inside* an already-tinted row — a filled pill on a tinted
 * row would need a third surface colour.
 */
export const payoutRoleBadges: Record<
  PayoutMethodRoleValue,
  { label: string; className: string }
> = {
  PRIMARY: { label: "Primary", className: "border-info text-info" },
  BACKUP: {
    label: "Backup",
    className: "border-muted-foreground/60 text-muted-foreground",
  },
}

/**
 * The currencies a payout can be sent in. **Reused from
 * `lib/config/admin-settings.ts` rather than listed again** — that module
 * already owns the platform's currency vocabulary and is pure copy, so a
 * second list here could only drift. A payout in a currency the platform
 * cannot price in would have nothing to convert from.
 */
export { platformCurrencies as payoutCurrencies } from "@/lib/config/admin-settings"

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

/** A bank name, or the PayPal address. What the row renders. */
export const PAYOUT_LABEL_MAX_LENGTH = 120

/** Exactly four digits. The schema stores no more: "Never store raw account
 *  numbers — the export only ever renders a last-4". */
export const PAYOUT_LAST4_LENGTH = 4

/** Enough destinations to keep a fallback chain, few enough that the list
 *  stays a list. The export draws two. */
export const MAX_PAYOUT_METHODS = 5
