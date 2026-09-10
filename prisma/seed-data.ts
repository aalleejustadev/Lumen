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
}[] = [
  {
    name: "Nadia Rahman",
    email: "nadia.rahman@example.com",
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
