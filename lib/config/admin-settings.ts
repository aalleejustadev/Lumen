import {
  BellIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react"

/**
 * Everything `/dashboard/admin/settings/*` *says*, and nothing it reads — the
 * split every console page makes.
 *
 * It also carries the limits and the client-safe guards, for the mechanical
 * reason `admin-users.ts` records: the Platform Controls form is a Client
 * Component and needs all of them, and importing any *value* from
 * `lib/admin/settings.ts` would drag `lib/db` and the Postgres driver into
 * the browser bundle. This module imports nothing but icons, so it crosses
 * freely.
 *
 * **The section list is the same shape as `lib/config/settings.ts`'
 * `settingsNav`, deliberately not the same list.** The learner's four
 * sections are Profile / Account / Billing / Notifications; the admin's are
 * Profile / Account / Platform Controls / Notifications — an admin has no
 * billing of their own to manage, and a learner has no platform to control.
 * The two cards look identical and mean different things, so they are two
 * lists rather than one list with flags.
 */

export type AdminSettingsNavItem = {
  title: string
  href: string
  icon: LucideIcon
  /**
   * False until the route exists. `admin-settings-nav.tsx` renders an unbuilt
   * row as inert text rather than a `Link` onto a 404 — the same flag
   * `settingsNav`, `adminNav` and `attentionQueues` all use.
   */
  built: boolean
}

/**
 * The four rows in the sections card, from
 * `ui-design/light/dashboard/admin/platform-settings.png`.
 *
 * The hrefs are **not invented here** — `lib/config/admin-nav.ts` already
 * points the sidebar's Platform Settings children at these exact four paths,
 * so this list has to agree with that one or the sidebar and the card would
 * disagree about where a section lives.
 */
export const adminSettingsNav: AdminSettingsNavItem[] = [
  {
    title: "Profile",
    href: "/dashboard/admin/settings/profile",
    icon: UserRoundIcon,
    built: true,
  },
  {
    title: "Account",
    href: "/dashboard/admin/settings/account",
    icon: ShieldCheckIcon,
    built: true,
  },
  {
    title: "Platform Controls",
    href: "/dashboard/admin/settings/platform",
    icon: SettingsIcon,
    built: true,
  },
  {
    title: "Notifications",
    href: "/dashboard/admin/settings/notifications",
    icon: BellIcon,
    built: true,
  },
]

/** The heading above the two columns, shared by all four sections. */
export const adminSettingsHeading = {
  title: "Platform Settings",
  description: "Manage your admin account and control platform-wide settings.",
} as const

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * The admin profile card, from `platform-settings__profile.png`.
 *
 * **It is a much shorter form than the learner's**, and that is the export's
 * own reading rather than an omission: no username, no bio, no URL list. Those
 * three are the makings of a *public* profile page, and an admin has none —
 * which is exactly what the role callout at the foot of the card says out
 * loud ("Internal role — not shown on a public profile"). Full name and the
 * picture are the two things the console chrome actually renders.
 *
 * The **email help text is not the export's**. That one reads "You can manage
 * verified email addresses in your email settings", which points at a page
 * that does not exist — so the field is editable here, in every mode, and the
 * line says what changing it actually does.
 */
export const adminProfileCopy = {
  nameLabel: "Full name",
  nameDescription:
    "Shown in the admin console and on internal notifications only.",
  emailLabel: "Email",
  emailDescription:
    "Used to sign in. Changing it sends a confirmation link to your current address — the new one takes effect once you follow it.",
  roleTitle: "Platform Admin",
  roleDescription: "Internal role — not shown on a public profile.",
  submit: "Update profile",
} as const

// ---------------------------------------------------------------------------
// Platform Controls
// ---------------------------------------------------------------------------

export const platformControlsCopy = {
  title: "Platform Controls",
  description:
    "Levers that affect every user on Lumen. Change these with care.",

  brandingHeading: "Branding",
  brandingDescription:
    "Logo, favicon, accent colour, and how the site appears in search results.",
  uploadLogo: "Upload logo",
  uploadFavicon: "Upload favicon",
  accentLabel: "Accent colour",

  searchHeading: "Search appearance",
  searchDescription:
    "Used as the page title and meta description across the public site.",
  websiteTitleLabel: "Website title",
  metaDescriptionLabel: "Meta description",
  searchPreviewLabel: "Search preview",
  /** The host the preview draws under. Presentation, not a configured value. */
  searchPreviewHost: "lumen.co",

  /** The export's resting state; the form swaps it while a write is in flight. */
  autosaveIdle: "Changes save automatically",
  autosaveSaving: "Saving…",
  autosaveSaved: "Changes saved",
  autosaveError: "Couldn't save — try again",

  accessHeading: "Access & moderation",
  defaultsHeading: "Defaults",
  currencyLabel: "Platform currency",
  revenueShareLabel: "Default instructor revenue share",
  supportEmailLabel: "Support email",

  dangerHeading: "Danger zone",
} as const

/**
 * The four switches under "Access & moderation", in the drawn order.
 *
 * `name` **is** the `PlatformSetting` column, which is what lets the form
 * render the list and the action validate against it without either naming
 * the four twice — the arrangement `lib/config/notifications.ts` already uses
 * for the email toggles.
 */
export const platformToggles = [
  {
    name: "instructorApplicationsOpen",
    title: "Instructor applications",
    description: "Open — anyone can apply to teach on Lumen.",
  },
  {
    name: "newStudentSignupsOpen",
    title: "New student signups",
    description: "Open — new learners can create accounts.",
  },
  {
    name: "requireManualCourseReview",
    title: "Require manual course review",
    description: "Every submission needs admin approval before it goes live.",
  },
  {
    name: "autoEnrollNewCoursesInPromotions",
    title: "Auto-enroll new courses in promotions",
    description:
      "Default participation for instructors who haven't set a preference. They can still opt out per course.",
  },
] as const

export type PlatformToggleName = (typeof platformToggles)[number]["name"]

export const platformToggleNames = new Set<string>(
  platformToggles.map((toggle) => toggle.name)
)

/**
 * The one switch in the danger zone. Kept out of `platformToggles` because it
 * is drawn apart, tinted destructive, and — unlike the four above — is
 * confirmed before it is written. See `platform-controls-form.tsx`.
 */
export const maintenanceToggle = {
  name: "maintenanceMode",
  title: "Maintenance mode",
  description:
    "Signs everyone out and shows a maintenance page except for admins.",
  confirmTitle: "Turn on maintenance mode?",
  confirmDescription:
    "Every signed-in learner and instructor is signed out and sees a maintenance page until you turn this off. Admins keep their access.",
  confirmAction: "Turn on maintenance mode",
} as const

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/**
 * The six accent swatches, in the export's own order.
 *
 * The *classes* are not redefined here: `categoryAccentClasses` already maps
 * these six token names onto theme tokens, and `/dashboard/admin/categories`
 * draws the identical 34px swatch row from it. Two colour vocabularies for
 * one palette is exactly the drift `lib/config/site.ts` exists to prevent, so
 * this list is an ordering over that one rather than a copy of it. The
 * export's fifth swatch reads orange; `amber` is the token nearest it, which
 * is the reading the courses page's status pills already settled.
 */
export const PLATFORM_ACCENTS = [
  "violet",
  "blue",
  "cyan",
  "green",
  "amber",
  "red",
] as const

/** Google truncates a title past ~60 characters and a description past ~160. */
export const WEBSITE_TITLE_MAX = 60
export const META_DESCRIPTION_MAX = 160
export const SUPPORT_EMAIL_MAX = 254

/**
 * The currencies the platform can price in. Stored lowercase, which is the
 * casing Stripe expects on a `price_data.currency` — see
 * `lib/actions/checkout.ts`.
 */
export const platformCurrencies = [
  { value: "usd", label: "USD ($)" },
  { value: "eur", label: "EUR (€)" },
  { value: "gbp", label: "GBP (£)" },
  { value: "cad", label: "CAD ($)" },
  { value: "aud", label: "AUD ($)" },
] as const

export const platformCurrencyValues = new Set<string>(
  platformCurrencies.map((currency) => currency.value)
)

/**
 * The revenue splits the select offers, in **basis points** — the unit
 * `PlatformSetting.defaultRevenueShareBps` stores, because the value
 * multiplies money and a whole percent would round it.
 */
export const revenueShareOptions = [
  { value: 5000, label: "50%" },
  { value: 6000, label: "60%" },
  { value: 7000, label: "70%" },
  { value: 8000, label: "80%" },
  { value: 9000, label: "90%" },
] as const

export const revenueShareValues = new Set<number>(
  revenueShareOptions.map((option) => option.value)
)

/**
 * Branding upload limits. They live here rather than in `lib/storage.ts` for
 * the reason `lib/config/settings.ts` records for the avatar ones: the file
 * picker is a Client Component and that module is `server-only`, so importing
 * it from one is a build error.
 *
 * SVG is **not** accepted. An SVG is a document that can carry script, and
 * this one would be rendered on every public page of the site — the one
 * upload on the platform with that reach.
 */
export const BRANDING_MAX_BYTES = 2 * 1024 * 1024

export const BRANDING_MIME_TYPES = [
  "image/png",
  "image/webp",
  "image/jpeg",
  "image/x-icon",
  "image/vnd.microsoft.icon",
] as const

export type BrandingAssetKind = "logo" | "favicon"
