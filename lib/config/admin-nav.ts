import {
  BookOpenTextIcon,
  ChartLineIcon,
  ChartNoAxesColumnIncreasingIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  MessagesSquareIcon,
  SettingsIcon,
  ShieldCheckIcon,
  StarIcon,
  TicketPercentIcon,
  UserRoundIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react"

import type { AttentionFacts } from "@/lib/admin/overview"
import type {
  CommandPaletteItem,
  DashboardNavGroup,
} from "@/lib/config/dashboard"

/**
 * The admin console's own navigation, from
 * `ui-design/light/dashboard/admin/admin-sidebar.png`.
 *
 * It is a separate list rather than a filter over `dashboardNav` because the
 * two shells share no rows at all: an admin in the console is looking at the
 * platform, not at their own learning, so Browse Courses / My Learning /
 * Wishlist have no meaning here and Users / Categories / Promotions have none
 * in the student shell.
 *
 * **The export's Student / Instructor switch is deliberately not reproduced.**
 * The admin console is its own mode — you leave it through "Exit admin mode"
 * in the account menu — so a workspace toggle in this sidebar would offer a
 * third, contradictory way out of it.
 *
 * Dashboard, Reports, Audit Log and Users exist today. Every other row
 * carries `built: false`, which makes `NavRow` render it as inert text instead
 * of a link onto a 404 — the same flag `settingsNav` and `attentionQueues`
 * use. Flip each one as its page lands. The hrefs are already the ones
 * `attentionQueues` points its chevrons at, so the two can't invent different
 * spellings for the same page.
 */
export const adminNav: DashboardNavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard/admin",
        icon: LayoutDashboardIcon,
        built: true,
      },
      {
        title: "Reports",
        href: "/dashboard/admin/reports",
        icon: ChartLineIcon,
        built: true,
      },
      {
        title: "Audit Log",
        href: "/dashboard/admin/audit-log",
        icon: ChartNoAxesColumnIncreasingIcon,
        built: true,
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        title: "Users",
        href: "/dashboard/admin/users",
        icon: UsersRoundIcon,
        built: true,
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        title: "Courses",
        href: "/dashboard/admin/courses",
        icon: BookOpenTextIcon,
        built: false,
      },
      {
        title: "Categories",
        href: "/dashboard/admin/categories",
        icon: LayoutGridIcon,
        built: false,
      },
      {
        title: "Reviews",
        href: "/dashboard/admin/reviews",
        icon: StarIcon,
        built: false,
      },
      {
        title: "Community",
        href: "/dashboard/admin/community",
        icon: MessagesSquareIcon,
        built: false,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Promotions",
        href: "/dashboard/admin/promotions",
        icon: TicketPercentIcon,
        built: false,
      },
      {
        // The one row with a chevron, same as Settings in the student
        // sidebar. Its four sections are the ones `platform-settings.png`
        // draws in its own nav card.
        title: "Platform Settings",
        href: "/dashboard/admin/settings",
        icon: SettingsIcon,
        built: false,
        items: [
          { title: "Profile", href: "/dashboard/admin/settings/profile" },
          { title: "Account", href: "/dashboard/admin/settings/account" },
          {
            title: "Platform Controls",
            href: "/dashboard/admin/settings/platform",
          },
          {
            title: "Notifications",
            href: "/dashboard/admin/settings/notifications",
          },
        ],
      },
    ],
  },
]

/**
 * The counts the export draws beside Users, Courses and Reviews — 4, 6 and 3,
 * which are exactly the Platform Overview queue sizes (4 instructor
 * applications, 6 courses awaiting review, 3 reported reviews). So they are
 * **work waiting on an admin**, not totals: 482,140 users would not fit in
 * that slot and would tell nobody anything.
 *
 * Keyed by href so the shell — not the sidebar — decides which rows carry a
 * real number, the same arrangement `navCounts` has in the student layout.
 */
export function adminNavCounts(facts: AttentionFacts): Record<string, number> {
  return {
    "/dashboard/admin/users": facts.instructorApplications.count,
    "/dashboard/admin/courses": facts.coursesAwaitingReview.count,
    "/dashboard/admin/reviews": facts.reportedReviews.count,
  }
}

/**
 * The ⌘K palette while in admin mode. Derived from `adminNav` rather than
 * written out again, and filtered to the rows that actually go somewhere —
 * a palette that jumps to an unbuilt page is the 404 the inert sidebar row
 * exists to avoid. It grows on its own as `built` flags flip.
 */
export const adminCommandPaletteGroups: {
  title: string
  items: CommandPaletteItem[]
}[] = [
  {
    title: "Go to",
    items: adminNav
      .flatMap((group) => group.items)
      .filter((item) => item.built ?? true)
      .map(({ title, href, icon }) => ({ title, href, icon })),
  },
]

/**
 * The account menu in admin mode, from `exit-admin-mode__admin.png`. Shorter
 * than the student shell's `accountMenu`: Billing, Notifications and Help
 * Center are learner surfaces, and the console is not the place to be sold a
 * plan. Profile and Account point at the admin's own settings pages, which is
 * where those rows go today — `/dashboard/admin/settings/*` is still to build.
 */
export const adminAccountMenu: {
  title: string
  href: string
  icon: LucideIcon
}[] = [
  {
    title: "Profile",
    href: "/dashboard/settings/profile",
    icon: UserRoundIcon,
  },
  {
    title: "Account",
    href: "/dashboard/settings/account",
    icon: ShieldCheckIcon,
  },
]

/** Where "Exit admin mode" drops you — the student shell's own landing page. */
export const EXIT_ADMIN_HREF = "/dashboard"
