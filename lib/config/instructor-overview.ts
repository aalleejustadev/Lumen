/**
 * Every word the instructor Overview says, and the shapes its cards take —
 * from `ui-design/light/dashboard/instructor/instructor-dashboard.png`.
 *
 * The split every surface here makes: the figures come out of
 * `lib/instructor-overview.ts`, the phrasing around them lives in config. It
 * holds **data, never components** — the trap `lib/config/messages.ts` paid
 * for — and the shapes live here rather than beside the reads because two of
 * these cards are recharts Client Components and that module is `server-only`.
 */

export type ProductionCourse = {
  slug: string
  title: string
  published: number
  total: number
}

export type SpendSlice = {
  label: string
  value: number
  color: "var(--chart-1)" | "var(--chart-2)" | "var(--chart-3)"
}

export type TopCourse = {
  slug: string
  title: string
  categoryName: string
  categorySlug: string
  art: string
  thumbnailUrl: string | null
  rating: number
  students: number
}

export type InstructorOverview = {
  firstName: string
  learnersThisMonth: number
  production: ProductionCourse[]
  completion: {
    percent: number
    deltaPercent: number
    previousPercent: number
    enrolled: number
    completed: number
  }
  output: {
    watchPercent: number
    /** Share of this instructor's lessons that are live. */
    publishedLessonPercent: number
    /** Share of their students who finished — the same figure the card above
     *  headlines, shown here as the outcome half of the pair. */
    completionPercent: number
    drafts: number
    published: number
  }
  spend: SpendSlice[]
  revenue: { month: string; cents: number }[]
  revenueDeltaPercent: number
  topCourses: TopCourse[]
}

/** Six rows a page, which is what the export's table draws before its pager. */
export const TOP_COURSES_PER_PAGE = 6

export const instructorOverviewCards = {
  welcome: {
    /** The export writes "Hi, Ada 👋" — the name is the signed-in
     *  instructor's, so only the greeting is copy. */
    greeting: (firstName: string) => `Hi, ${firstName}`,
    headline: (learners: number) =>
      learners === 1
        ? "Your courses taught 1 learner this month."
        : `Your courses taught ${learners.toLocaleString("en-US")} learners this month.`,
    /** What a brand-new instructor sees instead of a learner count — the
     *  export only ever draws the busy state. */
    headlineEmpty: "Your first course is waiting to be written.",
    lead: "Review student progress, answer open questions, and publish your next lesson.",
    cta: "Create a Course",
  },
  production: {
    title: "Courses in Production",
    lessons: (published: number, total: number) =>
      `${published} of ${total} lessons published`,
    emptyTitle: "Nothing in production",
    emptyBody:
      "Courses you are still writing show up here with their publishing progress.",
  },
  completion: {
    title: "Student Completion Rate",
    previous: (percent: number) => `Previous: ${percent}%`,
    target: "Target: 100%",
    enrolled: "Enrolled Students",
    completed: "Completed a Course",
    share: (percent: number) => `${percent}% of enrolled students`,
    cta: "View Student Report",
  },
  output: {
    title: "Course Output",
    watchLabel: "Avg. Watch Completion",
    /** **The export's two bars are unlabelled**, which is the one thing here
     *  not reproduced literally: a bare percentage with no subject is the
     *  "number that means nothing" this codebase refuses everywhere else. They
     *  keep the drawn geometry and gain a caption naming what they are. */
    barsCaption: "Lessons published · students finished",
    drafts: "Drafts",
    published: "Published",
  },
  spend: {
    title: "Where Students Spend Time",
    emptyBody: "Once students start completing lessons, this splits their time by lesson type.",
  },
  revenue: {
    title: "Revenue by Month",
    compared: (delta: number) =>
      `Compared to previous month ${delta >= 0 ? "+" : ""}${delta}%`,
    emptyBody: "Your share of each sale appears here once a course sells.",
  },
  top: {
    title: "Your Top Courses",
    search: "Search courses",
    columns: {
      name: "Course name",
      category: "Category",
      score: "Score",
      students: "Students",
    },
    count: (n: number) => `${n} course(s)`,
    emptyTitle: "No published courses yet",
    emptyBody: "Approved courses are listed here, ranked by enrolments.",
  },
} as const
