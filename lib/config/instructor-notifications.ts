/**
 * Everything `/dashboard/instructor/settings/notifications` *says*.
 *
 * **The layout is shared; the options are not.** The card, the "Notify me
 * about…" radio over a stack of toggle rows and the submit are all the
 * arrangement `notification-settings-page.png` draws — one notification layout
 * across the student, instructor and admin modes. What is *inside* it is this
 * mode's own: the learner's rows are about the courses they take, which say
 * nothing about running a teaching business.
 *
 * **The four rows are the INSTRUCTOR categories in
 * `lib/config/notification-feed.ts`** — Courses, Students, Community,
 * Earnings. That is the principled source rather than an invented list, and it
 * is the same move `adminEmailNotifications` makes against the console's
 * attention queues: this page decides what an instructor is *emailed* about
 * and the feed is what actually happened, so if the two carried different
 * vocabularies an instructor could switch a category off and still not explain
 * why it kept arriving.
 *
 * That list's fifth category, **Messages, is the radio's middle option rather
 * than a fifth switch** — exactly how the learner's page treats its own
 * `DIRECT_MESSAGES`, and what the export draws.
 *
 * A config module rather than literals in the form, for the reason
 * `lib/config/notifications.ts` gives: each `name` is also the `User` column
 * the action writes, which is what lets both sides derive from one list.
 */

/**
 * The three "Notify me about…" options, in the order the radio draws them.
 *
 * **The values are `NotifyAbout`'s, not a third enum.** Unlike the admin —
 * whose middle option is NEEDS_ACTION, a thing only a platform operator has —
 * these three mean the same to an instructor as to a learner, so the schema
 * reuses the type and only the *column* is separate. See the enum's own note.
 * The labels are the export's own words, which read correctly for somebody
 * being messaged and mentioned by their students.
 */
export const instructorNotifyAboutOptions = [
  { value: "ALL_ACTIVITY", label: "All new activity" },
  { value: "DIRECT_MESSAGES", label: "Direct messages and mentions" },
  { value: "NOTHING", label: "Nothing" },
] as const

export type InstructorNotifyAboutValue =
  (typeof instructorNotifyAboutOptions)[number]["value"]

export const instructorNotifyAboutValues = new Set<string>(
  instructorNotifyAboutOptions.map((option) => option.value)
)

/**
 * The email switches. `name` is both the `User` column and the form field.
 *
 * **`securityEmails` is the learner's own column, reused rather than
 * duplicated** — the call `adminEmailNotifications` already made. It is about
 * the account itself, which everybody has regardless of role, so an
 * `instructorSecurityEmails` beside it would be two switches over one concern
 * and a mailer would have to guess which to honour. The four above it are
 * teaching-only and carry the `instructor` prefix that says so.
 */
export const instructorEmailNotifications = [
  {
    name: "instructorCourseEmails",
    title: "Course emails",
    description:
      "Review decisions, approvals, and status changes on the courses you teach.",
  },
  {
    name: "instructorStudentEmails",
    title: "Student emails",
    description: "New enrolments, questions, and reviews from your students.",
  },
  {
    name: "instructorCommunityEmails",
    title: "Community emails",
    description: "Replies and mentions in discussions on your courses.",
  },
  {
    name: "instructorEarningEmails",
    title: "Earnings emails",
    description: "Sales, payouts, and failed transfers.",
  },
  {
    name: "securityEmails",
    title: "Security emails",
    description: "Sign-ins from new devices and changes to your own account.",
  },
] as const

export type InstructorEmailNotificationName =
  (typeof instructorEmailNotifications)[number]["name"]

/** The two section headings. The ellipsis is the export's own. */
export const instructorNotificationsHeadings = {
  notifyAbout: "Notify me about…",
  emails: "Email Notifications",
} as const

export const instructorNotificationsCopy = {
  submit: "Update notifications",
  saved: "Notification preferences updated.",
} as const
