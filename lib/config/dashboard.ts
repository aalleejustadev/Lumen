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
  items?: { title: string; href: string }[]
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
        title: "Discussions",
        href: "/dashboard/discussions",
        icon: MessagesSquareIcon,
        badge: 12,
      },
      {
        title: "Messages",
        href: "/dashboard/messages",
        icon: MailIcon,
        badge: 5,
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

/** The Student / Instructor switch above the navigation. */
export const workspaceModes = [
  { value: "student", label: "Student", icon: GraduationCapIcon },
  { value: "instructor", label: "Instructor", icon: PresentationIcon },
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
