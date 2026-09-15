import {
  BellIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

/**
 * Everything `/dashboard/instructor/settings/*` *says*, and nothing it reads —
 * the split every surface in this app makes.
 *
 * **The section list is the same shape as `settingsNav` and
 * `adminSettingsNav`, deliberately not the same list.** The learner's four are
 * Profile / Account / Billing / Notifications and the admin's are Profile /
 * Account / Platform Controls / Notifications; an instructor has Payout
 * settings where the learner has Billing, because the money here moves the
 * other way. The three cards look identical and mean different things, so they
 * are three lists rather than one list with flags.
 */

export type InstructorSettingsNavItem = {
  title: string
  href: string
  icon: LucideIcon
  /**
   * False until the route exists. `settings-nav-card.tsx` renders an unbuilt
   * row as inert text rather than a `Link` onto a 404 — the same flag
   * `settingsNav`, `adminSettingsNav` and `instructorNav` all use. Profile is
   * the only one built today; the other three have exports of their own
   * waiting in `ui-design/light/dashboard/instructor/` (`account-page.png`,
   * `payout-settings-page.png`, `notification-settings-page.png`).
   */
  built: boolean
}

/**
 * The four rows in the sections card, from
 * `ui-design/light/dashboard/instructor/profile-page.png`.
 *
 * The hrefs agree with `lib/config/instructor-nav.ts`, which derives the
 * sidebar's Settings children from **this** list rather than repeating it —
 * so the card and the sidebar cannot disagree about where a section lives, the
 * arrangement `lib/config/dashboard.ts` already has with `settingsNav`.
 *
 * Account's icon is a shield rather than the export's scalloped badge: both
 * the learner's and the console's cards already draw `ShieldCheckIcon` against
 * exports that draw the same badge, and one glyph for "Account" across the
 * three modes beats matching this drawing alone.
 */
export const instructorSettingsNav: InstructorSettingsNavItem[] = [
  {
    title: "Profile",
    href: "/dashboard/instructor/settings/profile",
    icon: UserRoundIcon,
    built: true,
  },
  {
    title: "Account",
    href: "/dashboard/instructor/settings/account",
    icon: ShieldCheckIcon,
    built: false,
  },
  {
    title: "Payout settings",
    href: "/dashboard/instructor/settings/payouts",
    icon: WalletIcon,
    built: false,
  },
  {
    // Notification *preferences*, a different page from the
    // `/dashboard/instructor/notifications` feed in the sidebar's General
    // group — `notifications-page.png` and `notification-settings-page.png`
    // draw two different screens, the same pair the learner has.
    title: "Notifications",
    href: "/dashboard/instructor/settings/notifications",
    icon: BellIcon,
    built: false,
  },
]

/** The heading above the two columns, shared by all four sections. */
export const instructorSettingsHeading = {
  title: "Settings",
  description:
    "Manage your teaching account, payouts, and notification preferences.",
} as const
