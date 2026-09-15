import {
  AwardIcon,
  BellIcon,
  CompassIcon,
  CreditCardIcon,
  GraduationCapIcon,
  HeartIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  MailIcon,
  PresentationIcon,
  MessagesSquareIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react"

import { settingsNav } from "@/lib/config/settings"

export type DashboardNavItem = {
  title: string
  href: string
  icon: LucideIcon
  /** Placeholder counts from the export — real ones arrive with the data.
   *  Wishlist no longer has one: `wishlist_item` rows are real, so the layout
   *  counts them and passes the number down through `navCounts`. */
  badge?: number
  /**
   * A word rather than a count, drawn as an outlined pill at the trailing edge
   * of the row — the green **New** beside Create Course in
   * `instructor-dashboard-sidebar.png`. Separate from `badge` because the two
   * are different things in the same slot: a badge is a quantity of work
   * waiting, a tag is a label on the row itself, and only `badge` is ever
   * overridden by a live count from a layout.
   */
  tag?: string
  /**
   * A row with children, drawn with a chevron. `built` on a *child* is the
   * same flag as on the row itself and defaults to built — an unbuilt child
   * renders as an inert sub-row rather than a link onto a 404, which is what
   * lets a settings group ship one section at a time (the instructor's
   * Settings has Profile built and three to come). A child of an unbuilt
   * parent is inert whatever it says.
   */
  items?: { title: string; href: string; built?: boolean }[]
  /**
   * False when `href` has no route yet. `NavRow` renders such a row as inert
   * text rather than a link, the same treatment `settingsNav`'s own flag gives
   * an unbuilt settings section. Absent means built — every row in the student
   * sidebar is, so only `lib/config/admin-nav.ts` sets it today.
   */
  built?: boolean
}

export type DashboardNavGroup = {
  title: string
  items: DashboardNavItem[]
}

/** The sidebar's three groups, in the order the export lays them out. */
export const dashboardNav: DashboardNavGroup[] = [
  {
    title: "Learn",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboardIcon,
      },
      {
        title: "Browse Courses",
        href: "/dashboard/courses",
        icon: CompassIcon,
      },
      {
        title: "My Learning",
        href: "/dashboard/learning",
        icon: GraduationCapIcon,
      },
      {
        title: "Wishlist",
        href: "/dashboard/wishlist",
        icon: HeartIcon,
      },
      {
        title: "Certificates",
        href: "/dashboard/certificates",
        icon: AwardIcon,
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        // Real since `/dashboard/discussions` landed — it had been a live
        // link onto a 404. The placeholder `badge: 12` is gone with it:
        // nothing counts unread threads, and a count of threads is not work
        // waiting on anybody.
        title: "Discussions",
        href: "/dashboard/discussions",
        icon: MessagesSquareIcon,
      },
      {
        // Real, since `/dashboard/messages` landed: the badge is counted in
        // `app/(dashboard)/layout.tsx` and passed down through `navCounts`,
        // the way Wishlist's and Notifications' are. The placeholder `badge`
        // is gone with it — Discussions above still carries one, because
        // nothing counts that yet.
        title: "Messages",
        href: "/dashboard/messages",
        icon: MailIcon,
      },
    ],
  },
  {
    title: "General",
    items: [
      {
        title: "Notifications",
        href: "/dashboard/notifications",
        icon: BellIcon,
      },
      {
        // The chevron in the export. The children are derived from
        // `settingsNav` rather than listed again here, so the sidebar and the
        // sections card on `/dashboard/settings/profile` cannot disagree about
        // what the settings sections are. (Its "Notifications" is
        // notification *preferences* — a different page from the
        // `/dashboard/notifications` feed above.)
        title: "Settings",
        href: "/dashboard/settings",
        icon: SettingsIcon,
        items: settingsNav.map(({ title, href }) => ({ title, href })),
      },
      {
        title: "Help Center",
        href: "/dashboard/help",
        icon: LifeBuoyIcon,
      },
    ],
  },
]

/**
 * The Student / Instructor switch above the navigation.
 *
 * Each mode carries the URL it lands on, because the switch is **navigation,
 * not a tab**: the two workspaces are separate route groups with separate
 * shells, separate navigation and separate permissions — `app/(dashboard)/`
 * and `app/(instructor)/` — so switching mode is a page load, and the mode you
 * are in is a fact about the URL rather than a piece of client state. That is
 * what makes it survive a reload, a shared link and the back button, and it is
 * the only arrangement in which "changing the tab changes the permissions" can
 * be true: a `useState` toggle cannot re-run a server-side guard.
 */
export const workspaceModes = [
  {
    value: "student",
    label: "Student",
    icon: GraduationCapIcon,
    href: "/dashboard",
  },
  {
    value: "instructor",
    label: "Instructor",
    icon: PresentationIcon,
    href: "/dashboard/instructor",
  },
] as const

export type WorkspaceMode = (typeof workspaceModes)[number]["value"]

export type CommandPaletteItem = {
  title: string
  href: string
  icon: LucideIcon
}

/**
 * The ⌘K palette's two groups, from `command-dialog.png`. "Go to" is the
 * sidebar's Learn + Community rows flattened into one list (Settings/Help
 * Center don't belong in a jump-to-page list); "Settings" is `accountMenu`'s
 * first four entries under their fuller command-palette phrasing.
 */
export const commandPaletteGroups: {
  title: string
  items: CommandPaletteItem[]
}[] = [
  {
    title: "Go to",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
      {
        title: "Browse Courses",
        href: "/dashboard/courses",
        icon: CompassIcon,
      },
      {
        title: "My Learning",
        href: "/dashboard/learning",
        icon: GraduationCapIcon,
      },
      { title: "Wishlist", href: "/dashboard/wishlist", icon: HeartIcon },
      {
        title: "Certificates",
        href: "/dashboard/certificates",
        icon: AwardIcon,
      },
      {
        title: "Discussions",
        href: "/dashboard/discussions",
        icon: MessagesSquareIcon,
      },
      { title: "Messages", href: "/dashboard/messages", icon: MailIcon },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        title: "Profile settings",
        href: "/dashboard/settings/profile",
        icon: UserRoundIcon,
      },
      {
        title: "Account settings",
        href: "/dashboard/settings/account",
        icon: ShieldCheckIcon,
      },
      {
        title: "Billing & plan",
        href: "/dashboard/settings/billing",
        icon: CreditCardIcon,
      },
      {
        title: "Notification preferences",
        href: "/dashboard/notifications",
        icon: BellIcon,
      },
    ],
  },
]

/** The account menu behind the sidebar footer's ⋮, per the export. */
export const accountMenu: { title: string; href: string; icon: LucideIcon }[] =
  [
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
    {
      title: "Billing",
      href: "/dashboard/settings/billing",
      icon: CreditCardIcon,
    },
    {
      title: "Notifications",
      href: "/dashboard/notifications",
      icon: BellIcon,
    },
    { title: "Help Center", href: "/dashboard/help", icon: LifeBuoyIcon },
  ]
