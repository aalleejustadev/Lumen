/**
 * Authored rows for `prisma/seed.ts`.
 *
 * The published catalog is *not* here: it is read out of
 * `lib/config/browse-courses.ts` / `course-details.ts` / `instructor-profiles.ts`
 * so there is still exactly one authored copy of it, and the seed's job is to
 * put that copy into the tables. What lives in this file is everything the
 * catalog files never modelled because the student surfaces never needed it —
 * the review queue, the categories the admin console organises the catalog by,
 * and the name pool the demo accounts are built from.
 */

import type {
  BrowseCourseCategory,
  CourseLevel,
} from "@/lib/config/browse-courses"

// ---------------------------------------------------------------------------
// How much the seed writes
// ---------------------------------------------------------------------------

/**
 * **The seed is deliberately tiny.** Every collection it writes is capped at
 * `SEED_MAX` rows, at the user's instruction — a development database you can
 * read end to end in one screen beats one you have to query to understand.
 *
 * It is a *cap*, not a target: a list shorter than this is written whole. The
 * cost is that several surfaces no longer reproduce the figures their exports
 * were measured against — the admin Community page's 124/1940, 862/9410 …
 * per-topic totals, the coupons footer's "Showing 1–5 of 8", the Users page's
 * five-hundred-account KPI row. Those invariants are recorded against the
 * *shape* of the seed rather than these volumes, so raising this number is all
 * it takes to get them back.
 */
export const SEED_MAX = 5

/**
 * The slice of the published catalog the seed puts into the database.
 *
 * Curated rather than `browseCourses.slice(0, SEED_MAX)`, because the other
 * seed lists address courses **by slug** — the featured Q&A questions, the
 * coupons, the message threads — and an arbitrary five would silently drop
 * most of them on the floor. These five are the ones that carry the authored
 * demo content. Everything else in `lib/config/browse-courses.ts` still drives
 * the student catalog, which reads the config rather than the database.
 */
export const seededCourseSlugs = [
  "mastering-illustration",
  "python-for-everybody",
  "the-complete-react-bootcamp",
  "design-systems-in-figma",
  "advanced-illustration-techniques",
]

// ---------------------------------------------------------------------------
// The developer's own workspace
// ---------------------------------------------------------------------------

/**
 * Courses and questions for **whoever is signed in developing this**, rather
 * than for the eight demo instructors.
 *
 * Every seeded surface hangs off `Course.instructorId`, so an account with an
 * `Instructor` row and no courses opens Q&A, My Courses, Students and Coupons
 * on their empty states — which is exactly what a developer with their own
 * profile sees, and is the state this exists to fix. `seedDeveloperWorkspace`
 * writes these for **every** non-seeded instructor profile, the call
 * `seedNotifications` already makes about admin accounts ("the account a
 * developer signs in with is usually their own"). The rows still carry the
 * `seed_` prefix, so the next run reclaims them.
 *
 * The slugs are deliberately **not** in `browse-courses.ts`: that file is the
 * student catalog, and a course nobody authored a `CourseDetail` for would be
 * a sale page that cannot render.
 */
/**
 * The developer's own catalog — see `seedDeveloperWorkspace`.
 *
 * **Two of the four have never been live**, which is not decoration: My
 * Courses draws a Drafts tab, an In review tab and a "% built" bar that only
 * exist for a course that has not shipped, and a workspace of two published
 * courses leaves all three with nothing to say. It is the call
 * `ownerQuestionSeeds` already makes by answering two of its four questions.
 *
 * `publishedLessons` is what the bar reads: `CourseLesson.isPublished` over
 * the course's lessons, which is the figure that column exists to answer. The
 * in-review course has all of them live, because you submit a finished course
 * — which is exactly what the export draws on its own In-review row (100%
 * built).
 *
 * The published pair stay **first**, because `ownerQuestionSeeds.courseIndex`
 * addresses this list by position and a question belongs to a course somebody
 * can be enrolled in.
 */
export const ownerCourseSeeds: {
  slug: string
  title: string
  subtitle: string
  categorySlug: string
  level: CourseLevel
  priceCents: number
  listPriceCents: number
  /** Where the course sits on My Courses. Absent means PUBLISHED. */
  status?: "DRAFT" | "IN_REVIEW"
  /** How many of `lessons` are live. Absent means all of them. */
  publishedLessons?: number
  lessons: string[]
}[] = [
  {
    slug: "studio-workflow-essentials",
    title: "Studio Workflow Essentials",
    subtitle: "Set up a repeatable process from brief to final handoff.",
    categorySlug: "design",
    level: "Beginner",
    priceCents: 4999,
    listPriceCents: 9999,
    lessons: [
      "Introduction & course overview",
      "Setting up your workspace",
      "From brief to moodboard",
      "Handing off without a meeting",
    ],
  },
  {
    slug: "shipping-side-projects",
    title: "Shipping Side Projects",
    subtitle: "Finish the thing. A practical course on scope and momentum.",
    categorySlug: "development",
    level: "Intermediate",
    priceCents: 5999,
    listPriceCents: 11999,
    lessons: [
      "Why side projects stall",
      "Cutting scope without cutting value",
      "A release you can repeat",
    ],
  },
  {
    slug: "typography-for-product-teams",
    title: "Typography for Product Teams",
    subtitle: "A type scale your engineers can actually build against.",
    categorySlug: "design",
    level: "Beginner",
    priceCents: 3999,
    listPriceCents: 8999,
    status: "DRAFT",
    // 5 of 11 — the bar reads 45%, which is the figure the export draws.
    publishedLessons: 5,
    lessons: [
      "Introduction & course overview",
      "Why a scale beats picking sizes",
      "Choosing a ratio you can defend",
      "Line height is a function of measure",
      "Naming steps engineers will use",
      "Auditing an existing product",
      "Weights, and when to stop adding them",
      "Type in dense interfaces",
      "Handing the scale to a codebase",
      "Keeping it alive after launch",
      "Wrap-up & next steps",
    ],
  },
  {
    slug: "writing-technical-documentation",
    title: "Writing Technical Documentation",
    subtitle: "Docs people finish reading, and come back to.",
    categorySlug: "development",
    level: "Intermediate",
    priceCents: 4499,
    listPriceCents: 9499,
    status: "IN_REVIEW",
    lessons: [
      "Introduction & course overview",
      "Who is actually reading this",
      "The four kinds of document",
      "Writing a tutorial that works first time",
      "Reference that answers one question",
      "Keeping examples from rotting",
      "Wrap-up & next steps",
    ],
  },
]

/**
 * How far each seat in the learner pool has got, in order — the values
 * `seedDeveloperWorkspace` assigns its `ADMIN_GRANT` enrolments.
 *
 * It is a fixed ladder rather than a roll so that the figures a developer sees
 * on `/dashboard/instructor/courses/[slug]` do not move between runs: at
 * `SEED_MAX` it gives **40% completion** and a **67% average watch time**,
 * which is the shape `manage-course.png` draws and a plausible one for a young
 * course. The two 100s are the only enrolments that carry a `completedAt`,
 * since that column follows from this one and never stands on its own.
 */
export const ownerProgress = [100, 72, 45, 100, 18] as const

/**
 * The four questions waiting on the developer's own Q&A page.
 *
 * `courseIndex` addresses `ownerCourseSeeds` by position rather than by slug,
 * so renaming a course cannot orphan its questions. Two are answered and two
 * are not, which is what gives the Unanswered tab, the Answered tab and the
 * sidebar badge each something to show.
 */
export const ownerQuestionSeeds: {
  courseIndex: number
  title: string
  body: string
  answered: boolean
  votes: number
  agoMinutes: number
  replies: {
    from: "instructor" | "learner"
    body: string
    agoMinutes: number
  }[]
}[] = [
  {
    courseIndex: 0,
    title: "Is the handoff checklist available as a download?",
    body: "You mention a checklist in the handoff lesson but I cannot find it in the resources panel. Is it meant to be there?",
    answered: false,
    votes: 4,
    agoMinutes: 38,
    replies: [],
  },
  {
    courseIndex: 0,
    title: "Does this workflow hold up with a team of two?",
    body: "Most of the examples are solo. Would the same process work if a second designer is picking up the file halfway through?",
    answered: true,
    votes: 9,
    agoMinutes: 5 * 60,
    replies: [
      {
        from: "learner",
        body: "Curious about this too — we are a pair and keep stepping on each other's files.",
        agoMinutes: 4 * 60,
      },
      {
        from: "instructor",
        body: "It does, with one change: name the handoff point explicitly rather than leaving it implied. Lesson 4 covers the checklist; the only addition for a pair is that whoever picks the file up owns the naming from that point on.",
        agoMinutes: 3 * 60,
      },
      {
        from: "learner",
        body: "That is the bit we were missing. Thank you.",
        agoMinutes: 2 * 60,
      },
    ],
  },
  {
    courseIndex: 1,
    title: "How small is too small for a first side project?",
    body: "I keep starting things that are too big and then abandoning them. Is there a rule of thumb for scoping the first one?",
    answered: true,
    votes: 12,
    agoMinutes: 26 * 60,
    replies: [
      {
        from: "instructor",
        body: 'If you cannot describe it in one sentence without an "and", it is too big. Ship that, then add the second sentence as version two.',
        agoMinutes: 25 * 60,
      },
      {
        from: "learner",
        body: "The one-sentence test is brutal and correct.",
        agoMinutes: 20 * 60,
      },
    ],
  },
  {
    courseIndex: 1,
    title: "Any advice on picking back up after a month away?",
    body: "Life got in the way and the repo has gone cold. Is it better to restart or to try to remember where I was?",
    answered: false,
    votes: 2,
    agoMinutes: 3 * 24 * 60,
    replies: [
      {
        from: "learner",
        body: "Not an answer, but writing a two-line note to yourself before you stop has saved me twice.",
        agoMinutes: 2 * 24 * 60,
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * **The seed no longer authors categories.** It used to create its own six
 * (plus Finance) with `seed_`-prefixed ids, which made them undeletable in the
 * console — `Course.category` is RESTRICT, so every row it wrote was pinned by
 * the courses it also wrote — and re-running the seed would overwrite whatever
 * an admin had since done to the taxonomy.
 *
 * Categories are now **owned by the admin**, created through
 * `/dashboard/admin/categories`, and the seed only *resolves* them: it looks
 * each required slug up in the database and stops with a useful message if one
 * is missing. `requiredCategorySlugs` below is what it checks, derived from
 * the two places a seeded course names its category rather than written out
 * again, so the list cannot drift from what the seed actually needs.
 */

/** Which category row each `BrowseCourse.category` pill resolves to. */
export const categorySlugByBrowseCategory: Record<
  BrowseCourseCategory,
  string
> = {
  "Web Dev": "development",
  Design: "design",
  "Data & AI": "data-ai",
  Business: "business",
  Marketing: "marketing",
  // **Finance resolves to Business.** The seed used to file Finance courses
  // under a hidden Finance child of Business; the console's own list is
  // top-level only and already rolled its numbers up into Business, so the
  // distinction was invisible everywhere it mattered. There is no Finance row
  // to point at any more.
  Finance: "business",
}

/**
 * Every `Category.slug` a seeded course needs to exist before the seed can
 * run, derived from the two places one is named rather than written out again.
 * `prisma/seed.ts` checks this set and stops with the missing slugs listed, so
 * a fresh database says "create these in the console" instead of failing on a
 * null relation halfway through.
 */
export function requiredCategorySlugs(): string[] {
  return [
    ...new Set([
      ...Object.values(categorySlugByBrowseCategory),
      ...pendingCourseSeeds.map((seed) => seed.categorySlug),
      ...ownerCourseSeeds.map((seed) => seed.categorySlug),
      ...promotionSeeds.flatMap((seed) => seed.categorySlugs),
    ]),
  ].sort()
}

// ---------------------------------------------------------------------------
// Instructors the published catalog doesn't have
// ---------------------------------------------------------------------------

/**
 * `lib/config/instructor-profiles.ts` can only describe instructors who
 * already have a course in `browseCourses`. Personal Development has none, so
 * its two teachers are authored here.
 */
export const extraInstructorSeeds: {
  slug: string
  name: string
  title: string
  bio: string
  about: string[]
  skills: string[]
  teachingSince: number
  rating: number
  reviewsCount: number
  studentsCount: number
}[] = [
  {
    slug: "noor-haddad",
    name: "Noor Haddad",
    title: "Productivity Coach",
    bio: "Ten years helping engineers and designers protect the hours their best work actually needs.",
    about: [
      "Noor spent eight years as a delivery lead before deciding the problem was never the process — it was how little uninterrupted time anyone had left by the time the process was done.",
      "She now works with individual contributors and small teams on attention, not calendars: what to defend, what to drop, and how to tell the difference before the quarter ends.",
    ],
    skills: ["Deep work", "Habit design", "Focus", "Time blocking"],
    teachingSince: 2023,
    rating: 4.7,
    reviewsCount: 214,
    studentsCount: 3180,
  },
  {
    slug: "tobias-reinhardt",
    name: "Tobias Reinhardt",
    title: "Communication Coach",
    bio: "Former conference chair who has watched several thousand talks and can tell you why most of them lost the room.",
    about: [
      "Tobias ran the programme for a mid-sized technology conference for six years, which meant reading proposals, rehearsing speakers, and standing at the back of the room while it worked or didn't.",
      "He teaches the structural half of speaking — what a talk is *about*, in one sentence, before a single slide exists.",
    ],
    skills: ["Public speaking", "Narrative structure", "Slide design"],
    teachingSince: 2024,
    rating: 4.6,
    reviewsCount: 96,
    studentsCount: 1420,
  },
]

// ---------------------------------------------------------------------------
// The review queue
// ---------------------------------------------------------------------------

/**
 * Courses that are *not* live, which is the whole point of them: the Platform
 * Overview's "N courses awaiting review" and the admin Courses queue read this
 * set, and the published catalog can't supply it — every row in
 * `browseCourses` is, by definition, already on the shelf.
 *
 * `submittedHoursAgo` is what makes "Oldest submitted 2 days ago" a query
 * rather than a caption: the largest value among the IN_REVIEW rows *is* that
 * sentence. Two of these titles ("Data Storytelling Essentials" at two days,
 * "Brand Identity Workshop" needing changes) are the export's own rows from
 * `courses-page__admin.png`; the rest fill the queue out to the six the
 * overview draws, one per category so the console has something in each.
 */
export const pendingCourseSeeds: {
  slug: string
  title: string
  subtitle: string
  instructorSlug: string
  /** A `Category.slug`, not a `BrowseCourseCategory`: the queue reaches
   *  categories the student catalog has no pill for (Personal Development). */
  categorySlug: string
  level: CourseLevel
  status: "IN_REVIEW" | "NEEDS_CHANGES" | "REJECTED" | "DRAFT"
  durationHours: number
  lessonCount: number
  priceCents: number
  listPriceCents: number
  submittedHoursAgo?: number
  description: string[]
  learningOutcomes: string[]
  requirements: string[]
  /** Only on the row that has been sent back — the note the instructor sees. */
  noteToInstructor?: string
  changeReasons?: (
    | "AUDIO_VIDEO_QUALITY"
    | "INCOMPLETE_CURRICULUM"
    | "MISSING_QUIZ_OR_PROJECT"
    | "CONTENT_ACCURACY"
    | "COPYRIGHT_CONCERN"
  )[]
}[] = [
  {
    slug: "data-storytelling-essentials",
    title: "Data Storytelling Essentials",
    subtitle: "Turn a finished analysis into something a room will act on",
    instructorSlug: "dr-elias-vance",
    categorySlug: "data-ai",
    level: "Intermediate",
    status: "IN_REVIEW",
    durationHours: 11,
    lessonCount: 22,
    priceCents: 1399,
    listPriceCents: 7999,
    submittedHoursAgo: 50,
    description: [
      "Most analyses die in the handover. The numbers are right, the chart is honest, and the room still leaves without a decision — because nobody said what the number was for.",
      "This course is the second half of analysis: choosing the comparison, cutting the chart that only you can read, and writing the one sentence the slide exists to support.",
    ],
    learningOutcomes: [
      "Pick the comparison your audience is actually making",
      "Cut a chart down to the one relationship it should show",
      "Write a headline that states the finding, not the topic",
      "Present uncertainty without hedging the recommendation away",
    ],
    requirements: [
      "Comfort with a spreadsheet or a dataframe",
      "An analysis of your own to rework as you go",
    ],
  },
  {
    slug: "motion-design-with-after-effects",
    title: "Motion Design with After Effects",
    subtitle: "Timing, easing, and the small movements interfaces are built on",
    instructorSlug: "simon-simorangkir",
    categorySlug: "design",
    level: "Intermediate",
    status: "IN_REVIEW",
    durationHours: 15,
    lessonCount: 28,
    priceCents: 1599,
    listPriceCents: 9499,
    submittedHoursAgo: 44,
    description: [
      "Motion is the part of an interface people feel and never mention. Done well it explains where a thing came from; done badly it just costs everyone 400 milliseconds.",
      "You will build a short reel of interface transitions from scratch, then spend the rest of the course learning why the first version of each felt wrong.",
    ],
    learningOutcomes: [
      "Read and write easing curves rather than picking presets",
      "Storyboard a transition before opening the timeline",
      "Build reusable motion for a small design system",
      "Export at the sizes and formats engineering can actually use",
    ],
    requirements: [
      "After Effects installed",
      "Some experience with a design tool such as Figma",
    ],
  },
  {
    slug: "kubernetes-for-developers",
    title: "Kubernetes for Developers",
    subtitle: "Everything you need to ship on it, and nothing you don't",
    instructorSlug: "maya-okonkwo",
    categorySlug: "development",
    level: "Advanced",
    status: "IN_REVIEW",
    durationHours: 19,
    lessonCount: 34,
    priceCents: 1699,
    listPriceCents: 10499,
    submittedHoursAgo: 36,
    description: [
      "This is the developer's half of Kubernetes: how to get your service running, observable, and safely updated — not how to operate a cluster.",
      "Every chapter ends with the same application deployed a little more carefully than the last, which is how the abstractions stop being trivia.",
    ],
    learningOutcomes: [
      "Read a manifest and predict what the cluster will do with it",
      "Set requests and limits from real measurements",
      "Roll out and roll back without dropping traffic",
      "Debug a pod that will not start, in order",
    ],
    requirements: [
      "Comfort with Docker and the command line",
      "A service of your own to containerise",
    ],
  },
  {
    slug: "negotiation-for-founders",
    title: "Negotiation for Founders",
    subtitle: "Term sheets, first hires, and the first big customer",
    instructorSlug: "alina-kessler",
    categorySlug: "business",
    level: "Beginner",
    status: "IN_REVIEW",
    durationHours: 8,
    lessonCount: 16,
    priceCents: 1299,
    listPriceCents: 6999,
    submittedHoursAgo: 26,
    description: [
      "Founders negotiate constantly and almost never prepare, because every one of these conversations arrives disguised as something friendlier.",
      "Three settings, one method: know your walk-away, know theirs, and never trade a thing you have for a thing you were going to get anyway.",
    ],
    learningOutcomes: [
      "Work out your walk-away position before the meeting",
      "Separate the price from the terms around it",
      "Handle an offer that arrives with a deadline attached",
      "Close without leaving the relationship worse",
    ],
    requirements: [
      "No prior experience — bring a live negotiation if you have one",
    ],
  },
  {
    slug: "email-marketing-that-sticks",
    title: "Email Marketing That Sticks",
    subtitle: "Lists people stay on, and sequences that earn the next open",
    instructorSlug: "sara-lindqvist",
    categorySlug: "marketing",
    level: "All Levels",
    status: "IN_REVIEW",
    durationHours: 9,
    lessonCount: 18,
    priceCents: 1199,
    listPriceCents: 6499,
    submittedHoursAgo: 14,
    description: [
      "Email is still the only channel you own, which is exactly why it is worth not burning. This course is about the long game: fewer sends, better ones.",
      "You will build a welcome sequence, a re-engagement sequence, and the measurement to tell whether either is working.",
    ],
    learningOutcomes: [
      "Design a welcome sequence around one promise",
      "Write a subject line that survives the preview pane",
      "Segment a list without turning it into twelve lists",
      "Read deliverability signals before they become a problem",
    ],
    requirements: [
      "An email platform you can send from",
      "A list, however small",
    ],
  },
  {
    slug: "deep-work-and-habit-design",
    title: "Deep Work & Habit Design",
    subtitle: "Protecting the hours your best work needs",
    instructorSlug: "noor-haddad",
    categorySlug: "personal-development",
    level: "Beginner",
    status: "IN_REVIEW",
    durationHours: 6,
    lessonCount: 14,
    priceCents: 999,
    listPriceCents: 5499,
    submittedHoursAgo: 5,
    description: [
      "Nobody is short of productivity advice. What they are short of is two uninterrupted hours, and no amount of task management creates those.",
      "A short, practical course on where the hours went, which ones you can defend, and how to make the defence a habit rather than a decision you re-take every morning.",
    ],
    learningOutcomes: [
      "Audit a week honestly, including the parts you would rather not",
      "Design one habit at a time, with a cue you will actually meet",
      "Say no to a meeting in a way that survives the follow-up",
      "Recover a routine after it breaks, which it will",
    ],
    requirements: ["Nothing but a calendar you are willing to look at"],
  },
  {
    slug: "brand-identity-workshop",
    title: "Brand Identity Workshop",
    subtitle: "From a positioning line to a working identity system",
    instructorSlug: "sara-lindqvist",
    categorySlug: "design",
    level: "Intermediate",
    status: "NEEDS_CHANGES",
    durationHours: 4,
    lessonCount: 6,
    priceCents: 1299,
    listPriceCents: 7499,
    submittedHoursAgo: 74,
    description: [
      "A workshop-format course: one brand, taken from a positioning sentence through to type, colour, and the rules that keep it recognisable.",
    ],
    learningOutcomes: [
      "Write a positioning line the identity can be judged against",
      "Build a type and colour system with real constraints",
      "Document the rules so someone else can apply them",
    ],
    requirements: ["A design tool", "A brand — real or invented — to work on"],
    noteToInstructor:
      "Six lessons over four hours is under the minimum for a paid course, and the workshop closes without an exercise or a quiz. Please extend the curriculum and add a graded assessment before resubmitting.",
    changeReasons: ["INCOMPLETE_CURRICULUM", "MISSING_QUIZ_OR_PROJECT"],
  },
  {
    slug: "writing-that-converts",
    title: "Writing That Converts",
    subtitle: "Landing pages, emails, and the words in between",
    instructorSlug: "alina-kessler",
    categorySlug: "marketing",
    level: "Beginner",
    status: "REJECTED",
    durationHours: 5,
    lessonCount: 10,
    priceCents: 1099,
    listPriceCents: 5999,
    submittedHoursAgo: 720,
    description: [
      "A short course on conversion copy for people who write everything themselves.",
    ],
    learningOutcomes: [
      "Structure a landing page around one action",
      "Cut a paragraph to the sentence that was doing the work",
    ],
    requirements: ["No prior experience"],
    noteToInstructor:
      "Substantial passages of the lesson scripts appear verbatim in a published book credited to another author. We cannot host this course.",
    changeReasons: ["COPYRIGHT_CONCERN"],
  },
  {
    slug: "spreadsheets-for-analysts",
    title: "Spreadsheets for Analysts",
    subtitle: "The 20% of a spreadsheet that does 80% of the analysis",
    instructorSlug: "dr-elias-vance",
    categorySlug: "data-ai",
    level: "Beginner",
    status: "DRAFT",
    durationHours: 7,
    lessonCount: 15,
    priceCents: 1099,
    listPriceCents: 5999,
    description: [
      "Pivot tables, lookups, and the handful of functions that replace most of what people write scripts for.",
    ],
    learningOutcomes: [
      "Model a question before reaching for a formula",
      "Build a pivot that answers one thing clearly",
    ],
    requirements: ["Any spreadsheet application"],
  },
  {
    slug: "public-speaking-without-fear",
    title: "Public Speaking Without Fear",
    subtitle: "Structure first, delivery second, slides last",
    instructorSlug: "tobias-reinhardt",
    categorySlug: "personal-development",
    level: "Beginner",
    status: "DRAFT",
    durationHours: 5,
    lessonCount: 12,
    priceCents: 999,
    listPriceCents: 5499,
    description: [
      "Most stage fright is structural: you are nervous because you are not sure what the talk is about. This course fixes that half first.",
    ],
    learningOutcomes: [
      "State a talk's argument in one sentence",
      "Build a spine of three moves and rehearse against it",
    ],
    requirements: ["A talk you have to give, ideally soon"],
  },
]

// ---------------------------------------------------------------------------
// Demo accounts
// ---------------------------------------------------------------------------

/**
 * The eight rows `users-page__admin.png` draws, kept verbatim so the Users
 * table's first page matches the export. The rest of the demo accounts are
 * generated from the pools below.
 */
export const featuredLearnerSeeds: {
  name: string
  email: string
  country: string
  role: string
  status: "ACTIVE" | "PENDING" | "INACTIVE" | "SUSPENDED"
  plan: "free" | "business"
  /** Supplied headshots, reused for the same named people the way
   *  `course-player.ts`' `knownAvatars` does — the Messages exports draw a
   *  face on every row, and only these two have one. Everybody else falls
   *  back to initials; this is not a stock-photo integration. */
  image?: string
}[] = [
  {
    name: "Nadia Rahman",
    email: "nadia.rahman@example.com",
    image: "/testimonials/nadia-rahman.png",
    country: "GB",
    role: "user",
    status: "ACTIVE",
    plan: "free",
  },
  {
    name: "Omar Farouk",
    email: "omar.farouk@example.com",
    country: "DE",
    role: "user",
    status: "ACTIVE",
    plan: "business",
  },
  {
    name: "Priya Nadar",
    email: "priya.nadar@example.com",
    image: "/testimonials/priya-nadar.png",
    country: "BR",
    role: "admin",
    status: "ACTIVE",
    plan: "business",
  },
  {
    name: "Liam Smith",
    email: "liam.smith@example.com",
    country: "JP",
    role: "user",
    status: "PENDING",
    plan: "free",
  },
  {
    name: "Emma Brown",
    email: "emma.brown@example.com",
    country: "CA",
    role: "user",
    status: "ACTIVE",
    plan: "business",
  },
  {
    name: "Noah Johnson",
    email: "noah.johnson@example.com",
    country: "IN",
    role: "user",
    status: "INACTIVE",
    plan: "business",
  },
  {
    name: "Sofia Almeida",
    email: "sofia.almeida@example.com",
    country: "FR",
    role: "user",
    status: "ACTIVE",
    plan: "free",
  },
  {
    name: "Daniel Osei",
    email: "daniel.osei@example.com",
    country: "NG",
    role: "user",
    status: "ACTIVE",
    plan: "business",
  },
]

export const firstNames = [
  "Aisha",
  "Alex",
  "Amara",
  "Andrei",
  "Anika",
  "Arjun",
  "Bea",
  "Bruno",
  "Camila",
  "Chen",
  "Clara",
  "Dario",
  "Dilnoza",
  "Ebru",
  "Elena",
  "Eli",
  "Farah",
  "Felix",
  "Gabriel",
  "Grace",
  "Hana",
  "Hugo",
  "Ines",
  "Isaac",
  "Ivan",
  "Jae",
  "Jonas",
  "Jordan",
  "Kai",
  "Karim",
  "Katya",
  "Lars",
  "Layla",
  "Leon",
  "Lucia",
  "Malik",
  "Mariam",
  "Mateo",
  "Mei",
  "Miriam",
  "Nabil",
  "Nina",
  "Olive",
  "Oscar",
  "Paulo",
  "Petra",
  "Rafael",
  "Rania",
  "Ravi",
  "Rosa",
  "Samir",
  "Sanne",
  "Sasha",
  "Selin",
  "Tara",
  "Theo",
  "Tomas",
  "Vera",
  "Yara",
  "Zane",
]

export const lastNames = [
  "Abara",
  "Almeida",
  "Andersson",
  "Bakker",
  "Barros",
  "Bello",
  "Chowdhury",
  "Costa",
  "Dlamini",
  "Duarte",
  "Eriksen",
  "Farouk",
  "Fernandes",
  "Gomez",
  "Haddad",
  "Ibrahim",
  "Ivanov",
  "Jansen",
  "Kaur",
  "Keller",
  "Khan",
  "Kim",
  "Kowalski",
  "Lindqvist",
  "Mensah",
  "Moreau",
  "Nakamura",
  "Nguyen",
  "Novak",
  "Okafor",
  "Osei",
  "Pereira",
  "Petrov",
  "Popescu",
  "Rahman",
  "Reyes",
  "Rossi",
  "Santos",
  "Schneider",
  "Silva",
  "Singh",
  "Sorensen",
  "Tanaka",
  "Torres",
  "Vargas",
  "Wang",
  "Weber",
  "Yilmaz",
  "Zhang",
  "Zulu",
]

/** ISO-3166 alpha-2, weighted roughly the way the demand actually skews. */
export const countryWeights: [string, number][] = [
  ["US", 22],
  ["IN", 14],
  ["GB", 8],
  ["DE", 6],
  ["BR", 6],
  ["NG", 4],
  ["CA", 4],
  ["FR", 4],
  ["ES", 3],
  ["NL", 3],
  ["PL", 3],
  ["JP", 3],
  ["AU", 3],
  ["MX", 3],
  ["ID", 3],
  ["EG", 2],
  ["ZA", 2],
  ["TR", 2],
  ["SE", 2],
  ["AR", 2],
  ["PH", 2],
  ["VN", 2],
  ["KE", 1],
  ["PT", 1],
]

// ---------------------------------------------------------------------------
// Moderation and applications
// ---------------------------------------------------------------------------

/**
 * The written reviews the three open reports are filed against, so the
 * Reported reviews queue has real bodies to moderate rather than lorem. Each
 * is attached to a real enrolment by the seed.
 */
export const reportedReviewSeeds: {
  courseSlug: string
  rating: number
  title: string
  body: string
  reason: "SPAM" | "ABUSIVE" | "SPOILERS" | "COPYRIGHT" | "OTHER"
  note: string
}[] = [
  {
    courseSlug: "python-for-everybody",
    rating: 1,
    title: "Get certified fast",
    body: "Skip this and use my link for a cheaper bundle with the same certificate — first 50 people only, DM me.",
    reason: "SPAM",
    note: "Promotional link, posted on four of my courses this week.",
  },
  {
    courseSlug: "mastering-illustration",
    rating: 1,
    title: "Waste of time",
    body: "The instructor clearly has no idea what he is doing and should not be allowed to teach anything to anyone.",
    reason: "ABUSIVE",
    note: "Personal attack rather than a review of the course.",
  },
  {
    courseSlug: "the-complete-react-bootcamp",
    rating: 2,
    title: "Answers to the final assessment",
    body: "For anyone stuck on the final project, the graded answers are: 2, 4, 1, 3, 3 — you're welcome.",
    reason: "SPOILERS",
    note: "Publishes the assessment answers.",
  },
]

/** The pitch text on the four pending instructor applications. */
export const instructorApplicationSeeds: {
  hoursAgo: number
  pitch: string
  portfolioUrls: string[]
  status: "PENDING" | "APPROVED" | "REJECTED"
}[] = [
  {
    hoursAgo: 20,
    pitch:
      "I have run a Rust workshop internally for two years and would like to turn it into a course on writing your first production service.",
    portfolioUrls: ["https://github.com/example", "https://example.com/talks"],
    status: "PENDING",
  },
  {
    hoursAgo: 52,
    pitch:
      "Fifteen years as a colourist. I want to teach grading for people who shoot on a phone and have never opened a scope.",
    portfolioUrls: ["https://example.com/reel"],
    status: "PENDING",
  },
  {
    hoursAgo: 96,
    pitch:
      "I teach accessibility auditing to product teams and would like a course aimed at designers rather than engineers.",
    portfolioUrls: ["https://example.com/a11y", "https://example.com/writing"],
    status: "PENDING",
  },
  {
    hoursAgo: 140,
    pitch:
      "Ex-actuary, now teaching pricing. Proposal is a short course on building a pricing model you can defend to a board.",
    portfolioUrls: ["https://example.com/pricing"],
    status: "PENDING",
  },
  {
    hoursAgo: 640,
    pitch:
      "I would like to teach technical writing for engineers — docs, RFCs, and incident reports.",
    portfolioUrls: ["https://example.com/docs"],
    status: "APPROVED",
  },
  {
    hoursAgo: 900,
    pitch: "I want to teach day trading with a guaranteed return strategy.",
    portfolioUrls: [],
    status: "REJECTED",
  },
]

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

/**
 * The six topics `community-page__admin.png` draws, in the order it draws
 * them, with the counts it puts beside each one.
 *
 * `threadCount` and `postCount` are the export's own figures. The seed writes
 * `threadCount` real `Discussion` rows per topic and distributes
 * `postCount - threadCount` across their **denormalised** `replyCount`
 * columns rather than materialising ~18,000 `DiscussionReply` rows nothing
 * reads yet — the arrangement `Course.enrollmentCount` is already in, and the
 * reason that column exists ("the list draws both counts on every row" —
 * `Discussion`'s own note).
 *
 * The accents are the export's six tile tints, which are exactly
 * `CATEGORY_ACCENTS` in order.
 *
 * Two of the export's own numbers do not reconcile and the data wins: its
 * per-topic threads sum to 1,814 where its Threads tile says 1,842, and its
 * Moderators tile says 18 where the four rows of its own table cannot add to
 * that. See `lib/admin/community.ts` for the definitions that replace them.
 */
export const communityTopicSeeds: {
  slug: string
  name: string
  description: string
  accentColor: string
  visibility: "EVERYONE" | "ENROLLED_ONLY" | "STAFF_ONLY"
  learnersCanStartThreads: boolean
  requiresModeratorApproval: boolean
  threadCount: number
  postCount: number
  /** How many `TopicModerator` rows the seed writes for this topic. */
  moderatorCount: number
  /** Thread subjects, cycled with a numeric suffix past the first pass. */
  subjects: string[]
}[] = [
  {
    slug: "announcements",
    name: "Announcements",
    description: "Platform and course news from staff",
    accentColor: "blue",
    visibility: "EVERYONE",
    // This is what renders the **Staff post only** pill.
    learnersCanStartThreads: false,
    requiresModeratorApproval: false,
    threadCount: 124,
    postCount: 1940,
    moderatorCount: 3,
    subjects: [
      "New certificates are rolling out this week",
      "Scheduled maintenance on Sunday",
      "Introducing saved payment methods",
      "Course player now remembers your place",
      "Refreshed category pages are live",
      "Instructor payouts move to weekly runs",
      "Dark mode is out of beta",
    ],
  },
  {
    slug: "q-and-a",
    name: "Q&A",
    description: "Learners helping learners across all courses",
    accentColor: "violet",
    visibility: "EVERYONE",
    learnersCanStartThreads: true,
    requiresModeratorApproval: false,
    threadCount: 862,
    postCount: 9410,
    moderatorCount: 6,
    subjects: [
      "How do you keep momentum through a long module?",
      "Stuck on the state management lesson",
      "Best order to take the design courses in?",
      "What does the grader actually check?",
      "Anyone else find section 4 harder than section 5?",
      "Recommended reading after the basics",
      "How long did the capstone take you?",
      "Is the quiz meant to be this fiddly?",
    ],
  },
  {
    slug: "challenges",
    name: "Challenges",
    description: "Weekly practice briefs set by instructors",
    accentColor: "cyan",
    visibility: "EVERYONE",
    learnersCanStartThreads: true,
    requiresModeratorApproval: false,
    threadCount: 318,
    postCount: 4220,
    moderatorCount: 4,
    subjects: [
      "Weekly brief: redraw a landing page in greyscale",
      "Weekly brief: ship a CLI in under 100 lines",
      "Weekly brief: one chart, three audiences",
      "Weekly brief: rewrite an error message",
      "Weekly brief: a logo from two shapes",
      "Weekly brief: refactor without changing behaviour",
    ],
  },
  {
    slug: "showcase",
    name: "Showcase",
    description: "Finished work and portfolio feedback",
    accentColor: "green",
    visibility: "ENROLLED_ONLY",
    learnersCanStartThreads: true,
    requiresModeratorApproval: false,
    threadCount: 406,
    postCount: 3180,
    moderatorCount: 3,
    subjects: [
      "First finished piece from the illustration course",
      "Portfolio review please — junior product designer",
      "Built my first dashboard, feedback welcome",
      "Six weeks of practice, side by side",
      "Rebranded a local bakery as a course project",
      "My capstone shipped to real users",
    ],
  },
  {
    slug: "instructor-lounge",
    name: "Instructor Lounge",
    description: "Private space for teaching staff",
    accentColor: "amber",
    visibility: "STAFF_ONLY",
    learnersCanStartThreads: true,
    requiresModeratorApproval: false,
    threadCount: 96,
    postCount: 1120,
    moderatorCount: 2,
    subjects: [
      "How are you handling refund requests?",
      "Recording setup that finally worked for me",
      "Do you script your lessons or improvise?",
      "Pricing a short course — what worked",
      "Getting learners through the first module",
    ],
  },
  {
    slug: "rules-and-guidelines",
    name: "Rules & Guidelines",
    description: "Code of conduct and moderation policy",
    accentColor: "red",
    visibility: "EVERYONE",
    learnersCanStartThreads: false,
    requiresModeratorApproval: true,
    threadCount: 8,
    postCount: 64,
    moderatorCount: 0,
    subjects: [
      "Community code of conduct",
      "What gets a review removed",
      "How to report a post",
      "Appealing a moderation decision",
      "Self-promotion policy",
    ],
  },
]

/**
 * The five open reports behind the **Reported items** tile — community
 * content, not the review queue's. `ReportTargetType` carries DISCUSSION and
 * DISCUSSION_REPLY for exactly this, and keeping the two queues apart is what
 * lets the Community page and `/dashboard/admin/reviews` each count their own
 * work.
 */
export const communityReportSeeds: {
  topicSlug: string
  reason: "SPAM" | "ABUSIVE" | "SPOILERS" | "COPYRIGHT" | "OTHER"
  note: string
}[] = [
  {
    topicSlug: "q-and-a",
    reason: "SPAM",
    note: "Affiliate link dropped into an answer.",
  },
  {
    topicSlug: "q-and-a",
    reason: "ABUSIVE",
    note: "Calls another learner names for asking a basic question.",
  },
  {
    topicSlug: "showcase",
    reason: "COPYRIGHT",
    note: "Posted work appears to be a stock illustration, not their own.",
  },
  {
    topicSlug: "challenges",
    reason: "SPOILERS",
    note: "Full solution posted before the brief closes.",
  },
  {
    topicSlug: "announcements",
    reason: "OTHER",
    note: "Off-topic replies derailing the release note.",
  },
]

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

/**
 * The platform-wide sales behind `/dashboard/admin/promotions`, from
 * `ui-design/light/dashboard/admin/promotions-page__admin.png` — one running
 * and the four its history table draws, with that export's own discounts,
 * scopes, redemptions and revenue.
 *
 * **Dates are offsets from the run, not calendar dates.** A promotion has no
 * status column — `lib/admin/promotions.ts` reads its state off `startsAt` and
 * `endsAt` against the clock — so a sale pinned to an absolute date would
 * quietly become history, and the page would lose the one card its export is
 * built around. Offsets keep each sale in the state it is seeded for however
 * long from now the seed is run, which is the arrangement `seedAuditLog` and
 * `seedUptime` already use for the same reason.
 *
 * The one figure that cannot be the export's is the **end date**: it writes
 * "Ends 31 Aug 2026" on a sale it also marks LIVE NOW, which is a date in the
 * past for anyone reading this after August 2026. The card says when the sale
 * actually ends, the reading the billing page's plan line settled — the export
 * loses to the truth whenever the two disagree.
 *
 * `redemptionCount` and `revenueCents` are the denormalised counters
 * `Promotion` carries for exactly this card. Setting them rather than writing
 * 12,840 orders per sale is the arrangement `Discussion.replyCount` is already
 * in; `Order.promotionId` is the row-level link a real checkout will fill in.
 */
export const promotionSeeds: {
  key: string
  name: string
  discountType: "PERCENT" | "FIXED_PRICE"
  /** Percent when PERCENT, **cents** when FIXED_PRICE. */
  value: number
  /** Empty means ALL_COURSES, which the page renders "All categories". */
  categorySlugs: string[]
  /** Days from the run. Negative is the past. */
  startsInDays: number
  endsInDays: number
  forceOnAllCourses: boolean
  redemptionCount: number
  revenueCents: number
}[] = [
  {
    key: "back-to-skills",
    name: "Back to Skills Sale",
    discountType: "PERCENT",
    value: 70,
    categorySlugs: [],
    // Three and a half weeks in, three to run — a sale caught mid-flight,
    // which is the state the export draws it in.
    startsInDays: -24,
    endsInDays: 21,
    forceOnAllCourses: false,
    redemptionCount: 12_840,
    revenueCents: 18_400_000,
  },
  {
    key: "summer-learning",
    name: "Summer Learning Sale",
    discountType: "PERCENT",
    value: 65,
    categorySlugs: [],
    startsInDays: -72,
    endsInDays: -41,
    forceOnAllCourses: false,
    redemptionCount: 18_420,
    revenueCents: 24_100_000,
  },
  {
    key: "developer-week",
    name: "Developer Week",
    discountType: "FIXED_PRICE",
    value: 999,
    categorySlugs: ["development"],
    startsInDays: -143,
    endsInDays: -136,
    forceOnAllCourses: false,
    redemptionCount: 9_180,
    revenueCents: 9_100_000,
  },
  {
    key: "design-refresh",
    name: "Design Refresh",
    discountType: "PERCENT",
    value: 50,
    categorySlugs: ["design"],
    startsInDays: -193,
    endsInDays: -180,
    forceOnAllCourses: false,
    redemptionCount: 6_240,
    revenueCents: 7_800_000,
  },
  {
    key: "new-year-kickstart",
    name: "New Year Kickstart",
    discountType: "PERCENT",
    value: 70,
    categorySlugs: [],
    // The one sale the export shows that ran platform-wide with the override
    // on — a New Year event is exactly the "platform-wide event" the dialog's
    // own help text reserves that switch for.
    startsInDays: -253,
    endsInDays: -238,
    forceOnAllCourses: true,
    redemptionCount: 22_610,
    revenueCents: 30_200_000,
  },
]

/**
 * Instructors whose courses sit out platform promotions —
 * `Instructor.promotionOptIn = false`.
 *
 * Marco Devine is the export's own opted-out row, so his switch is the one
 * that starts off. Everyone else defaults to on, which is what
 * `PlatformSetting.autoEnrollNewCoursesInPromotions` says a new teaching
 * account gets.
 */
export const promotionOptOutInstructorSlugs = ["marco-devine"]

/**
 * Per-course overrides — `Course.promotionOptIn`, where `null` means *inherit*
 * from the instructor.
 *
 * Two rows, deliberately pointing opposite ways, because that column is
 * nullable precisely so a course can disagree with its instructor and the
 * admin export's two course tiles are what count the result. Without them the
 * three-level arrangement `Course.promotionOptIn`'s own note describes would
 * never be exercised by any data in the app: every course would simply inherit,
 * and a bug in the inheritance would look like a working page.
 */
export const coursePromotionOptIn: Record<string, boolean> = {
  // Marco sits out promotions, but keeps his flagship course in them.
  "python-for-everybody": true,
  // Maya participates, and holds this one course back at its list price.
  "the-complete-react-bootcamp": false,
}

// ---------------------------------------------------------------------------
// Admin notifications
// ---------------------------------------------------------------------------

/**
 * The console's notification feed, behind `/dashboard/admin/notifications`.
 *
 * The page is built to the *instructor* export
 * (`ui-design/light/dashboard/instructor/notifications-page.png`) at the
 * user's instruction — the UI followed as drawn, the content made the
 * admin's. So the cadence here is that export's own (5 minutes, 30 minutes,
 * an hour, … two days) and the ten-ish rows it lists, while every row says
 * something an admin would actually be told.
 *
 * **A seed rather than real emissions**, for the reason `seedAuditLog` gives
 * about its own 160 entries: nothing in the app writes notifications yet, and
 * a feed with two rows leaves the search, the category card and the pager
 * with nothing to do. `seedNotifications` is the stand-in for the code that
 * will eventually emit these, exactly as the seed stands in for a health
 * monitor in `seedUptime`.
 *
 * `{course}` and `{instructor}` are filled from **real rows** at seed time,
 * because a notification pointing at a course that does not exist is the one
 * kind of demo data that reads as broken — the point `auditTemplates` makes.
 *
 * One row carries an action, which is what draws the export's Accept/Decline
 * pair. An instructor application is the admin's natural analogue of that
 * export's "add you to the mentor group" request: a named person asking for
 * something you answer with one of two buttons.
 */
export const adminNotificationSeeds: {
  key: string
  category: "MEMBERS" | "COURSE" | "COMMUNITY" | "BILLING" | "SECURITY"
  title: string
  body: string
  minutesAgo: number
  unread: boolean
  /** Renders the actor's avatar in place of the category glyph. */
  withActor?: boolean
  /** Adds the pending Accept / Decline pair. */
  action?: string
}[] = [
  {
    key: "course-submitted",
    category: "COURSE",
    title: "Course submitted for review",
    body: "{course} was submitted by {instructor} and is waiting for approval",
    minutesAgo: 5,
    unread: true,
  },
  {
    key: "application",
    category: "MEMBERS",
    title: "{instructor}",
    body: "Applied to teach on Lumen and is waiting on a decision",
    minutesAgo: 30,
    unread: true,
    withActor: true,
    action: "instructor_application",
  },
  {
    key: "review-reported",
    category: "COMMUNITY",
    title: "Review reported",
    body: "A learner reported a review on {course} as spam",
    minutesAgo: 60,
    unread: false,
  },
  {
    key: "payout-failed",
    category: "BILLING",
    title: "Payout failed",
    body: "One transfer in the last payout run was returned by the bank",
    minutesAgo: 120,
    unread: false,
  },
  {
    key: "signin",
    category: "SECURITY",
    title: "New admin sign-in",
    body: "Your account signed in from a new device in Lisbon, Portugal",
    minutesAgo: 180,
    unread: true,
  },
  {
    key: "discussion-reported",
    category: "COMMUNITY",
    title: "Discussion reported",
    body: "Two replies in “Weekly challenge: gradient mesh” were flagged as off-topic",
    minutesAgo: 300,
    unread: true,
  },
  {
    key: "course-resubmitted",
    category: "COURSE",
    title: "Changes resubmitted",
    body: "{instructor} addressed the requested changes on {course}",
    minutesAgo: 60 * 24,
    unread: false,
  },
  {
    key: "signups",
    category: "MEMBERS",
    title: "Signups up 18% this week",
    body: "1,240 new learners created accounts in the last seven days",
    minutesAgo: 60 * 26,
    unread: false,
  },
  {
    key: "refund-spike",
    category: "BILLING",
    title: "Refund rate above target",
    body: "Refunds reached 2.1% of paid orders over the trailing 30 days",
    minutesAgo: 60 * 48,
    unread: false,
  },
  {
    key: "role-granted",
    category: "SECURITY",
    title: "Admin role granted",
    body: "An existing account was given the admin role from the Users table",
    minutesAgo: 60 * 52,
    unread: false,
  },
  {
    key: "instructor-approved",
    category: "MEMBERS",
    title: "Instructor approved",
    body: "{instructor} was approved and can now publish courses",
    minutesAgo: 60 * 72,
    unread: false,
  },
  {
    key: "promotion-ended",
    category: "BILLING",
    title: "Promotion ended",
    body: "Summer Learning Sale finished with 18,420 redemptions",
    minutesAgo: 60 * 96,
    unread: false,
  },
]

/**
 * The **learner** notification feed, behind `/dashboard/notifications`.
 *
 * These are the export's own ten rows, kept close to verbatim — that drawing
 * is a learner/instructor feed, so its content already says the right things
 * for this audience, unlike the admin set which had to be rewritten. The
 * categories are the export's too (Course, Message, Community, Certificate,
 * Billing), and `4 unread` is its own header pill.
 *
 * `{course}` and `{instructor}` resolve against real rows at seed time, for
 * the reason `auditTemplates` gives, and the cadence is offsets from the run
 * so "5 minutes ago" stays true — see `seedNotifications`.
 */
export const learnerNotificationSeeds: {
  key: string
  category: "COURSE" | "MESSAGE" | "COMMUNITY" | "CERTIFICATE" | "BILLING"
  title: string
  body: string
  minutesAgo: number
  unread: boolean
  withActor?: boolean
  action?: string
}[] = [
  {
    key: "lesson-unlocked",
    category: "COURSE",
    title: "New lesson unlocked",
    body: "Module 4 — Advanced generics is now available in {course}",
    minutesAgo: 5,
    unread: true,
  },
  {
    key: "mentor-request",
    category: "COMMUNITY",
    title: "{instructor}",
    body: "Requesting to add you to the Illustration mentor group",
    minutesAgo: 30,
    unread: true,
    withActor: true,
    action: "mentor_group_invite",
  },
  {
    key: "new-message",
    category: "MESSAGE",
    title: "New message",
    body: "{instructor} sent you a message about {course}",
    minutesAgo: 60,
    unread: false,
  },
  {
    key: "quiz-available",
    category: "COURSE",
    title: "Quiz available",
    body: "Quiz · Tools & Workflow is now unlocked in {course}",
    minutesAgo: 120,
    unread: false,
  },
  {
    key: "certificate",
    category: "CERTIFICATE",
    title: "Certificate issued",
    body: "You completed {course} — download your certificate",
    minutesAgo: 180,
    unread: true,
  },
  {
    key: "new-reply",
    category: "MESSAGE",
    title: "New reply",
    body: "{instructor} replied to you in “Weekly challenge: gradient mesh”",
    minutesAgo: 300,
    unread: true,
  },
  {
    key: "announcement",
    category: "COMMUNITY",
    title: "Course announcement",
    body: "Live session moved to Friday 4pm for {course}",
    minutesAgo: 60 * 24,
    unread: false,
  },
  {
    key: "likes",
    category: "COMMUNITY",
    title: "Your reply got 12 likes",
    body: "In “Welcome to the Illustration cohort — start here”",
    minutesAgo: 60 * 26,
    unread: false,
  },
  {
    key: "streak",
    category: "COURSE",
    title: "Learning streak",
    body: "You hit a 7-day streak — keep the momentum going",
    minutesAgo: 60 * 48,
    unread: false,
  },
  {
    key: "offer",
    category: "BILLING",
    title: "Limited-time offer",
    body: "Save 30% on the annual Lumen Business plan this week",
    minutesAgo: 60 * 50,
    unread: false,
  },
]

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** One line of a seeded transcript. `minutesBefore` is measured back from the
 *  thread's own last message, so a whole conversation slides as one. */
export type ThreadMessageSeed = {
  from: "instructor" | "learner"
  body: string
  minutesBefore: number
}

/**
 * Simon Simorangkir's inbox, verbatim from
 * `ui-design/light/dashboard/instructor/messages-page.png` — its four rows in
 * its own order (20m / 1h / 4h / 1d), its two unread pills (1 and 3), and the
 * three-message transcript it draws open.
 *
 * The four learners are the first four of `featuredLearnerSeeds`, which is not
 * a coincidence: the export's own list is drawn from the same demo pool as
 * `users-page__admin.png`'s, so the two screens agree about who these people
 * are.
 *
 * Every thread is about **Mastering Illustration**, which is the course the
 * export names under each name — and the seed grants the enrolment behind each
 * pair, because `resolvePairing` is what authorises a conversation and a
 * seeded thread that rendered read-only would contradict the page it is
 * demonstrating.
 */
export const instructorThreadSeeds: {
  learnerEmail: string
  /** Age of the last message — the row's right-hand column. */
  agoMinutes: number
  /** Counted back from the end; the rest of the thread reads as seen. */
  unreadForInstructor: number
  messages: ThreadMessageSeed[]
}[] = [
  {
    learnerEmail: "nadia.rahman@example.com",
    agoMinutes: 20,
    unreadForInstructor: 1,
    messages: [
      {
        from: "learner",
        body: "The anchor-point tip changed how I trace shapes!",
        minutesBefore: 30,
      },
      {
        from: "instructor",
        body: "So glad it clicked. Keep practicing the pen tool daily.",
        minutesBefore: 18,
      },
      {
        from: "learner",
        body: "Thank you! That tip really helped.",
        minutesBefore: 0,
      },
    ],
  },
  {
    learnerEmail: "omar.farouk@example.com",
    agoMinutes: 60,
    unreadForInstructor: 3,
    messages: [
      {
        from: "instructor",
        body: "Nice work on the vector exercise — the curves are much cleaner this week.",
        minutesBefore: 180,
      },
      {
        from: "learner",
        body: "Thanks! I redid the whole thing with the pen tool instead of the pencil.",
        minutesBefore: 42,
      },
      {
        from: "learner",
        body: "One thing I got stuck on: combining two overlapping shapes.",
        minutesBefore: 20,
      },
      {
        from: "learner",
        body: "Does the shape builder work in the free trial, or is that a paid tool?",
        minutesBefore: 0,
      },
    ],
  },
  {
    learnerEmail: "priya.nadar@example.com",
    agoMinutes: 4 * 60,
    unreadForInstructor: 0,
    messages: [
      {
        from: "instructor",
        body: "Section three is live — start with the gesture drawing warm-up before the lesson.",
        minutesBefore: 90,
      },
      {
        from: "learner",
        body: "Posting my first attempt 🙌",
        minutesBefore: 0,
      },
    ],
  },
  {
    learnerEmail: "liam.smith@example.com",
    agoMinutes: 24 * 60,
    unreadForInstructor: 0,
    messages: [
      {
        from: "learner",
        body: "Is there a recommended tablet for the later sections?",
        minutesBefore: 200,
      },
      {
        from: "instructor",
        body: "Anything with pressure sensitivity is fine — don't buy new hardware for this course.",
        minutesBefore: 35,
      },
      { from: "learner", body: "Got it, thanks!", minutesBefore: 0 },
    ],
  },
]

/**
 * A learner's inbox, verbatim from
 * `ui-design/light/dashboard/student/messages-page.png` — its three rows in
 * its own order (30m / 2h / 1d), its single unread pill (2) and the transcript
 * it draws open.
 *
 * Written for **every demo learner and every admin account**, the way
 * `seedNotifications` writes its feed and for that module's reason: the
 * account a developer signs in with is usually their own, and an inbox nobody
 * can reach demonstrates nothing.
 *
 * `courseSlug: null` means "whichever course this instructor teaches" — only
 * Simon's thread names one, because Mastering Illustration is the course both
 * exports put under the name.
 */
export const learnerThreadSeeds: {
  instructorName: string
  courseSlug: string | null
  agoMinutes: number
  unreadForLearner: number
  messages: ThreadMessageSeed[]
}[] = [
  {
    instructorName: "Simon Simorangkir",
    courseSlug: "mastering-illustration",
    agoMinutes: 30,
    unreadForLearner: 2,
    messages: [
      {
        from: "instructor",
        body: "Hi! Welcome to the Illustration cohort 👋",
        minutesBefore: 29,
      },
      {
        from: "learner",
        body: "Thanks Simon! Excited to start.",
        minutesBefore: 26,
      },
      {
        from: "instructor",
        body: "Great question — yes, all core tools are available in the trial. I'll cover advanced masking next lesson.",
        minutesBefore: 0,
      },
    ],
  },
  {
    instructorName: "Maya Okonkwo",
    courseSlug: null,
    agoMinutes: 2 * 60,
    unreadForLearner: 0,
    messages: [
      {
        from: "learner",
        body: "Should I submit the project before or after the quiz?",
        minutesBefore: 55,
      },
      {
        from: "instructor",
        body: "Don't forget the assignment is due Friday — the quiz can wait until after it.",
        minutesBefore: 0,
      },
    ],
  },
  {
    instructorName: "Dr. Elias Vance",
    courseSlug: null,
    agoMinutes: 24 * 60,
    unreadForLearner: 0,
    messages: [
      {
        from: "learner",
        body: "Here's my write-up for the module three exercise.",
        minutesBefore: 140,
      },
      {
        from: "instructor",
        body: "Your project submission looks great!",
        minutesBefore: 0,
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

/**
 * The discount codes behind
 * `ui-design/light/dashboard/instructor/coupons-page__main.png`.
 *
 * Dates are **offsets in days from the run**, never literals, for the reason
 * `seedNotifications` gives about its own times: the export was drawn when
 * "today" sat before 12 Sep 2026, so its EARLYBIRD row is Active with an end
 * date that has since passed. Offsets keep the mix the page needs — several
 * running, one scheduled, one expired — whenever the seed happens to be run.
 *
 * **Eight of them belong to Simon Simorangkir**, whose six courses are the
 * ones the instructor surfaces demo against, so his page lands on the export's
 * own footer exactly: "Showing 1–5 of 8 coupons", across two pages. The last
 * three go to other instructors so the table is not a Simon-only fixture, and
 * so the course filter has something to filter.
 *
 * Two of the export's rows keep their codes and lose their prices:
 * `PYTHON30` and `REACTPRO` are drawn at $62.99 and $64.99, which imply list
 * prices the shipped catalog does not have ($89.99 and $99.99 against its
 * $84.99 and $89.99). The catalog wins, the call the admin Categories page's
 * percentages already settled — so the discount is reproduced and the price is
 * whatever it really works out to.
 *
 * `startsAt` sits well in the past on every running code on purpose: a coupon
 * can only be redeemed by an order placed while it was live, and the seeded
 * orders span two years, so a code that started last week would have almost
 * nothing to show.
 *
 * **The redemption limits are scaled to this seed, not copied from the
 * export.** Its caps run 150–500 against a platform doing ~400 orders in
 * total, which would leave every bar on the page 3% full and saying nothing —
 * the figure is the instructor's own choice, so the honest version of "212 of
 * 500" here is a cap somebody running this catalog would plausibly set. The
 * counts underneath are real either way: each one is `CouponRedemption` rows
 * against real orders, which is what that model's docstring demands.
 */
export const couponSeeds: {
  code: string
  courseSlug: string
  discountType: "PERCENT" | "FIXED_PRICE"
  /** Percent when PERCENT; ignored for FIXED_PRICE. */
  percentOff: number
  /** Dollars when FIXED_PRICE; ignored for PERCENT. */
  price: number
  redemptionLimit: number | null
  startsInDays: number
  endsInDays: number | null
}[] = [
  // -- Simon Simorangkir --------------------------------------------------
  {
    code: "LAUNCH40",
    courseSlug: "mastering-illustration",
    discountType: "PERCENT",
    percentOff: 40,
    price: 0,
    redemptionLimit: 40,
    startsInDays: -300,
    endsInDays: 21,
  },
  {
    code: "EARLYBIRD",
    courseSlug: "mastering-illustration",
    discountType: "PERCENT",
    percentOff: 60,
    price: 0,
    redemptionLimit: 20,
    startsInDays: -420,
    endsInDays: 9,
  },
  {
    // The export's Scheduled row, and the reason the status pill needs a third
    // colour at all.
    code: "FRIENDS25",
    courseSlug: "mastering-illustration",
    discountType: "PERCENT",
    percentOff: 25,
    price: 0,
    redemptionLimit: 30,
    startsInDays: 16,
    endsInDays: 120,
  },
  {
    code: "FIGMA30",
    courseSlug: "design-systems-in-figma",
    discountType: "PERCENT",
    percentOff: 30,
    price: 0,
    redemptionLimit: 60,
    startsInDays: -240,
    endsInDays: 48,
  },
  {
    // The one FIXED_PRICE code, so the column the dialog's second radio card
    // writes is exercised by something.
    code: "UXKICKOFF",
    courseSlug: "ux-research-fundamentals",
    discountType: "FIXED_PRICE",
    percentOff: 0,
    price: 19.99,
    redemptionLimit: 45,
    startsInDays: -180,
    endsInDays: 66,
  },
  {
    // No limit and no end date: the bar has no denominator to fill against,
    // which is the state `redemptionFraction` draws as an empty track.
    code: "COLOUR20",
    courseSlug: "colour-theory-for-designers",
    discountType: "PERCENT",
    percentOff: 20,
    price: 0,
    redemptionLimit: null,
    startsInDays: -150,
    endsInDays: null,
  },
  {
    // Expired, so the fourth tab has something in it.
    // Expired, so the fourth tab has something in it — and on a course with
    // real sales behind it, so the row shows a used-up code rather than an
    // empty bar. `icon-design-fundamentals` was the obvious home by name and
    // the wrong one by date: it publishes twelve days before the run, so a
    // code that started ten months ago would predate the course it discounts.
    code: "FIGMAEARLY",
    courseSlug: "design-systems-in-figma",
    discountType: "PERCENT",
    percentOff: 35,
    price: 0,
    redemptionLimit: 25,
    startsInDays: -300,
    endsInDays: -20,
  },
  {
    code: "ILLUSPRO",
    courseSlug: "advanced-illustration-techniques",
    discountType: "PERCENT",
    percentOff: 45,
    price: 0,
    redemptionLimit: 12,
    startsInDays: -60,
    endsInDays: 35,
  },
  // -- Other instructors ---------------------------------------------------
  {
    code: "PYTHON30",
    courseSlug: "python-for-everybody",
    discountType: "PERCENT",
    percentOff: 30,
    price: 0,
    redemptionLimit: 30,
    startsInDays: -240,
    endsInDays: 48,
  },
  {
    code: "REACTPRO",
    courseSlug: "the-complete-react-bootcamp",
    discountType: "PERCENT",
    percentOff: 35,
    price: 0,
    redemptionLimit: 25,
    startsInDays: -180,
    endsInDays: 66,
  },
  {
    code: "MLSTART20",
    courseSlug: "machine-learning-a-z",
    discountType: "PERCENT",
    percentOff: 20,
    price: 0,
    redemptionLimit: 35,
    startsInDays: -200,
    endsInDays: 90,
  },
]

/**
 * A tag per topic for the Discussions feed, drawn beside the topic's own chip.
 *
 * `discussions-page.png` shows two chips on most cards — the topic
 * ("Announcements", "Q&A") and something about the cohort ("Illustration",
 * "React") — so this pool supplies the second. The topic's name is
 * deliberately **not** in here: the card draws that from the relation, and
 * storing it as a tag too would be the same fact in two places, free to drift
 * the first time a topic is renamed.
 */
export const discussionTagPool: Record<string, string[]> = {
  announcements: ["Illustration", "React", "Python", "UX", "Cohort 12"],
  "q-and-a": ["React", "TypeScript", "Figma", "Pen tool", "Module 4"],
  challenges: ["Weekly", "Illustration", "Gradient mesh", "Icons"],
  showcase: ["Final projects", "UX", "Illustration", "Portfolio"],
  "instructor-lounge": ["Teaching", "Curriculum", "Payouts"],
  // Not "Rules": the card already draws the topic's own name as the
  // first chip, so it would read "Rules & Guidelines · Rules".
  "rules-and-guidelines": ["Moderation", "Conduct"],
  "career-advice": ["Portfolio", "Interviews", "Freelance"],
}

/**
 * Reply bodies for the community threads, cycled at random.
 *
 * `discussion-page__individual.png` draws four replies under its thread, so
 * the detail page needs rows rather than the counter `seedCommunity` used to
 * write on its own. They are deliberately generic: a reply that answered its
 * thread specifically would have to be authored 18,000 times, and a thread
 * whose replies visibly ignore it reads worse than one whose replies are
 * plausible small talk.
 */
export const replyBodies: string[] = [
  "This is exactly what I needed — thank you for writing it up.",
  "Following. I ran into the same thing on the last module.",
  "Great question. I had to read it twice before it clicked.",
  "Posting my attempt below, feedback welcome 🙌",
  "Worked for me after I restarted and cleared the cache.",
  "Could you share the file you used? Happy to compare notes.",
  "Same here — the second approach is much easier to follow.",
  "Adding to this: the shortcut in lesson 4 saves a lot of time.",
  "Thanks, this cleared up something I'd been stuck on all week.",
  "Noted — I'll try it tonight and report back.",
  "Really helpful, especially the part about naming layers.",
  "I think the docs are out of date here, this is the current way.",
]

// ---------------------------------------------------------------------------
// Course Q&A
// ---------------------------------------------------------------------------

/**
 * Questions for `ui-design/light/dashboard/instructor/Q&A-page.png` and its
 * thread page.
 *
 * The first three are the export's own rows, verbatim — including its
 * `Q&A-page__individual.png` answer thread, which is the one place the
 * instructor's voice is drawn. The rest are generated from this pool so the
 * tabs, the course filter and the pager all have something to do; a Q&A queue
 * of three rows would leave every control inert.
 *
 * `answeredByInstructor` is stated per seed rather than derived from whether
 * any reply happens to be staff-written: it is the column the pill, both tabs
 * and the sidebar badge read, and letting the seed and the app disagree about
 * it is exactly the drift `createQuestionReply` writes it in a transaction to
 * avoid.
 */
export const featuredQuestionSeeds: {
  courseSlug: string
  title: string
  body: string
  votes: number
  answered: boolean
  agoMinutes: number
  /**
   * `from: "instructor"` renders tinted and carries the Instructor pill.
   * `agoMinutes` is how long ago the reply was posted, so the thread reads
   * **downward from oldest** — the order the export draws (30m, 12m, 10m, 8m,
   * 5m, 2m ago).
   */
  replies: {
    from: "instructor" | "learner"
    body: string
    agoMinutes: number
  }[]
}[] = [
  {
    courseSlug: "mastering-illustration",
    title: "Does the shape builder work the same in the free trial version?",
    body: "I am on the trial and the shape builder panel looks different from the one in the video. Is it limited, or am I missing a setting?",
    votes: 7,
    answered: true,
    agoMinutes: 48,
    replies: [
      {
        from: "instructor",
        body: "Great question — all core tools including the shape builder are available in the trial. The panel is collapsed by default; enable it under Window › Shape Builder.",
        agoMinutes: 30,
      },
      {
        from: "learner",
        body: "Had the same issue. Enabling it from the Window menu fixed it for me too.",
        agoMinutes: 12,
      },
      {
        from: "learner",
        body: "Worth noting the panel is under a different menu on older versions — check Object if you cannot find it.",
        agoMinutes: 10,
      },
      {
        from: "learner",
        body: "Confirmed working on the trial here too. Thanks all.",
        agoMinutes: 8,
      },
      {
        from: "instructor",
        body: "Glad it is sorted. I have added a note to the lesson resources so this is clearer next time.",
        agoMinutes: 5,
      },
      {
        from: "learner",
        body: "This thread saved me an hour, appreciate it.",
        agoMinutes: 2,
      },
    ],
  },
  {
    courseSlug: "mastering-illustration",
    title: "Which font pairing do you recommend for editorial illustration?",
    body: "You mentioned pairing a grotesque with a serif but the file in the resources only has one font. Any specific pairing you would suggest?",
    votes: 4,
    answered: false,
    agoMinutes: 180,
    replies: [],
  },
  {
    courseSlug: "python-for-everybody",
    title:
      "My exported SVG looks blurry in the browser — what am I doing wrong?",
    body: "Exporting at the settings shown in the lesson, but the result is soft on a retina screen.",
    votes: 12,
    answered: true,
    agoMinutes: 24 * 60,
    replies: [
      {
        from: "instructor",
        body: "That is the viewBox rather than the export — set it to the artboard size and the browser will scale it cleanly at any density.",
        agoMinutes: 900,
      },
    ],
  },
]

/** Generated questions, so the tabs and the pager have something to work
 *  with. Cycled with a numeric suffix past the first pass, the way
 *  `communityTopicSeeds.subjects` is. */
export const questionSubjects: string[] = [
  "How do I keep the layer list manageable on a long project?",
  "Is there a shortcut for repeating the last transform?",
  "What is the difference between the two export presets?",
  "Should I flatten before handing off to a developer?",
  "The colour picker looks different from the video — has it moved?",
  "How long should I spend on thumbnails before committing?",
  "Any tips for keeping line weight consistent at small sizes?",
  "Which file format do you hand clients for print?",
  "Can I follow along on a tablet, or do I need a desktop?",
  "What is the recommended canvas size for the final project?",
  "My brush pressure stopped registering halfway through — ideas?",
  "Do you cover animating these illustrations later in the course?",
]

export const questionReplyBodies: string[] = [
  "Good question — I ran into the same thing in module two.",
  "Following, I would like to know this as well.",
  "The lesson resources have a file that shows this, check the zip.",
  "This worked for me once I restarted the app.",
  "Adding a screenshot below in case it helps anyone else.",
  "Thanks, that explains why mine looked different.",
]

/** The instructor's own answer on a generated question. Short on purpose —
 *  the long, specific answer is the export's, above. */
export const instructorAnswerBodies: string[] = [
  "Good spot — I cover this in the next lesson, but the short version is below.",
  "Yes, that is expected. Follow the steps in the lesson resources and it will line up.",
  "That is a setting rather than a bug — check the panel under Window and it should appear.",
  "Either approach works. I would use the first for anything you plan to hand off.",
]
