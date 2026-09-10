/**
 * The copy and shape behind `/dashboard/admin/settings/notifications`.
 *
 * **Same layout as the learner's, different options.** The card, the radio
 * group above a stack of toggle rows and the submit are all the arrangement
 * `notification-settings-page.png` draws, and that is deliberate — one
 * notification layout across the student, instructor and admin modes. What is
 * *inside* it is not shared: the learner's four rows are about their courses,
 * their marketing preferences and their discussions, none of which describe
 * the job of running the platform.
 *
 * The four rows here are **the console's own attention queues** — the same
 * four `attentionQueues` draws under "Needs your attention" on Platform
 * Overview. That is the principled source rather than an invented list: the
 * things worth emailing an admin about are exactly the things that page would
 * put in front of them, so the two cannot drift into different ideas of what
 * needs attention.
 *
 * A config module rather than literals in the form, for the reason
 * `lib/config/notifications.ts` gives: each `name` is also the `User` column
 * the action writes, which is what lets both sides derive from one list.
 */

/** The three "Notify me about…" options, in the order the radio draws them. */
export const adminNotifyAboutOptions = [
  { value: "ALL_ACTIVITY", label: "All platform activity" },
  { value: "NEEDS_ACTION", label: "Only items that need my action" },
  { value: "NOTHING", label: "Nothing" },
] as const

export type AdminNotifyAboutValue =
  (typeof adminNotifyAboutOptions)[number]["value"]

export const adminNotifyAboutValues = new Set<string>(
  adminNotifyAboutOptions.map((option) => option.value)
)

/**
 * The email switches. `name` is both the `User` column and the form field.
 *
 * **`securityEmails` is the learner's own column, reused rather than
 * duplicated.** It is about the account itself — a sign-in from a new device,
 * a password change — which everybody has regardless of role, so an
 * `adminSecurityEmails` beside it would be two switches over one concern and
 * a mailer would have to guess which to honour. The four above it are the
 * admin-only ones and carry the `admin` prefix that says so.
 */
export const adminEmailNotifications = [
  {
    name: "adminApplicationEmails",
    title: "Instructor applications",
    description: "A new application is waiting for your review.",
  },
  {
    name: "adminCourseReviewEmails",
    title: "Course submissions",
    description: "A course has been submitted and is awaiting approval.",
  },
  {
    name: "adminReportEmails",
    title: "Reported content",
    description: "A learner has reported a review or a discussion.",
  },
  {
    name: "adminPayoutEmails",
    title: "Payouts and refunds",
    description: "Payout runs, failed transfers, and refund activity.",
  },
  {
    name: "securityEmails",
    title: "Security emails",
    description: "Sign-ins from new devices and changes to your own account.",
  },
] as const

export type AdminEmailNotificationName =
  (typeof adminEmailNotifications)[number]["name"]

/** The two section headings. The ellipsis is the export's own. */
export const adminNotificationsHeadings = {
  notifyAbout: "Notify me about…",
  emails: "Email Notifications",
} as const

export const adminNotificationsCopy = {
  submit: "Update notifications",
  saved: "Notification preferences updated.",
} as const
