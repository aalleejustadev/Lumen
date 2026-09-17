import type { LucideIcon } from "lucide-react"
import {
  CircleCheckIcon,
  MessageCircleQuestionMarkIcon,
  UsersRoundIcon,
  Volume2Icon,
} from "lucide-react"

import type { EnrollmentSource } from "@/lib/generated/prisma/client"

/**
 * Everything `/dashboard/instructor/analytics` *says*, and nothing it counts —
 * the split every surface in this codebase makes: the figures come out of
 * `lib/instructor-analytics.ts`, the phrasing around them lives here.
 *
 * It also carries the range vocabulary and the source palette, for the
 * mechanical reason `instructor-students.ts` records: the range select is a
 * Client Component and needs both, and importing any *value* from
 * `lib/instructor-analytics.ts` would drag `lib/db` and the Postgres driver
 * into the browser bundle.
 *
 * **This module is the exception that proves `lib/config/messages.ts`' rule.**
 * It holds lucide icons, which that file's note forbids — but the thing the
 * rule protects against is a *server* graph pulling `lucide-react` in
 * transitively (there, `app/(dashboard)/layout.tsx` reached this kind of
 * module through a count helper and slowed every route under the shell). The
 * only importers here are the Analytics route and its own components, and the
 * icons are drawn on that page either way. Nothing in a layout reaches it.
 */

// ---------------------------------------------------------------------------
// The date range
// ---------------------------------------------------------------------------

export type AnalyticsRange = "7d" | "30d" | "90d" | "12m"

/**
 * The control in the header's top-right corner. The export draws it reading
 * "Last 30 days", which is therefore the default and never reaches the URL.
 *
 * `days` is what every windowed figure on the page is measured over, and the
 * delta beside it compares the window immediately before — so a range change
 * moves both halves of every comparison at once.
 */
export const analyticsRanges: {
  value: AnalyticsRange
  label: string
  days: number
}[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "12m", label: "Last 12 months", days: 365 },
]

export const ANALYTICS_DEFAULT_RANGE: AnalyticsRange = "30d"

export const analyticsRangeValues = new Set<string>(
  analyticsRanges.map((range) => range.value)
)

export function rangeDays(range: AnalyticsRange): number {
  return (
    analyticsRanges.find((entry) => entry.value === range)?.days ??
    analyticsRanges[1]!.days
  )
}

export function rangeLabel(range: AnalyticsRange): string {
  return (
    analyticsRanges.find((entry) => entry.value === range)?.label ??
    analyticsRanges[1]!.label
  )
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export const analyticsCopy = {
  title: "Analytics",
  description:
    "How your courses are performing — enrolment, completion, watch time, and where learners find you.",
  rangeLabel: "Date range",
  enrolmentsHeading: "New enrolments by month",
  /** The line under that heading. "best month" names the tallest bar, which is
   *  the one thing a six-column chart is read for at a glance. */
  enrolmentsLead: (total: number, best: string | null) =>
    best === null
      ? `${total.toLocaleString("en-US")} ${total === 1 ? "learner" : "learners"} joined`
      : `${total.toLocaleString("en-US")} ${
          total === 1 ? "learner" : "learners"
        } joined · best month ${best}`,
  enrolmentsEmpty: "No enrolments in the last six months.",
  sourcesHeading: "Where enrolments come from",
  sourcesEmpty: "No enrolments in this period.",
  performanceHeading: "Course performance",
  performanceLead: "Ranked by new enrolments in this period",
  performanceEmpty: "No course has been enrolled in during this period.",
  /** The four table headings, left to right. */
  columns: {
    course: "Course",
    enrolments: "Enrolments",
    completion: "Completion",
    watchTime: "Watch time",
  },
  empty: {
    title: "Nothing to measure yet",
    description:
      "Publish a course and this page fills in — enrolment, completion, watch time, and where your learners come from.",
  },
} as const

/** The four KPI tiles, in the export's order. `footnote` is the muted line
 *  under each figure; what each one *means* is decided in
 *  `lib/instructor-analytics.ts`. */
export const analyticsStatCards: {
  key: "enrolments" | "openQuestions" | "completion" | "watchTime"
  label: string
  icon: LucideIcon
  format: "count" | "percent1"
  /** Open questions draws "+2" where the rest draw "+8.1%" — see `StatCard`. */
  deltaFormat: "percent" | "count"
}[] = [
  {
    key: "enrolments",
    label: "New enrolments",
    icon: UsersRoundIcon,
    format: "count",
    deltaFormat: "percent",
  },
  {
    key: "openQuestions",
    label: "Open questions",
    icon: MessageCircleQuestionMarkIcon,
    format: "count",
    deltaFormat: "count",
  },
  {
    key: "completion",
    label: "Completion rate",
    icon: CircleCheckIcon,
    format: "percent1",
    deltaFormat: "percent",
  },
  {
    key: "watchTime",
    label: "Avg. watch time",
    icon: Volume2Icon,
    format: "percent1",
    deltaFormat: "percent",
  },
]

const rateDigits = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })

/**
 * "42 per day average", "1.6 per week average", "0.8 per month average".
 *
 * **The unit is chosen, not fixed at per-day.** The export draws 1,284 over 30
 * days as "42 per day average", so a busy account reads in days — but the same
 * sentence handed 7 over 30 days wrote "0 per day average", and 10 over a year
 * wrote it again with two more decimals of nothing. A rate below one a day
 * says more per week, and below one a week it says more per month; this walks
 * up until the figure is worth reading and stops at months, where "0.8" is
 * genuinely the answer rather than a rounding artefact.
 *
 * A rate of one a day or more is **floored**, which is what the export does
 * (1,284 ÷ 30 is 42.8 and it writes 42).
 */
export const analyticsFootnotes = {
  enrolments: (perDay: number) => {
    if (perDay >= 1) {
      return `${Math.floor(perDay).toLocaleString("en-US")} per day average`
    }
    const perWeek = perDay * 7
    if (perWeek >= 1) return `${rateDigits.format(perWeek)} per week average`
    return `${rateDigits.format(perDay * 30)} per month average`
  },
  openQuestions: "awaiting your reply",
  completion: "across active cohorts",
  watchTime: "of each lesson",
} as const

// ---------------------------------------------------------------------------
// Where enrolments come from
// ---------------------------------------------------------------------------

/**
 * The rows of "Where enrolments come from" — and **the one place this page
 * departs from its export.**
 *
 * The export draws four *acquisition channels*: Course search, Instructor
 * profile, Lumen Business, Direct & referrals. Three of those four are traffic
 * attribution, and nothing in this app records where a learner came from —
 * there is no referrer column on `Enrollment`, nothing writes one, and adding
 * one would leave every account showing 100% unknown, which is worse than not
 * drawing the card. Building the drawn card would mean inventing the numbers.
 *
 * `EnrollmentSource` *is* an answer to the question the heading asks, it is
 * already stored on every row, and one of its members is literally the
 * export's own "Lumen Business". So the card keeps the export's geometry, its
 * colours and its heading, and its rows become the five real sources. That is
 * the call `adminEmailNotifications` made about the console's own toggle rows:
 * the principled source beats an invented list.
 *
 * To reproduce the drawn card, `Enrollment` needs a nullable `referrer` enum
 * written at checkout and at the free-enrol path; the card then takes that
 * instead and nothing above it changes.
 *
 * **Colour is keyed to the source, not to the row's position**, so a source
 * keeps its swatch as the shares move underneath it — the arrangement
 * `categoryAccentClasses` records. The four drawn fills are sampled and land
 * on `--accent-2`, `--accent-1` and `--success` exactly; the amber is
 * `#f59e0c`, which no token matches to the digit, so it takes `--star` — the
 * token the categories page already maps amber to, and a token rather than the
 * literal hex so dark mode follows.
 */
export const enrolmentSources: {
  value: EnrollmentSource
  label: string
  dot: string
  bar: string
}[] = [
  {
    value: "PURCHASE",
    label: "Direct purchase",
    dot: "bg-accent-2",
    bar: "bg-accent-2",
  },
  {
    value: "BUSINESS_PLAN",
    label: "Lumen Business",
    dot: "bg-success",
    bar: "bg-success",
  },
  {
    value: "COUPON",
    label: "Coupon redemption",
    dot: "bg-accent-1",
    bar: "bg-accent-1",
  },
  {
    value: "ADMIN_GRANT",
    label: "Granted by an admin",
    dot: "bg-star",
    bar: "bg-star",
  },
  {
    value: "FREE",
    label: "Free enrolment",
    dot: "bg-warning",
    bar: "bg-warning",
  },
]

/**
 * How many courses "Course performance" lists.
 *
 * The export draws five and has no pager, so five is its sample size rather
 * than a designed cap — the reading `TRANSACTIONS_LIMIT` settled for the
 * billing table. It is set well above that so an instructor with a real
 * catalogue sees all of it rather than a truncated top five.
 */
export const ANALYTICS_COURSE_LIMIT = 20

/** How many months the enrolments chart draws — the export's own six
 *  columns, and the same figure the console's revenue chart uses. */
export const ENROLMENT_MONTHS = 6
