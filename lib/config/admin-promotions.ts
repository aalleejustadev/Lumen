import { PercentIcon, TagIcon, type LucideIcon } from "lucide-react"

import type {
  PromotionDiscountType,
  PromotionScope,
} from "@/lib/generated/prisma/client"

/**
 * Everything `/dashboard/admin/promotions` and its dialog *say*, and nothing
 * they count — the split every other console page makes.
 *
 * It also carries the page size, the limits and the client-safe guards, for
 * the mechanical reason `admin-users.ts` records: the board is a Client
 * Component and needs all of them, and importing any *value* from
 * `lib/admin/promotions.ts` would drag `lib/db` and the Postgres driver into
 * the browser bundle. This module imports nothing but types, so it crosses
 * freely.
 */

/**
 * The instructor participation list pages. The export draws four rows and no
 * pager, which is its sample rather than a designed cap — there are eight
 * teaching accounts today and the list grows with every application approved,
 * so a page of two hundred toggle rows is the state it has to survive. Same
 * reasoning `courses-list.tsx` gives for the filter row its own export does
 * not draw.
 */
export const PARTICIPATION_PAGE_SIZE = 6

/**
 * Past promotions are capped rather than paged: the export draws four rows and
 * no pager, and a platform runs a handful of sales a year, so the honest fix
 * is a limit set well above the sample — the reading
 * `billing-transactions.tsx` settled for its own six-row table.
 */
export const PAST_PROMOTIONS_LIMIT = 24

export const PROMOTION_NAME_MAX_LENGTH = 60

/** Percent off. A 100% sale is a giveaway, not a promotion. */
export const MIN_PERCENT_OFF = 1
export const MAX_PERCENT_OFF = 99

/** A flat sale price, in cents — Stripe's own floor is $0.50, and $999.99 is
 *  well above the dearest course in the catalog. */
export const MIN_FIXED_PRICE_CENTS = 50
export const MAX_FIXED_PRICE_CENTS = 99_999

/** How far ahead a sale may be scheduled or run, in days. */
export const MAX_PROMOTION_DAYS = 365

export const adminPromotionsCopy = {
  title: "Promotions",
  description:
    "Platform-wide sales. Applied automatically to every opted-in course.",
  newPromotion: "New promotion",
  edit: "Edit",
  /** "End sale" while it is running; a scheduled sale has nothing to end. */
  endSale: "End sale",
  cancelSale: "Cancel sale",
  /** The four tiles inside a promotion card, in the drawn order. */
  heroStats: {
    redemptions: "Redemptions",
    revenue: "Sale revenue",
    included: "Courses included",
    optedOut: "Opted out",
  },
  activeEmptyTitle: "No sale is running",
  activeEmptyDescription:
    "Launch a promotion and it will appear here with its redemptions and revenue while it runs.",
  participationHeading: "Instructor participation",
  participationLead:
    "Instructors choose whether their courses join Lumen promotions. Opted-out courses keep their list price.",
  participationEmptyTitle: "No instructors yet",
  participationEmptyDescription:
    "Approve an instructor application and their participation switch will appear here.",
  /** The switch's accessible name — the pill beside it is decoration. */
  participationToggleLabel: (instructor: string) =>
    `${instructor} joins Lumen promotions`,
  courses: (count: number) =>
    `${count.toLocaleString("en-US")} ${count === 1 ? "course" : "courses"}`,
  students: (count: number) =>
    `${count.toLocaleString("en-US")} ${count === 1 ? "student" : "students"}`,
  pastHeading: "Past promotions",
  pastEmptyTitle: "No past promotions",
  pastEmptyDescription:
    "A sale moves here once it ends, with the redemptions and revenue it earned.",
  pastColumns: {
    promotion: "Promotion",
    discount: "Discount",
    scope: "Scope",
    redemptions: "Redemptions",
    revenue: "Revenue",
  },
  showing: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total} ${
      total === 1 ? "instructor" : "instructors"
    }`,
} as const

// ---------------------------------------------------------------------------
// Pills
// ---------------------------------------------------------------------------

export type Pill = { label: string; className: string }

/**
 * The pill beside a running promotion's name.
 *
 * **Not a stored column** — `Promotion` has no status field, and it should not:
 * a sale's state is a fact about the clock and `startsAt`/`endsAt` already
 * carry it, so a third column could only ever disagree with them.
 *
 * LIVE NOW is `--success` filled with white text, sampled off the export. A
 * *scheduled* sale is a state the export never got to draw — it only draws a
 * running one — and it takes the neutral fill for the reason the Users page's
 * Student pill does: it says when the sale runs, not that anything is wrong.
 */
export function promotionStatePill(live: boolean): Pill {
  return live
    ? { label: "Live now", className: "bg-success text-white" }
    : { label: "Scheduled", className: "bg-hover text-muted-foreground" }
}

/**
 * The pill beside an instructor's switch. Reads
 * `Instructor.promotionOptIn`, which is what the switch writes — the same
 * "derive the pill, never store it" arrangement `postingPill` makes.
 *
 * Tints are a tenth-opacity semantic token behind that same token rather than
 * the export's literal hexes, so dark mode follows — the choice
 * `billing-transactions.tsx` documents and every console pill since has kept.
 */
export function participationPill(participating: boolean): Pill {
  return participating
    ? { label: "Participating", className: "bg-success/10 text-success" }
    : { label: "Opted out", className: "bg-hover text-muted-foreground" }
}

// ---------------------------------------------------------------------------
// The dialog
// ---------------------------------------------------------------------------

export const promotionDialogCopy = {
  createTitle: "New promotion",
  editTitle: "Edit promotion",
  description:
    "This price is applied platform-wide and overrides instructor list prices for the duration of the sale.",
  nameLabel: "Promotion name",
  namePlaceholder: "e.g. Autumn Skills Sale",
  discountTypeLabel: "Discount type",
  percentLabel: "Percentage off",
  percentPlaceholder: "70",
  fixedLabel: "Sale price",
  fixedPlaceholder: "9.99",
  fixedPrefix: "$",
  applyToLabel: "Apply to",
  categoriesLabel: "Categories",
  categoriesEmpty: "No categories exist yet — create one first.",
  startsLabel: "Starts",
  startsPlaceholder: "Immediately",
  endsLabel: "Ends",
  endsPlaceholder: "Pick a date",
  forceTitle: "Force on all courses",
  forceDescription:
    "Overrides instructor opt-out. Use only for platform-wide events.",
  createSubmit: "Launch promotion",
  editSubmit: "Save changes",
} as const

/** The two radio cards under "Discount type", in the drawn order. */
export const discountTypeOptions: {
  value: PromotionDiscountType
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    value: "PERCENT",
    label: "Percentage off",
    description: "Every course drops by the same percentage.",
    icon: PercentIcon,
  },
  {
    value: "FIXED_PRICE",
    label: "Fixed sale price",
    description: "Every course is sold at one flat price.",
    icon: TagIcon,
  },
]

/** The two segments of "Apply to". */
export const promotionScopeOptions: {
  value: PromotionScope
  label: string
}[] = [
  { value: "ALL_COURSES", label: "All courses" },
  { value: "CATEGORIES", label: "Specific categories" },
]

export function isPromotionDiscountType(
  value: unknown
): value is PromotionDiscountType {
  return value === "PERCENT" || value === "FIXED_PRICE"
}

export function isPromotionScope(value: unknown): value is PromotionScope {
  return value === "ALL_COURSES" || value === "CATEGORIES"
}
