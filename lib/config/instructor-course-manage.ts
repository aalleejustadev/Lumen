import {
  BarChart3Icon,
  BookOpenTextIcon,
  FileQuestionIcon,
  MessageCircleQuestionMarkIcon,
  SettingsIcon,
  StarIcon,
  TicketPercentIcon,
  UsersRoundIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import { editorQuizHref, editorStepHref } from "@/lib/config/course-editor"
import type { ManageFacts } from "@/lib/instructor-course-manage"

/**
 * Everything `/dashboard/instructor/courses/[slug]` *says*, and nothing it
 * counts — the split every surface here makes. `lib/instructor-course-manage.ts`
 * returns facts; this turns them into the sentences
 * `ui-design/light/dashboard/instructor/manage-course.png` draws.
 *
 * It carries the row icons as well as the copy, unlike
 * `lib/config/messages.ts`, which was made to give its up. That rule is about
 * a config module a **layout** reaches transitively — putting `lucide-react`
 * in the layout's server graph slowed every route under the shell. Nothing but
 * this page's own components imports this file, and the rows it describes are
 * `instructorNav`'s in miniature, which carries its icons the same way.
 */

export const manageCourseCopy = {
  back: "Back to My Courses",
  lead: "Manage everything about this course from one place.",
  preview: "Preview as student",
  manageHeading: "Manage",
  healthHeading: "Course health",
  activityHeading: "Recent activity",
  activityEmpty: "Nothing has happened on this course yet.",
  /** Shown in place of a bar for a metric nothing has written rows for yet. */
  noData: "No data yet",
} as const

export const manageStatLabels = {
  students: "Students",
  rating: "Rating",
  revenue: "Revenue",
  lessons: "Lessons",
} as const

// ---------------------------------------------------------------------------
// Unpublish / Republish
// ---------------------------------------------------------------------------

/**
 * The export draws **Unpublish** on a published course and nothing else, since
 * that is the state it was drawn in. Republish is the other half, and it is
 * what makes the first one safe to press: without it an instructor's own
 * button would take a course off sale with no way back, which is the shape of
 * mistake `maintenance-dialog.tsx` exists to prevent.
 *
 * It is confirmed in the **unpublish direction only**, for that dialog's
 * reason: taking a live course off sale ends every prospective learner's
 * ability to buy it, where re-listing one an admin already approved restores a
 * state the platform was happily in.
 */
export const publishToggleCopy = {
  unpublish: {
    action: "Unpublish",
    title: "Unpublish this course?",
    description:
      "It leaves the catalog immediately and no one new can buy it. Students already enrolled keep their access, and you can republish at any time.",
    confirm: "Unpublish course",
  },
  republish: {
    action: "Republish",
  },
} as const

// ---------------------------------------------------------------------------
// The Manage rows
// ---------------------------------------------------------------------------

export type ManageRowKey =
  | "curriculum"
  | "quizzes"
  | "landing"
  | "students"
  | "qa"
  | "reviews"
  | "analytics"
  | "coupons"

export type ManageRow = {
  key: ManageRowKey
  title: string
  icon: LucideIcon
  /** The muted second line. Takes the facts so a count in it is read rather
   *  than written into copy — the rule the Help Center's FAQ answers follow. */
  detail: (facts: ManageFacts) => string
  /** The pill at the trailing edge, or null when there is nothing to say —
   *  the "an empty queue is dropped rather than drawn as a zero" rule. */
  badge?: (facts: ManageFacts) => string | null
  /**
   * The row in `instructorNav` whose `built` flag decides whether this row is
   * a link — read from there rather than written down again, so each lights up
   * on its own the day that route lands.
   *
   * **Optional, because not every destination is a nav row.** Curriculum goes
   * to a step of the course editor, which is a route under this very course
   * and appears in no sidebar; a row with no `navHref` is decided purely by
   * whether `manageRowHref` can build it one.
   */
  navHref?: string
}

/**
 * The three groups, exactly as drawn. Every row is a real destination or is
 * inert — never a link onto a 404, which is the rule
 * `attention-list.tsx` states and this page follows row for row.
 *
 * Seven of the eight go somewhere today — all three Content rows, plus
 * **Students**, **Q&A**, **Reviews** and **Coupons**, which are filtered to
 * this course through the `?course=` parameter those pages already parse
 * (`parseStudentsQuery`, `parseQuestionsQuery`, `parseReviewsQuery`,
 * `parseCouponsQuery`); each resolves that id against the caller's own
 * courses, so a link built here can only ever narrow what they would have
 * shown anyway. **Analytics** is the one still waiting on a sidebar row to
 * flip. `manageRowHref` below decides each destination and says why.
 */
export const manageGroups: {
  title: string
  rows: ManageRow[]
}[] = [
  {
    title: "Content",
    rows: [
      {
        key: "curriculum",
        title: "Curriculum",
        icon: BookOpenTextIcon,
        detail: (facts) =>
          `${plural(facts.sections, "section")} · ${plural(facts.lessons, "lesson")}`,
      },
      {
        key: "quizzes",
        title: "Quizzes",
        icon: FileQuestionIcon,
        detail: (facts) =>
          facts.quizzes === 0
            ? "No quizzes in this course yet"
            : `${plural(facts.quizzes, "quiz", "quizzes")} across the course`,
      },
      {
        key: "landing",
        title: "Landing page & pricing",
        icon: SettingsIcon,
        detail: () => "Title, cover, description, price",
      },
    ],
  },
  {
    title: "Audience",
    rows: [
      {
        key: "students",
        title: "Students",
        icon: UsersRoundIcon,
        detail: () => "Progress and messaging",
        badge: (facts) =>
          facts.students === 0 ? null : formatCount(facts.students),
        navHref: "/dashboard/instructor/students",
      },
      {
        key: "qa",
        title: "Q&A",
        icon: MessageCircleQuestionMarkIcon,
        detail: () => "Questions from learners",
        // "Unanswered" rather than a total, because that is the work waiting
        // on them — the definition the sidebar's own Q&A badge counts.
        badge: (facts) =>
          facts.unansweredQuestions === 0
            ? null
            : `${facts.unansweredQuestions} unanswered`,
        navHref: "/dashboard/instructor/qa",
      },
      {
        key: "reviews",
        title: "Reviews",
        icon: StarIcon,
        detail: () => "Ratings and your replies",
        // **"New" means unreplied**, not recent. The row's own second line
        // says "Ratings and your replies", so the thing worth counting is the
        // ones still waiting for one — `CourseReviewReply` is unique per
        // review, so "has no reply" is exactly answerable.
        badge: (facts) =>
          facts.unrepliedReviews === 0 ? null : `${facts.unrepliedReviews} new`,
        navHref: "/dashboard/instructor/reviews",
      },
    ],
  },
  {
    title: "Growth",
    rows: [
      {
        key: "analytics",
        title: "Analytics",
        icon: BarChart3Icon,
        detail: () => "Enrolment, revenue, watch time",
        navHref: "/dashboard/instructor/analytics",
      },
      {
        key: "coupons",
        title: "Coupons",
        icon: TicketPercentIcon,
        detail: () => "Run a targeted discount",
        badge: (facts) =>
          facts.activeCoupons === 0 ? null : `${facts.activeCoupons} active`,
        navHref: "/dashboard/instructor/coupons",
      },
    ],
  },
]

/** What `manageRowHref` needs to build a destination.
 *
 *  Both halves of the course are carried because the two halves of this app
 *  address one differently: the `?course=` filters take the **id**, which is
 *  what those pages parse, while every route under
 *  `/dashboard/instructor/courses/…` takes the **slug**, which is what a URL a
 *  human might read should carry. */
export type ManageRowTarget = {
  id: string
  slug: string
  /** The course's quiz lessons, in curriculum order — see the Quizzes row
   *  below. Ids rather than a count, because one quiz opens directly. */
  quizLessonIds: string[]
}

/**
 * Where a row goes. A row without an entry — or whose entry declines — renders
 * inert whatever `instructorNav` says, which is why this returns
 * `string | undefined` rather than `string`.
 *
 * Seven of the eight lead somewhere today — Analytics is the one still
 * waiting on its own route:
 *
 *  - **Curriculum** opens the editor on its Curriculum step, the surface
 *    `create-course-page__curriculum.png` draws.
 *  - **Quizzes** has no index page of its own to open — a quiz is edited at
 *    `/edit/quiz/<lessonId>`, which addresses one lesson — so the destination
 *    depends on how many there are. Exactly one opens **that quiz**, which is
 *    the whole point of the row on the commonest course. More than one falls
 *    back to Curriculum, where every quiz row carries its own *Edit quiz*
 *    button: picking one of several for the instructor would be a guess. None
 *    declines, so the row stays inert under its own "No quizzes in this course
 *    yet" — the "an empty queue is dropped rather than drawn as a zero" rule,
 *    and a link promising quizzes that opens a page with none is the dead
 *    affordance `attention-list.tsx` refuses. Build a real quizzes index here
 *    if one is ever drawn.
 *  - **Landing page & pricing** is one row over **two** editor steps, so it
 *    opens the first of them. They are adjacent in `editorGroups` under
 *    "Publish your course", so Pricing is one click away in the nav card the
 *    step lands on — which is what makes a single row honest rather than a
 *    half-destination.
 *  - **Students**, **Q&A**, **Reviews** and **Coupons** are filtered to this
 *    course through the `?course=` parameter those pages already parse. Each
 *    resolves that id against the caller's own courses, so a link built here
 *    can only ever narrow what they would have shown anyway.
 */
export const manageRowHref: Partial<
  Record<ManageRowKey, (course: ManageRowTarget) => string | undefined>
> = {
  curriculum: (course) => editorStepHref(course.slug, "curriculum"),
  quizzes: (course) => {
    const [only, ...rest] = course.quizLessonIds
    if (only === undefined) return undefined
    return rest.length === 0
      ? editorQuizHref(course.slug, only)
      : editorStepHref(course.slug, "curriculum")
  },
  landing: (course) => editorStepHref(course.slug, "landing-page"),
  students: (course) => `/dashboard/instructor/students?course=${course.id}`,
  qa: (course) => `/dashboard/instructor/qa?course=${course.id}`,
  reviews: (course) => `/dashboard/instructor/reviews?course=${course.id}`,
  coupons: (course) => `/dashboard/instructor/coupons?course=${course.id}`,
}

// ---------------------------------------------------------------------------
// Course health
// ---------------------------------------------------------------------------

export type HealthKey = "completion" | "watchTime" | "quizPass"

/**
 * The three bars, in the export's order and its colours — sampled and landing
 * on `--success`, `--accent-2` and `--accent-1` exactly. They are the tokens
 * rather than the literal hexes so dark mode follows, the choice
 * `billing-transactions.tsx` documents.
 *
 * What each one *means* is decided in `lib/instructor-course-manage.ts`; this
 * is only what it is called and how it is drawn.
 */
export const healthMetrics: {
  key: HealthKey
  label: string
  className: string
}[] = [
  { key: "completion", label: "Completion rate", className: "bg-success" },
  { key: "watchTime", label: "Avg. watch time", className: "bg-accent-2" },
  { key: "quizPass", label: "Quiz pass rate", className: "bg-accent-1" },
]

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------

export type ActivityKind = "enrolment" | "review" | "question" | "earning"

/** The tinted tile behind each item's glyph. Sampled off the export at a
 *  fifteenth opacity over white, which lands on the violet and the blue
 *  exactly. */
export const activityTone: Record<ActivityKind, string> = {
  enrolment: "bg-accent-2/15 text-accent-2",
  review: "bg-star/15 text-star",
  question: "bg-accent-1/15 text-accent-1",
  earning: "bg-success/15 text-success",
}

/**
 * The glyph in that tile. Three of the four are the icon the row they *came
 * from* already draws — Students, Reviews and Q&A in `manageGroups` above — so
 * a feed line and the row it would send you to are recognisably about the same
 * thing. Earnings has no row here (it is a Revenue & Payouts surface), and
 * takes the wallet the export draws rather than the Revenue tile's receipt.
 */
export const activityIcon: Record<ActivityKind, LucideIcon> = {
  enrolment: UsersRoundIcon,
  review: StarIcon,
  question: MessageCircleQuestionMarkIcon,
  earning: WalletIcon,
}

// ---------------------------------------------------------------------------

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}
