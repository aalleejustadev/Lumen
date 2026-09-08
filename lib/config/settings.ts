import {
  BellIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react"

export type SettingsNavItem = {
  title: string
  href: string
  icon: LucideIcon
  /**
   * False until the route exists. `settings-nav.tsx` renders an unbuilt row
   * as inert text rather than a `Link`, so the card can show the export's
   * four sections without three of them landing on a 404.
   */
  built: boolean
}

/**
 * The four rows in the settings nav card, from
 * `ui-design/light/dashboard/student/setting-profile-page.png`.
 *
 * This is the single source for them: `lib/config/dashboard.ts` builds the
 * sidebar's `Settings` children from this list, so the card and the sidebar
 * cannot drift — the same reason `lib/config/site.ts` owns the marketing nav
 * instead of the header component.
 *
 * Profile and Account are built. Billing and Notifications have exports of
 * their own (`settings-{billing,notifications}-page.png`) and are listed here
 * so their place in the information architecture is settled; flip `built` to
 * `true` as each route lands.
 */
export const settingsNav: SettingsNavItem[] = [
  {
    title: "Profile",
    href: "/dashboard/settings/profile",
    icon: UserRoundIcon,
    built: true,
  },
  {
    title: "Account",
    href: "/dashboard/settings/account",
    icon: ShieldCheckIcon,
    built: true,
  },
  {
    title: "Billing",
    href: "/dashboard/settings/billing",
    icon: CreditCardIcon,
    built: false,
  },
  {
    // Notification *preferences*, which is a different page from the
    // `/dashboard/notifications` feed the sidebar's General group links to —
    // `notifications-page.png` and `settings-notifications-page.png` draw two
    // different screens.
    title: "Notifications",
    href: "/dashboard/settings/notifications",
    icon: BellIcon,
    built: false,
  },
]

/** Copy for the page heading above the two columns. */
export const settingsHeading = {
  title: "Settings",
  description: "Manage your account settings and set e-mail preferences.",
} as const

/** `User.name` on the account page — the string the chrome and email render. */
export const MAX_NAME_LENGTH = 100

/**
 * The floor `updateAccount` enforces on a submitted date of birth. Thirteen is
 * the usual line for an account someone signs up for themselves; the field is
 * still optional, so this only bites once a date is actually entered.
 */
export const MIN_AGE_YEARS = 13

/** How many URLs the profile form will let you add. */
export const MAX_PROFILE_URLS = 5

/** Bio length the textarea and `updateProfile` both enforce. */
export const MAX_BIO_LENGTH = 400

/** The window the Username field's own help text promises. */
export const USERNAME_CHANGE_DAYS = 30

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30

/**
 * Avatar upload limits. They live here rather than in `lib/storage.ts`
 * because the file picker in `avatar-upload.tsx` needs the MIME list and
 * that module is `server-only` — importing it from a Client Component is a
 * build error, which is exactly what happened the first time these were
 * defined next to the S3 client.
 */
export const AVATAR_MAX_BYTES = 4 * 1024 * 1024

export const AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const
