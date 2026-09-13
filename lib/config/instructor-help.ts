import {
  BadgeCheckIcon,
  BookOpenIcon,
  RocketIcon,
  TicketPercentIcon,
  UsersRoundIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

/**
 * Every word `ui-design/light/dashboard/instructor/instructor-help-center-page.png`
 * says, plus the two things it cannot: the answers to the four questions it
 * draws collapsed, and the facts those answers quote.
 *
 * The split is the one `admin-overview.ts` established — the figures come from
 * the database, the phrasing around them is copy. Here that matters more than
 * usual, because a help page is where a platform states its own rules: a
 * revenue share or a payout threshold written into a sentence here would be a
 * second source of truth, free to drift from the one the money actually runs
 * on. So the sentences take the facts as an argument and the route reads them
 * — see `HelpFacts` and `instructorFaqs`.
 *
 * No `lib/db` import, so the client composer can hold this module without
 * dragging the Postgres driver into the browser bundle — the rule
 * `admin-users.ts` records.
 */

export type HelpTopic = {
  /** Matches `HelpArticle.categorySlug`, which is what makes the count real. */
  slug: string
  title: string
  description: string
  icon: LucideIcon
}

/**
 * The six cards under "Browse by topic", in the order the export lays them out.
 *
 * **The article counts are no longer written here.** They were the export's
 * own figures while there was nothing to count; now that
 * `lib/config/instructor-help-articles.ts` exists they are derived from it, so
 * the card cannot advertise sixteen articles and open onto two. The drawn
 * numbers (7/16/12/9/8/6) are therefore not reproduced — the same reading the
 * categories page's percentages and the community tiles settled, that a real
 * figure beats a mock one.
 */
export const helpTopics: HelpTopic[] = [
  {
    slug: "becoming-an-instructor",
    title: "Becoming an instructor",
    description:
      "Course requirements, the review process, and publishing your first course.",
    icon: RocketIcon,
  },
  {
    slug: "course-creation",
    title: "Course creation",
    description:
      "Building a curriculum, lesson types, quizzes, and reordering content.",
    icon: BookOpenIcon,
  },
  {
    slug: "teaching-and-students",
    title: "Teaching & students",
    description:
      "Answering Q&A, running discussions, and keeping cohorts engaged.",
    icon: UsersRoundIcon,
  },
  {
    slug: "earnings-and-payouts",
    title: "Earnings & payouts",
    description: "Revenue share, payout schedule, and fixing a failed payout.",
    icon: WalletIcon,
  },
  {
    slug: "pricing-and-coupons",
    title: "Pricing & coupons",
    description: "Setting a list price and running promotions that convert.",
    icon: TicketPercentIcon,
  },
  {
    slug: "policies-and-standards",
    title: "Policies & standards",
    description:
      "Content rights, accuracy rules, and how review disputes work.",
    icon: BadgeCheckIcon,
  },
]

/**
 * The facts the answers quote, read per request rather than written down here.
 *
 * `revenueSharePercent` and `supportEmail` come from the `PlatformSetting`
 * singleton an admin edits at `/dashboard/admin/settings/platform`; the two
 * payout figures are the signed-in instructor's own columns, which
 * `payout-settings-page.png` draws as their editable schedule. So the page
 * answers for *this* instructor under *today's* rules, and an admin changing
 * the default share changes this sentence with it.
 */
export type HelpFacts = {
  revenueSharePercent: number
  payoutDayOfMonth: number
  /** Already formatted as currency by the route — see `formatMoney`. */
  minimumPayout: string
  supportEmail: string
}

export type HelpFaq = { question: string; answer: string }

/** "1" -> "1st". The payout day is editable, so it cannot be spelled out. */
function ordinal(day: number): string {
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : (["th", "st", "nd", "rd"][day % 10] ?? "th")
  return `${day}${suffix}`
}

/**
 * The five questions, in the export's order.
 *
 * Only the first answer is drawn — the export shows that row open and the
 * other four collapsed — so the remaining four are written here against rules
 * the codebase already enforces rather than invented:
 *
 *  - the share, and that it is snapshotted per sale, is
 *    `OrderItem.revenueShareBps`' own docstring;
 *  - the payout schedule is `Instructor.payoutDayOfMonth` /
 *    `minimumPayoutCents`, whose note says the marketing page's "Monthly
 *    payouts from $100" is the same rule stated once;
 *  - "clears within 30 days" is `InstructorEarning.clearsAt`;
 *  - the review answer is `admin-reviews.ts`' own stated principle, so the
 *    moderation queue and this page cannot promise instructors two different
 *    things.
 */
export function instructorFaqs(facts: HelpFacts): HelpFaq[] {
  return [
    {
      question: "How long does course review take?",
      answer:
        "Up to two business days. You can keep editing while a course is in review — your changes are picked up when it is approved.",
    },
    {
      question: "What revenue share do I earn?",
      answer: `You keep ${facts.revenueSharePercent}% of each sale. The rate is recorded on the order at the moment of purchase, so a later change to the platform default never re-prices something you have already earned on.`,
    },
    {
      question: "When are payouts sent?",
      answer: `Earnings clear about 30 days after the sale, then join your next run — the ${ordinal(facts.payoutDayOfMonth)} of each month, provided your available balance has reached ${facts.minimumPayout}. A balance below that rolls over rather than being lost, and a failed transfer is retried on the following run.`,
    },
    {
      question: "Can I remove a negative review?",
      answer:
        "No. Reviews are never removed for being critical — only for breaking the guidelines. If one does break them, report it and a moderator will decide; otherwise the better answer is to reply to it, which every reader of the review will see.",
    },
    {
      question: "Can I change my course price after launch?",
      answer:
        "Yes, and a new list price applies to future orders only — nobody is charged again and nobody is refunded the difference. Promotions work alongside it: a platform-wide sale discounts your current list price for as long as it runs, and you can opt a course out of those in its pricing settings.",
    },
  ]
}

/** The hero, the two section headings, and the two cards at the foot. */
export const instructorHelpCopy = {
  title: "How can we help?",
  lead: "Guides for building, publishing, and growing your courses on Lumen.",
  searchPlaceholder: "Search help articles...",
  topicsHeading: "Browse by topic",
  faqHeading: "Frequently asked",
  articles: (count: number) => `${count} article${count === 1 ? "" : "s"}`,
  noResults: "No help articles matched that search.",
  noResultsHint: "Try a shorter phrase, or ask support below.",
  support: {
    title: "Still stuck?",
    description: "Our support team replies within one business day.",
    action: "Contact support",
    /** Prefilled so a reply thread starts with the surface it came from. */
    subject: "Instructor support request",
  },
  community: {
    title: "Ask the community",
    description:
      "Instructors and learners answer questions in Discussions every day.",
    action: "Open Discussions",
    /** Shown on the button while the Discussions route is still unbuilt. */
    unavailable: "Discussions is coming soon",
  },
} as const
