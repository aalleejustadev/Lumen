import {
  BellIcon,
  BookOpenTextIcon,
  ChartLineIcon,
  CirclePlusIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  MailIcon,
  MessageCircleQuestionMarkIcon,
  MessagesSquareIcon,
  SettingsIcon,
  StarIcon,
  TicketPercentIcon,
  UsersRoundIcon,
  WalletIcon,
} from "lucide-react"

import type {
  CommandPaletteItem,
  DashboardNavGroup,
} from "@/lib/config/dashboard"
import { instructorSettingsNav } from "@/lib/config/instructor-settings"

/**
 * The instructor workspace's navigation, from
 * `ui-design/light/dashboard/instructor/instructor-dashboard-sidebar.png`.
 *
 * A list of its own rather than a filter over `dashboardNav`, for the reason
 * `adminNav` gives about the console: the two shells share no rows at all. An
 * instructor in this mode is looking at what they *teach* — their courses,
 * their students' questions, their earnings — where the student shell is about
 * what they are learning. Browse Courses and Wishlist mean nothing here, and
 * Revenue & Payouts and Coupons mean nothing there.
 *
 * **The Student / Instructor switch above it *is* reproduced**, unlike the
 * admin console's — that is the whole point of the export. The console is a
 * privileged mode you leave through the account menu; these two are peer
 * workspaces belonging to the same person, and the switch is how you move
 * between them. See `workspaceModes`.
 *
 * **Every row here is `built` today**, Revenue & Payouts last; the only
 * `built: false` left in this file is on three of the Settings children.
 *
 * The flag stays on the type, and every row keeps it spelled out, for the
 * reason it was added: it **defaults to *built***, so a row written without
 * it silently renders as a live link onto a 404 — which is exactly what
 * happened on the first pass. A row listed before its route exists renders as
 * inert text instead, the treatment `settingsNav` and `adminNav` use, and the
 * hrefs here are what those routes must be called so the sidebar and the
 * pages cannot invent two spellings.
 */
export const instructorNav: DashboardNavGroup[] = [
  {
    title: "Teach",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard/instructor",
        icon: LayoutDashboardIcon,
        built: true,
      },
      {
        // Real: `Course` already carried every column
        // `my-courses-page.png` asks for, so the surface needed no migration
        // — see `lib/instructor-courses.ts`. It carries no badge: a count of
        // your own courses is not work waiting on anybody.
        title: "My Courses",
        href: "/dashboard/instructor/courses",
        icon: BookOpenTextIcon,
        built: true,
      },
      {
        // The one row the export tags rather than counts — a green outlined
        // "New" pill, which is a label on the row and not work waiting. See
        // `DashboardNavItem.tag`.
        title: "Create Course",
        href: "/dashboard/instructor/courses/new",
        icon: CirclePlusIcon,
        built: true,
        tag: "New",
      },
    ],
  },
  {
    title: "Audience",
    items: [
      {
        title: "Students",
        href: "/dashboard/instructor/students",
        icon: UsersRoundIcon,
      },
      {
        // Real: `CourseReview`, `CourseReviewReply` and `ContentReport` were
        // already shaped for `reviews-page.png`, so the surface needed no
        // migration — see `lib/instructor-reviews.ts`. No badge, because the
        // sidebar export draws none on this row: unreplied reviews are work
        // waiting, but they are not urgent the way an unanswered question is,
        // and the manage page's own Reviews row already counts them per
        // course.
        title: "Reviews",
        href: "/dashboard/instructor/reviews",
        icon: StarIcon,
        built: true,
      },
      {
        // Placeholder counts, exactly as drawn — the same posture the student
        // sidebar's Discussions and Messages are still in. They become real
        // the way Wishlist's did: counted in the layout and passed down
        // through `navCounts`, keyed by href.
        // Real: `CourseQuestion` and its two siblings were already shaped for
        // `Q&A-page.png`, so the surface needed no migration — see
        // `lib/qa.ts`. The badge is real too, and counted in
        // `app/(instructor)/layout.tsx`: questions in this instructor's
        // courses with no instructor answer yet, which is work waiting on
        // them rather than a total.
        title: "Q&A",
        href: "/dashboard/instructor/qa",
        icon: MessageCircleQuestionMarkIcon,
        built: true,
      },
      {
        // Real: `CommunityTopic`, `Discussion` and `DiscussionLike` were
        // already shaped for `discussions-page.png`, so the surface needed no
        // migration — see `lib/discussions.ts`. The placeholder badge is gone
        // with it; nothing counts unread threads, and a count of threads is
        // not work waiting on anybody.
        title: "Discussions",
        href: "/dashboard/instructor/discussions",
        icon: MessagesSquareIcon,
        built: true,
      },
    ],
  },
  {
    title: "Business",
    items: [
      {
        // Real: `Enrollment` already carries `createdAt`, `source`,
        // `completedAt`, `lastAccessedAt` and `progressPercent`, so the
        // surface needed no migration — see `lib/instructor-analytics.ts`. No
        // badge: nothing on that page is work waiting on anybody, and the
        // sidebar export draws none.
        title: "Analytics",
        href: "/dashboard/instructor/analytics",
        icon: ChartLineIcon,
        built: true,
      },
      {
        // Real: `InstructorEarning`, `Payout` and `PayoutMethod` were already
        // shaped for `revenue-page.png` — `clearsAt`'s own docstring names the
        // page's "clears within 30 days" and `Payout`'s names its `PO-10428` —
        // so the surface needed no migration. See `lib/instructor-revenue.ts`.
        // No badge: a balance is not work waiting on anybody, and the sidebar
        // export draws none.
        title: "Revenue & Payouts",
        href: "/dashboard/instructor/revenue",
        icon: WalletIcon,
        built: true,
      },
      {
        // Real: `Coupon` and `CouponRedemption` were already shaped for
        // `coupons-page__main.png`, so the surface needed only a
        // `discountType` column — see `lib/instructor-coupons.ts`. It carries
        // no badge: a count of discount codes is not work waiting on anybody.
        title: "Coupons",
        href: "/dashboard/instructor/coupons",
        icon: TicketPercentIcon,
        built: true,
      },
    ],
  },
  {
    title: "General",
    items: [
      {
        // Real: the inbox is audience-parameterised the way the feed is, so
        // this mode's threads come out of the same query path as the
        // learner's — see `lib/messages.ts`. The badge is counted in
        // `app/(instructor)/layout.tsx`; the placeholder `badge` is gone with
        // it, because a row with a real source must not also carry a number
        // nobody counted.
        title: "Messages",
        href: "/dashboard/instructor/messages",
        icon: MailIcon,
        built: true,
      },
      {
        // Real: the feed is already audience-parameterised, so this mode's
        // rows come out of the same query path as the learner's and the
        // console's — see `lib/config/notification-feed.ts`, whose INSTRUCTOR
        // category vocabulary was written before this route existed. The
        // badge is counted in `app/(instructor)/layout.tsx`.
        title: "Notifications",
        href: "/dashboard/instructor/notifications",
        icon: BellIcon,
        built: true,
      },
      {
        // The chevron row, as in both other sidebars. Its four sections are
        // the four instructor settings exports — `profile-page.png`,
        // `account-page.png`, `payout-settings-page.png` and
        // `notification-settings-page.png` — and they point at this mode's own
        // `/dashboard/instructor/settings/*` rather than the learner's: those
        // pages live in the other shell and would drop you out of this mode,
        // which is exactly the leak this whole arrangement exists to prevent.
        //
        // The children are **derived from `instructorSettingsNav`** rather
        // than listed again here, so the sidebar and the sections card on
        // `/dashboard/instructor/settings/profile` cannot disagree about what
        // the sections are or where they live — the arrangement
        // `lib/config/dashboard.ts` already has with `settingsNav`. Profile is
        // built; the other three carry their own `built: false` and render as
        // inert sub-rows, which is why the parent row is live while three
        // quarters of it is still to come.
        title: "Settings",
        href: "/dashboard/instructor/settings",
        icon: SettingsIcon,
        built: true,
        items: instructorSettingsNav.map(({ title, href, built }) => ({
          title,
          href,
          built,
        })),
      },
      {
        title: "Help Center",
        href: "/dashboard/instructor/help",
        icon: LifeBuoyIcon,
        built: true,
      },
    ],
  },
]

/**
 * Live counts for the rows that have a real source, keyed by href — the
 * arrangement `navCounts` has in the student shell and `adminNavCounts` in the
 * console, so the *layout* decides which rows carry a real number and anything
 * unlisted keeps its placeholder from the list above.
 */
export function instructorNavCounts(
  /** Unread rows in the instructor's own feed — see `getUnreadCount`. */
  unreadNotifications = 0,
  /** Unread messages in the threads about courses this account teaches — see
   *  `getUnreadMessageCount`. */
  unreadMessages = 0,
  /** Questions in this instructor's courses still awaiting an answer — see
   *  `getUnansweredQuestionCount`. */
  unansweredQuestions = 0
): Record<string, number> {
  // Omitted at zero rather than passed as 0: `NavRow` draws a badge for any
  // number it is given, and "0 unread" is noise.
  return {
    ...(unreadNotifications > 0
      ? { "/dashboard/instructor/notifications": unreadNotifications }
      : {}),
    ...(unreadMessages > 0
      ? { "/dashboard/instructor/messages": unreadMessages }
      : {}),
    ...(unansweredQuestions > 0
      ? { "/dashboard/instructor/qa": unansweredQuestions }
      : {}),
  }
}

/**
 * The ⌘K palette in instructor mode. Derived from `instructorNav` rather than
 * written out again, and filtered to rows that actually go somewhere — a
 * palette entry onto a 404 is the thing the inert sidebar row exists to avoid.
 * It grows on its own as `built` flags flip.
 *
 * It offers only this mode's pages for the reason the console's does: jumping
 * to My Learning from in here would silently drop you back into the student
 * shell.
 */
export const instructorCommandPaletteGroups: {
  title: string
  items: CommandPaletteItem[]
}[] = [
  {
    title: "Go to",
    items: instructorNav
      .flatMap((group) => group.items)
      .filter((item) => item.built ?? true)
      .map(({ title, href, icon }) => ({ title, href, icon })),
  },
]

/** The mode's landing page — where the workspace switch drops you. */
export const INSTRUCTOR_HOME = "/dashboard/instructor"

/**
 * What the page says. Kept here rather than in the component for the reason
 * `admin-overview.ts` gives: the numbers come from the database, the phrasing
 * around them is copy.
 */
export const instructorOverviewCopy = {
  title: "Overview",
  /** The pill beside the title in `instructor-dashboard.png`, the sibling of
   *  the student Overview's "Student mode" and the console's "Admin mode". */
  modeBadge: "Instructor mode",
} as const
