import type { StudentsQuery } from "@/lib/instructor-students"

/**
 * Everything `/dashboard/instructor/students` *says*, and nothing it counts —
 * the split every surface in this codebase makes: the figures come out of
 * `lib/instructor-students.ts`, the phrasing around them lives here.
 *
 * It also carries the page size, the tab vocabulary and the client-safe
 * helpers, for the mechanical reason `instructor-courses.ts` records: the
 * board is a Client Component and needs all three, and importing any *value*
 * from `lib/instructor-students.ts` would drag `lib/db` and the Postgres
 * driver into the browser bundle. This module imports nothing but types, so it
 * crosses freely.
 */

/** Six rows — the export's own footer says "Showing 1–6 of 14 students". */
export const STUDENTS_PAGE_SIZE = 6

/**
 * How many people one **Message all** may reach.
 *
 * The button is drawn on a page whose headline says 1,500 students, and each
 * recipient is a `Conversation` plus a `Message` — so an uncapped version is a
 * request that writes three thousand rows and an inbox nobody asked for. The
 * cap is what makes it safe to offer at all, and the dialog states the real
 * number it will reach before the instructor commits rather than discovering
 * it afterwards. Raise it alongside a queue; this is a synchronous write.
 */
export const MESSAGE_ALL_LIMIT = 200

/** Rows in an **Export CSV**, for `admin-audit.ts`' reason: a silently
 *  truncated export is worse than none, so the toast says when it bit. */
export const STUDENTS_EXPORT_LIMIT = 5000

export const studentsCopy = {
  title: "Students",
  description:
    "Everyone enrolled in your courses — track progress and reach out when someone stalls.",
  exportCsv: "Export CSV",
  messageAll: "Message all",
  allCourses: "All courses",
  searchPlaceholder: "Search students...",
  /** The trailing icon button on a row. It is an icon in the export, so the
   *  label is its accessible name and its tooltip rather than visible text. */
  message: (name: string) => `Message ${name}`,
  /** A learner who has never opened the course. `Enrollment.lastAccessedAt` is
   *  null until they do, and "Never" is the honest reading — `longAgoPrecise`
   *  measured from the enrolment date would claim an activity that is really
   *  just the purchase. */
  neverActive: "Not started",
  lessons: (done: number, total: number) => `${done} / ${total} lessons`,
  showing: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total} ${total === 1 ? "student" : "students"}`,
  noMatches: "No student matches that filter.",
  empty: {
    title: "No students yet",
    description:
      "Everyone who enrols in one of your courses appears here, with how far they have got.",
  },
  exported: (rows: number) =>
    `Exported ${rows} ${rows === 1 ? "row" : "rows"}.`,
  exportTruncated: (rows: number) =>
    `Exported the first ${rows} rows — narrow the filter to export the rest.`,
} as const

export const studentStats = {
  total: "Total students",
  activeThisWeek: "Active this week",
  completion: "Completion rate",
  rating: "Avg. rating",
} as const

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export type StudentTab = "all" | "active" | "completed"

/**
 * The three tabs, exactly as drawn — and they are the same split as the row's
 * status pill, deliberately. **Active means "has not finished", not "was here
 * recently"**: the export puts an Active pill on a row last seen a month ago,
 * which only reads as in-progress. That keeps one word meaning one thing on
 * this page, and it is why "Active this week" above is worded as a window
 * rather than reusing the bare word.
 */
export const studentTabs: { value: StudentTab; label: string }[] = [
  { value: "all", label: "All students" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
]

export const studentTabValues = new Set<string>(
  studentTabs.map((tab) => tab.value)
)

/** Whether anything narrows the list — what decides between the illustrated
 *  "no students yet" card and a table saying nothing matched. */
export function isStudentsFiltered(query: StudentsQuery): boolean {
  return query.tab !== "all" || query.courseId !== null || query.query !== ""
}

// ---------------------------------------------------------------------------
// The status pill
// ---------------------------------------------------------------------------

export type StudentStatus = "active" | "completed"

export const studentStatusLabel: Record<StudentStatus, string> = {
  active: "Active",
  completed: "Completed",
}

/**
 * Sampled off the export: a green pill for Active and a blue one for
 * Completed. They are the semantic tokens rather than the drawn hexes so dark
 * mode follows — the choice `billing-transactions.tsx` documents — on the
 * tint-over-token pattern (`bg-<token>/10` with `text-<token>`) every other
 * pill in the app uses.
 */
export const studentStatusBadge: Record<StudentStatus, string> = {
  active: "bg-success/10 text-success",
  completed: "bg-accent-2/10 text-accent-2",
}
