import type { CoursesQuery, CoursesTab } from "@/lib/admin/courses"
import type { ChangeReason, CourseStatus } from "@/lib/generated/prisma/client"

/**
 * Everything `/dashboard/admin/courses` and `/dashboard/admin/courses/[slug]`
 * *say*, and nothing they count — the same split the other console pages make.
 *
 * It also carries the page size and the client-safe helpers, for the
 * mechanical reason `admin-users.ts` records: the list is a Client Component
 * and needs them, and importing any *value* from `lib/admin/courses.ts` would
 * pull `lib/db` and the Postgres driver into the browser bundle. This module
 * imports nothing but types, so it crosses freely.
 */

/** Six rows, which is what the export draws. */
export const COURSES_PAGE_SIZE = 6

export const adminCoursesCopy = {
  title: "Courses",
  description:
    "Approve submissions, request changes, and manage the live catalog.",
  emptyTitle: "Nothing here",
  emptyDescription:
    "No course has this status right now. Try a different filter.",
  clearFilters: "Show all courses",
  approve: "Approve",
  requestChanges: "Request changes",
  view: "View",
  /** The line under the list, the shape the Users table's own footer uses. */
  showing: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total} ${total === 1 ? "course" : "courses"}`,
} as const

/**
 * The filter row.
 *
 * **The export draws no filter row**, and this is a deliberate addition. Its
 * own six rows are a sample; the real table is every course that was ever
 * submitted, which is already 26 and only grows — and the page's first job,
 * the one the sidebar badge points at, is "what is waiting on me?". Paging
 * through the whole catalog to be sure you have seen every submission is not
 * that. It is the same reasoning the audit log's tab counts record, in the
 * same vocabulary the Users page uses, so the console stays one design.
 */
export const courseTabs: { value: CoursesTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in-review", label: "In review" },
  { value: "needs-changes", label: "Needs changes" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
]

export function isCoursesFiltered(query: CoursesQuery): boolean {
  return query.tab !== "all"
}

export type Badge = { label: string; className: string }

/**
 * The status pill. Tints are a tenth-opacity semantic token behind that same
 * token as the text, rather than the export's literal hexes, so dark mode
 * follows — the choice `billing-transactions.tsx` documents. Sampled off the
 * export: In review is the blue `--accent-2`, Needs changes the amber
 * `--warning`, Published `--success`, Rejected `--destructive`.
 *
 * DRAFT never reaches the page (the query excludes it) and ARCHIVED is the one
 * state the export does not draw — it takes the neutral tint, because an
 * archived course is not a problem, it is simply no longer on sale.
 */
export function courseStatusBadge(status: CourseStatus): Badge {
  switch (status) {
    case "IN_REVIEW":
      return { label: "In review", className: "bg-accent-2/10 text-accent-2" }
    case "NEEDS_CHANGES":
      return {
        label: "Needs changes",
        className: "bg-warning/10 text-warning",
      }
    case "PUBLISHED":
      return { label: "Published", className: "bg-success/10 text-success" }
    case "REJECTED":
      return {
        label: "Rejected",
        className: "bg-destructive/10 text-destructive",
      }
    case "ARCHIVED":
      return { label: "Archived", className: "bg-hover text-muted-foreground" }
    default:
      return { label: "Draft", className: "bg-hover text-muted-foreground" }
  }
}

/**
 * Whether a course still has a decision waiting on it. Only an `IN_REVIEW`
 * course draws Approve and Request changes in the export — the other three
 * rows carry View alone, which is right: a decision has already been made, and
 * the way to revisit it is to open the course.
 */
export function awaitsDecision(status: CourseStatus): boolean {
  return status === "IN_REVIEW"
}

// ---------------------------------------------------------------------------
// Request changes
// ---------------------------------------------------------------------------

/**
 * The five checkboxes from `request-changes__dialog_admin.png`, in the order
 * it draws them. The values are `ChangeReason`, so the dialog and the column
 * cannot drift; the model's own note explains why it is an array rather than
 * one reason (the dialog allows any combination, and none of them is primary).
 */
export const changeReasonOptions: { value: ChangeReason; label: string }[] = [
  { value: "AUDIO_VIDEO_QUALITY", label: "Audio or video quality" },
  { value: "INCOMPLETE_CURRICULUM", label: "Incomplete curriculum" },
  { value: "MISSING_QUIZ_OR_PROJECT", label: "Missing quiz or project" },
  { value: "CONTENT_ACCURACY", label: "Content accuracy" },
  { value: "COPYRIGHT_CONCERN", label: "Copyright concern" },
]

export const changeReasonLabels: Record<ChangeReason, string> =
  Object.fromEntries(
    changeReasonOptions.map((option) => [option.value, option.label])
  ) as Record<ChangeReason, string>

export const requestChangesCopy = {
  title: "Request changes",
  /** The export's own sentence, with the two names filled in. */
  description: (course: string, instructor: string) =>
    `${course} goes back to ${instructor} as a draft. They can resubmit once addressed.`,
  reasonsHeading: "What needs to change?",
  noteHeading: "Notes for the instructor",
  notePlaceholder: "Be specific — what should they fix before resubmitting?",
  submit: "Send back to instructor",
} as const

/** How long a note to the instructor may be. */
export const NOTE_MAX_LENGTH = 1000

// ---------------------------------------------------------------------------
// The course view
// ---------------------------------------------------------------------------

export const courseViewCopy = {
  back: "Back to courses",
  checklistHeading: "Submission checklist",
  checklistEmpty:
    "This course has not been through review, so there is no checklist to show.",
  curriculumHeading: "Curriculum preview",
  curriculumEmpty: "This course has no lessons yet.",
  approve: "Approve & publish",
  requestChanges: "Request changes",
  reject: "Reject",
  /** The panel that appears once a course has been sent back or turned down. */
  decisionHeading: "Last decision",
  decisionLabels: {
    APPROVED: "Approved",
    CHANGES_REQUESTED: "Changes requested",
    REJECTED: "Rejected",
  } as Record<string, string>,
} as const
