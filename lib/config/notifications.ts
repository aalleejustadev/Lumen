/**
 * The copy and shape behind `/dashboard/settings/notifications`, from
 * `ui-design/light/dashboard/student/settings-notifications-page.png`.
 *
 * A config module rather than literals in the form, for the reason
 * `lib/config/settings.ts` gives: the field names here are also the keys the
 * Server Action reads out of `FormData` and the columns it writes, so a list
 * both sides derive from is what stops the two from drifting.
 */

/** The three "Notify me about…" options, in the export's order. */
export const notifyAboutOptions = [
  { value: "ALL_ACTIVITY", label: "All new activity" },
  { value: "DIRECT_MESSAGES", label: "Direct messages and mentions" },
  { value: "NOTHING", label: "Nothing" },
] as const

export type NotifyAboutValue = (typeof notifyAboutOptions)[number]["value"]

export const notifyAboutValues = new Set<string>(
  notifyAboutOptions.map((option) => option.value)
)

/**
 * The four "Email Notifications" switches. `name` is both the `User` column
 * and the form field, which is what lets the action loop over this list
 * instead of naming each toggle twice.
 */
export const emailNotifications = [
  {
    name: "courseEmails",
    title: "Course emails",
    description:
      "New lessons, quizzes, and deadlines in your enrolled courses.",
  },
  {
    name: "marketingEmails",
    title: "Marketing emails",
    description: "Receive emails about new courses, features, and offers.",
  },
  {
    name: "communityEmails",
    title: "Community emails",
    description: "Replies to your posts, mentions, and discussion activity.",
  },
  {
    name: "securityEmails",
    title: "Security emails",
    description: "Receive emails about your account activity and security.",
  },
] as const

export type EmailNotificationName = (typeof emailNotifications)[number]["name"]

/**
 * The two section headings, so the page's structure reads out of one place
 * alongside the rows it labels. The ellipsis is the export's own.
 */
export const notificationsHeadings = {
  notifyAbout: "Notify me about…",
  emails: "Email Notifications",
} as const
