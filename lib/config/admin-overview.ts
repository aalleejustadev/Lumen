import {
  BookOpenTextIcon,
  BrainCircuitIcon,
  BriefcaseIcon,
  CircleCheckIcon,
  Code2Icon,
  LayoutGridIcon,
  LineChartIcon,
  MegaphoneIcon,
  PaletteIcon,
  PresentationIcon,
  SproutIcon,
  StarIcon,
  UsersRoundIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import type { AttentionFacts } from "@/lib/admin/overview"

/**
 * Everything `/dashboard/admin` *says*, and nothing it counts.
 *
 * `lib/admin/overview.ts` returns facts — counts, dates, sums — and this file
 * turns them into the sentences from
 * `ui-design/light/dashboard/admin/platform-overview.png`. That split is
 * deliberate: the numbers have to come from the database, but the phrasing
 * around them is copy, and copy belongs somewhere it can be read and edited
 * without opening a query.
 */

export const adminOverviewCopy = {
  title: "Platform Overview",
  /** The pill beside the title, the sibling of the student page's mode badge. */
  modeBadge: "Admin mode",
  attentionHeading: "Needs your attention",
  topCoursesHeading: "Top courses platform-wide",
  /** The export only draws a full queue; these are the other halves. */
  attentionEmpty: "Nothing is waiting on you right now.",
  topCoursesEmpty: "No courses are live yet.",
} as const

// ---------------------------------------------------------------------------
// The four stat cards
// ---------------------------------------------------------------------------

export type PlatformStatKey = "users" | "courses" | "revenue" | "uptime"

/** How the card's big number should be read, which decides its formatting. */
export type PlatformStatFormat = "count" | "currency" | "percent"

export const platformStatCards: {
  key: PlatformStatKey
  label: string
  icon: LucideIcon
  format: PlatformStatFormat
  /**
   * Whether the delta is a relative change or a difference in percentage
   * points. Only uptime is the latter — see the note in
   * `lib/admin/overview.ts`.
   */
  deltaFormat: "relative" | "points"
}[] = [
  {
    key: "users",
    label: "Total users",
    icon: UsersRoundIcon,
    format: "count",
    deltaFormat: "relative",
  },
  {
    key: "courses",
    label: "Live courses",
    icon: BookOpenTextIcon,
    format: "count",
    deltaFormat: "relative",
  },
  {
    key: "revenue",
    label: "Gross revenue",
    icon: WalletIcon,
    format: "currency",
    deltaFormat: "relative",
  },
  {
    key: "uptime",
    label: "Uptime",
    icon: CircleCheckIcon,
    format: "percent",
    deltaFormat: "points",
  },
]

// ---------------------------------------------------------------------------
// Needs your attention
// ---------------------------------------------------------------------------

/** The four tints the export uses, in the order it draws them. */
export type AttentionTone = "info" | "violet" | "star" | "danger"

export const attentionToneClasses: Record<AttentionTone, string> = {
  info: "bg-accent-2/10 text-accent-2",
  violet: "bg-accent-1/10 text-accent-1",
  star: "bg-star/10 text-star",
  danger: "bg-destructive/10 text-destructive",
}

export type SubtitleFormatters = {
  /** "2 days ago", "yesterday". */
  relative: (date: Date) => string
  /** "01 Oct". */
  shortDate: (date: Date) => string
}

export type AttentionQueue = {
  key: keyof AttentionFacts
  icon: LucideIcon
  tone: AttentionTone
  /** Where the row's chevron goes. */
  href: string
  /**
   * Whether `href` exists yet. Some queue pages are still to be built, and a
   * chevron onto a 404 is worse than no chevron — so an unbuilt row renders
   * inert, exactly as `settingsNav`'s own `built` flag makes an unbuilt
   * settings section inert. Flip it when the route lands.
   */
  built: boolean
  /**
   * Turns the whole fact set into the row's two lines. Each queue is handed
   * everything and reads its own slice, rather than the list correlating a key
   * with a matching fact shape — that correlation is what a mapped type cannot
   * express without a cast, and this is the same information with none of it.
   *
   * The date formatters are passed in rather than imported so this file stays
   * free of `date-fns` and reads as copy.
   */
  describe: (
    facts: AttentionFacts,
    format: SubtitleFormatters
  ) => { count: number; title: string; subtitle: string | null }
}

/** In the order the export lays the four cards out. */
export const attentionQueues: AttentionQueue[] = [
  {
    key: "coursesAwaitingReview",
    icon: BookOpenTextIcon,
    tone: "info",
    // The review queue's own tab, for the reason the instructor-applications
    // row gives: the Courses page's "In review" filter is already this list.
    href: "/dashboard/admin/courses?tab=in-review",
    built: true,
    describe: ({ coursesAwaitingReview: queue }, format) => ({
      count: queue.count,
      title: `${queue.count} ${
        queue.count === 1 ? "course" : "courses"
      } awaiting review`,
      subtitle: queue.oldestSubmittedAt
        ? `Oldest submitted ${format.relative(queue.oldestSubmittedAt)}`
        : null,
    }),
  },

  {
    key: "instructorApplications",
    icon: PresentationIcon,
    tone: "violet",
    // A *filtered* view of a page rather than a queue page of its own: the
    // Users table's Pending instructors tab is already the list of people
    // waiting on a decision, so a second surface showing the same rows would
    // be one to keep in step for no gain. The tab value has to match
    // `UsersTab` exactly — `parseUsersQuery` falls back to "all" for anything
    // it doesn't recognise, which would land the chevron on an unfiltered
    // table and quietly lose the point of the link.
    href: "/dashboard/admin/users?tab=pending-instructors",
    built: true,
    describe: ({ instructorApplications: queue }, format) => ({
      count: queue.count,
      title: `${queue.count} instructor application${
        queue.count === 1 ? "" : "s"
      }`,
      // The export's line is "All submitted this week", which is only worth
      // saying while it is true; otherwise fall back to the oldest one's age,
      // the same shape the review queue above uses.
      subtitle: queue.allThisWeek
        ? "All submitted this week"
        : queue.oldestCreatedAt
          ? `Oldest submitted ${format.relative(queue.oldestCreatedAt)}`
          : null,
    }),
  },

  {
    key: "reportedReviews",
    icon: StarIcon,
    tone: "star",
    href: "/dashboard/admin/reviews",
    built: false,
    describe: ({ reportedReviews: queue }) => ({
      count: queue.count,
      title: `${queue.count} reported review${queue.count === 1 ? "" : "s"}`,
      // Who filed them is the useful half: a queue flagged by instructors is a
      // different morning's work from one flagged by learners.
      subtitle:
        queue.count === 0
          ? null
          : queue.byOthers === 0
            ? "Flagged by instructors"
            : queue.byInstructors === 0
              ? "Flagged by learners"
              : "Flagged by instructors and learners",
    }),
  },

  {
    key: "failedPayouts",
    icon: WalletIcon,
    tone: "danger",
    href: "/dashboard/admin/reports",
    // The Reports page ships, so this queue's chevron leads somewhere real —
    // its payout-runs table is where a failed transfer is actually inspected.
    built: true,
    describe: ({ failedPayouts: queue }, format) => ({
      count: queue.count,
      title: `${queue.count} failed payout${queue.count === 1 ? "" : "s"}`,
      subtitle: queue.retryScheduledFor
        ? `Retry scheduled for ${format.shortDate(queue.retryScheduledFor)}`
        : "No retry run scheduled",
    }),
  },
]

// ---------------------------------------------------------------------------
// Top courses platform-wide
// ---------------------------------------------------------------------------

/**
 * Course art, keyed off the category the row belongs to.
 *
 * The export draws photographs. This uses the per-category gradient + icon the
 * rest of the app uses — see `lumen-course-card-art` in `CLAUDE.md`: real
 * images arrive through instructor uploads, not a stock-photo integration, so
 * there is nothing to render here yet. `Category.accentColor` picks the
 * gradient and the slug picks the glyph, both from the row rather than from a
 * position in a list, so a new category gets a sensible default instead of a
 * blank tile.
 */
export const categoryGradients: Record<string, string> = {
  blue: "from-accent-2 to-accent-3",
  violet: "from-accent-1 to-accent-2",
  cyan: "from-accent-3 to-accent-2",
  green: "from-success to-accent-3",
  amber: "from-warning to-star",
  red: "from-destructive to-warning",
}

export const FALLBACK_CATEGORY_GRADIENT = "from-accent-1 to-accent-3"

export const categoryIcons: Record<string, LucideIcon> = {
  development: Code2Icon,
  design: PaletteIcon,
  "data-ai": BrainCircuitIcon,
  business: BriefcaseIcon,
  marketing: MegaphoneIcon,
  "personal-development": SproutIcon,
  finance: LineChartIcon,
}

/** The glyph the admin Categories page itself uses for every category. */
export const FALLBACK_CATEGORY_ICON = LayoutGridIcon
