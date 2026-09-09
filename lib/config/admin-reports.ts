import {
  ArrowUpDownIcon,
  CircleDollarSignIcon,
  UsersRoundIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import type { ReportStats } from "@/lib/admin/reports"
import type { PlatformStatFormat } from "@/lib/config/admin-overview"

/**
 * Everything `/dashboard/admin/reports` *says*, and nothing it counts — the
 * same split `lib/config/admin-overview.ts` makes, and for the same reason:
 * the numbers have to come from the database, the phrasing around them is copy
 * that should be editable without opening a query.
 */

export const adminReportsCopy = {
  title: "Reports",
  description: "Platform-wide revenue, growth, and refund trends.",
  revenueHeading: "Gross revenue by month",
  payoutsHeading: "Instructor payout runs",
  payoutsDescription: "Monthly disbursements across the whole platform.",
  /** The export only draws populated cards; these are the other halves. */
  revenueEmpty: "No paid orders in the last six months.",
  payoutsEmpty: "No payout runs have been scheduled yet.",
  recipientsEmpty: "This run has no recipients.",
  /** A SCHEDULED run has a recipient count but no payout rows yet. */
  recipientsPending:
    "This run hasn't been processed yet — no payouts have been created.",
} as const

export type ReportStatKey = keyof ReportStats

export const reportStatCards: {
  key: ReportStatKey
  label: string
  icon: LucideIcon
  format: PlatformStatFormat
  /**
   * A relative change, or a difference in percentage points. Only the refund
   * rate is the latter — the reasoning is in `lib/admin/reports.ts`.
   */
  deltaFormat: "relative" | "points"
}[] = [
  {
    key: "revenue",
    label: "Gross revenue",
    icon: WalletIcon,
    format: "currency",
    deltaFormat: "relative",
  },
  {
    key: "platformShare",
    label: "Platform share",
    icon: CircleDollarSignIcon,
    format: "currency",
    deltaFormat: "relative",
  },
  {
    key: "signups",
    label: "New signups",
    icon: UsersRoundIcon,
    format: "count",
    deltaFormat: "relative",
  },
  {
    key: "refundRate",
    label: "Refund rate",
    icon: ArrowUpDownIcon,
    format: "percent",
    deltaFormat: "points",
  },
]

// ---------------------------------------------------------------------------
// Payout runs
// ---------------------------------------------------------------------------

export type PayoutRunStatus =
  "SCHEDULED" | "PROCESSING" | "COMPLETED" | "PARTIALLY_FAILED"

/**
 * The pills in the Status column. Tints are a tenth-opacity semantic token
 * behind that token as the text colour, rather than the export's literal
 * hexes, so dark mode follows — the choice `billing-transactions.tsx`
 * documents.
 */
export const payoutRunStatusStyles: Record<PayoutRunStatus, string> = {
  COMPLETED: "bg-success/10 text-success",
  SCHEDULED: "bg-accent-2/10 text-accent-2",
  PROCESSING: "bg-warning/10 text-warning",
  PARTIALLY_FAILED: "bg-destructive/10 text-destructive",
}

/**
 * A run's status as a phrase. PARTIALLY_FAILED reads as a *count* ("1 failed"),
 * which is what the export draws and the only version of that status anyone
 * can act on — "partially failed" says a run went wrong without saying how
 * much of it did.
 */
export function payoutRunStatusLabel(
  status: PayoutRunStatus,
  failedCount: number
) {
  if (status === "PARTIALLY_FAILED") {
    return failedCount > 0 ? `${failedCount} failed` : "Partially failed"
  }
  return {
    COMPLETED: "Completed",
    SCHEDULED: "Scheduled",
    PROCESSING: "Processing",
  }[status]
}

export const payoutStatusStyles: Record<"PENDING" | "PAID" | "FAILED", string> =
  {
    PAID: "bg-success/10 text-success",
    PENDING: "bg-warning/10 text-warning",
    FAILED: "bg-destructive/10 text-destructive",
  }

export const payoutStatusLabels: Record<"PENDING" | "PAID" | "FAILED", string> =
  {
    PAID: "Paid",
    PENDING: "Pending",
    FAILED: "Failed",
  }

/** How a recipient's destination is written: "Bank · ••••4471", "PayPal · a@b". */
export function payoutMethodLine(recipient: {
  methodType: "BANK_TRANSFER" | "PAYPAL" | "STRIPE" | null
  methodLabel: string | null
  methodLast4: string | null
}) {
  if (!recipient.methodType) return null

  const kind = {
    BANK_TRANSFER: "Bank",
    PAYPAL: "PayPal",
    STRIPE: "Stripe",
  }[recipient.methodType]

  // A bank shows a masked last-4 — never an account number, which is why
  // `PayoutMethod` only stores four digits. PayPal's "label" *is* the address,
  // so it is shown instead, truncated by the row rather than here.
  const detail = recipient.methodLast4
    ? `••••${recipient.methodLast4}`
    : recipient.methodLabel

  return detail ? `${kind} · ${detail}` : kind
}
