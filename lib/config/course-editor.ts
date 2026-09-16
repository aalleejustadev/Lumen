/**
 * Everything the course editor *says*, and nothing it counts — the split every
 * surface here makes. `lib/instructor-course-edit.ts` returns the facts,
 * `lib/actions/instructor-course-edit.ts` writes, and this is the vocabulary
 * the two exports draw:
 * `ui-design/light/dashboard/instructor/create-course-page.png` and
 * `create-course-page__curriculum.png`.
 *
 * **It holds no components.** The route imports it to resolve a step, so it is
 * a module shared with the server, and `lib/config/messages.ts` records what
 * happens when one of those starts carrying lucide icons. The lesson-type
 * glyphs are chosen in `lesson-row.tsx` instead.
 */

export type EditorStepKey =
  | "intended-learners"
  | "curriculum"
  | "landing-page"
  | "pricing"
  | "coupons"
  | "messages"

export type EditorStep = {
  key: EditorStepKey
  title: string
  /**
   * Whether the step has a screen behind it. All six do now; the flag stays in
   * the type for the reason `settingsNav`'s does — it is what lets a seventh
   * step be listed as an inert row before its screen exists, rather than as a
   * link onto a 404.
   */
  built: boolean
}

/**
 * The three groups, exactly as both exports draw them. The order is the order
 * an instructor works in, which is why Curriculum sits alone under "Create
 * your content" between planning and publishing.
 */
export const editorGroups: { title: string; steps: EditorStep[] }[] = [
  {
    title: "Plan your course",
    steps: [
      { key: "intended-learners", title: "Intended learners", built: true },
    ],
  },
  {
    title: "Create your content",
    steps: [{ key: "curriculum", title: "Curriculum", built: true }],
  },
  {
    title: "Publish your course",
    steps: [
      { key: "landing-page", title: "Course landing page", built: true },
      { key: "pricing", title: "Pricing", built: true },
      { key: "coupons", title: "Coupons", built: true },
      { key: "messages", title: "Course messages", built: true },
    ],
  },
]

export const editorSteps: EditorStep[] = editorGroups.flatMap(
  (group) => group.steps
)

/** Only the steps with a screen. An unbuilt step's URL falls back like an
 *  unknown one — otherwise `/edit/coupons` rendered the first step's form while
 *  the nav card highlighted Coupons. */
export const editorStepKeys = new Set<string>(
  editorSteps.filter((step) => step.built).map((step) => step.key)
)

/** The step a bare `/edit` lands on — the first one, as both exports show. */
export const FIRST_STEP: EditorStepKey = "intended-learners"

export function editorStepHref(courseSlug: string, step: EditorStepKey) {
  return `/dashboard/instructor/courses/${courseSlug}/edit/${step}`
}

/** `/edit/<anything unknown>` falls back rather than 404ing, the way
 *  `parseUsersQuery` falls back to its own default tab. */
export function parseEditorStep(value: string | undefined): EditorStepKey {
  return value && editorStepKeys.has(value)
    ? (value as EditorStepKey)
    : FIRST_STEP
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export const courseEditorCopy = {
  title: "Create Course",
  saveDraft: "Save draft",
  /** Why the header's Save draft is inert on a step with no pending form — the
   *  curriculum writes as you go and a coupon is written when it is created,
   *  so there is nothing for it to submit. */
  saveDraftUnavailable: {
    curriculum: "Curriculum changes save as you make them.",
    coupons: "Coupons save when you create them.",
  } as Partial<Record<EditorStepKey, string>>,
  preview: "Preview as student",
  publish: "Publish",
  stepUnavailable: "This step isn't built yet.",
  notFound: "That step doesn't exist yet.",
} as const

/**
 * **Publish means "submit for review" on this platform**, and the button says
 * so when pressed rather than in its label, which the export fixes as
 * "Publish".
 *
 * A course does not go on sale because its author says it is ready — it goes
 * into the console's review queue at `/dashboard/admin/courses`, which is the
 * surface `CourseSubmission` and `CourseStatus.IN_REVIEW` exist for. Wiring
 * this button straight to PUBLISHED would make that whole queue decorative,
 * the call `canTeach` already makes about `User.intent`.
 */
export const publishCopy = {
  title: "Submit this course for review?",
  description:
    "Our team checks every course before it goes on sale — usually within two business days. You can keep editing while it's in review.",
  confirm: "Submit for review",
  /** Why the button is inert, by status. */
  unavailable: {
    IN_REVIEW: "This course is already with the review team.",
    PUBLISHED: "This course is already published.",
    ARCHIVED: "Republish this course from its manage page first.",
    REJECTED: "This course was turned down and can't be resubmitted.",
  } as Record<string, string | undefined>,
} as const

/**
 * `/dashboard/instructor/courses/new` — the one screen with no export.
 *
 * It exists because the sidebar's **Create Course** row has to lead somewhere,
 * and a course cannot be written without a title and a category: those are the
 * two required columns on `Course` that only its author can answer. Everything
 * else takes a draft's honest default and is filled in on the step that owns
 * it, so this stays two fields rather than becoming the Course landing page
 * step in the wrong place.
 *
 * It is a **page rather than a link that creates on click**, which matters:
 * Next prefetches links on hover, so a GET that wrote a row would mint a draft
 * course every time the cursor crossed the sidebar.
 */
export const newCourseCopy = {
  title: "Create Course",
  lead: "Two things to start with. You can change everything else — the price, the description, the cover — on the steps that follow.",
  name: {
    label: "What is your course called?",
    help: "You can rename it later; the web address stays as first written.",
    placeholder: "e.g. Mastering Illustration",
  },
  category: {
    label: "Which category does it belong in?",
    placeholder: "Choose a category",
  },
  submit: "Create course",
  back: "Back to My Courses",
} as const

export const intendedLearnersCopy = {
  heading: "Intended learners",
  lead: "The descriptions you write here appear on your course landing page and help the right learners find you.",
  outcomes: {
    label: "What will students learn?",
    help: "List at least four outcomes learners can expect.",
    placeholder: "Add another outcome",
  },
  requirements: {
    label: "Requirements",
    placeholder: "Add a requirement",
  },
  audience: {
    label: "Who is this course for?",
    placeholder:
      "Describe the learner this course is written for — their level, their goal, what they already know.",
  },
  save: "Save changes",
  remove: "Remove",
} as const

/**
 * The Course landing page step, from `create-course-page__landing-page.png` —
 * the export's own words. The limits are the catalog's: a title has to fit a
 * course card on two lines and a subtitle the sale page's hero on one.
 */
export const landingPageCopy = {
  heading: "Course landing page",
  lead: "This is what learners see before they enrol. A sharp title and cover image do most of the work.",
  title: { label: "Course title", placeholder: "e.g. Mastering Illustration" },
  subtitle: {
    label: "Subtitle",
    placeholder: "One line on what learners will be able to do",
  },
  description: {
    label: "Description",
    placeholder:
      "What the course covers and why it matters. Leave a blank line between paragraphs.",
  },
  cover: {
    label: "Cover image",
    upload: "Upload image",
    replace: "Replace image",
    uploading: "Uploading…",
    updated: "Cover image updated.",
    wrongType: "Use a JPEG, PNG or WebP image.",
    tooLarge: "Images must be under 4 MB.",
    unconfigured: "Image uploads aren't configured for this environment yet.",
  },
  save: "Save landing page",
  saved: "Landing page saved.",
  errors: {
    title: "Give your course a title.",
  },
} as const

export const LANDING_LIMITS = {
  title: 120,
  subtitle: 160,
  description: 5000,
} as const

/** A cover is drawn at card and banner sizes, never larger, so the avatar's
 *  4 MB and still-image types are the right ceiling. GIF is left out: a cover
 *  that animates on every card in the catalog is not a thumbnail. */
export const COVER_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const
export const COVER_MAX_BYTES = 4 * 1024 * 1024

/**
 * The Pricing step, from `create-course-page__pricing.png`.
 */
export const pricingCopy = {
  heading: "Pricing",
  lead: "Set your list price. Lumen Business subscribers can always access your course, and you earn per minute watched.",
  currency: { label: "Currency" },
  listPrice: { label: "List price", placeholder: "Choose a price" },
  business: {
    title: "Include in Lumen Business",
    description: "Reach subscribers and earn from watch time.",
  },
  promotion: {
    heading: "Current promotion",
    none: "No coupon is running on this course right now.",
    manage: "Manage coupons",
    discount: (percentOff: number) => `${percentOff}% off`,
    redemptions: (count: number) =>
      `${new Intl.NumberFormat("en-US").format(count)} ${
        count === 1 ? "redemption" : "redemptions"
      }`,
  },
  save: "Save pricing",
  saved: "Pricing saved.",
  errors: {
    price: "Choose a list price.",
    currency: "Choose a currency.",
  },
} as const

/**
 * **One currency, and the select says so rather than offering more.** Every
 * money path in the app — the cart, Stripe's `line_items`, the coupon table,
 * the payout ledger — is written in US dollars, and a checkout session cannot
 * mix currencies across the courses in one cart. Listing EUR here would let an
 * instructor pick a price nothing downstream can charge. Add a row when the
 * cart can hold one.
 */
export const COURSE_CURRENCIES = [{ value: "usd", label: "USD ($)" }] as const

/**
 * The export draws List price as a **select**, not a number field — a fixed
 * ladder of prices, which is how course marketplaces keep a catalog's prices
 * comparable and every one of them a ".99". There is no Free tier: a $0 line
 * item cannot go through Stripe checkout, and free enrolment is not a flow
 * this app has.
 */
export const PRICE_TIERS_CENTS = [
  1999, 2499, 2999, 3499, 3999, 4499, 4999, 5499, 5999, 6499, 6999, 7499, 7999,
  8499, 8999, 9499, 9999, 10999, 11999, 12999, 13999, 14999, 15999, 17999,
  19999,
] as const

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

/**
 * The Coupons step, from `create-course-page__coupons.png`. The rules behind
 * it — code format, the three-active limit, ownership — are the Coupons page's,
 * enforced once in `lib/actions/instructor-coupons.ts`.
 */
export const courseCouponsCopy = {
  heading: "Coupons",
  lead: "Create discount codes for launches, partners, or your mailing list. You can run up to three active coupons at a time.",
  newCoupon: "New coupon",
  stats: {
    active: "Active coupons",
    redemptions: "Redemptions",
    revenue: "Revenue from coupons",
  },
  columns: {
    code: "Code",
    discount: "Discount",
    price: "Price",
    usage: "Usage",
    status: "Status",
  },
  discount: (percentOff: number) => `${percentOff}% off`,
  /** The date beside the pill, by status — the export's three shapes. */
  when: {
    active: (date: string | null) => date ?? "No end date",
    scheduled: (date: string) => `Starts ${date}`,
    expired: (date: string) => `Ended ${date}`,
  },
  actions: {
    label: (code: string) => `Actions for ${code}`,
    edit: "Edit",
    copy: "Copy code",
    copied: (code: string) => `${code} copied.`,
    end: "End coupon",
    endScheduled: "Cancel coupon",
    ended: (code: string) => `${code} ended.`,
    expired: "This coupon has already ended.",
  },
  empty: {
    title: "No coupons yet",
    description:
      "Create a code below and it applies at checkout for this course.",
  },
  create: {
    heading: "Create a coupon",
    code: "Code",
    codePlaceholder: "AUTUMN30",
    discount: "Discount",
    limit: "Redemption limit",
    limitPlaceholder: "Unlimited",
    expires: "Expires",
    expiresPlaceholder: "Pick a date",
    clearDate: "No end date",
    submit: "Create coupon",
  },
  /** Needs a price before a percentage means anything. */
  needsPrice: "Set a list price on the Pricing step before creating a coupon.",
} as const

/** The quick form's discount choices. The full dialog behind *New coupon*
 *  takes any percentage, or a fixed price. */
export const COUPON_PERCENT_OPTIONS = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90,
] as const

/**
 * The Course messages step, from `create-course-page__messages.png` — the
 * export's own words, and the limit a chat bubble stays readable at.
 */
export const courseMessagesCopy = {
  heading: "Course messages",
  lead: "Automatic messages sent to every learner. Leave one blank to skip it.",
  welcome: {
    label: "Welcome message",
    placeholder: "Sent when a learner enrols.",
  },
  congratulations: {
    label: "Congratulations message",
    placeholder: "Sent when a learner finishes the course.",
  },
  save: "Save messages",
  saved: "Messages saved.",
} as const

export const COURSE_MESSAGE_MAX = 1000

export const curriculumCopy = {
  heading: "Curriculum",
  /** "6 lessons across 3 sections · drag a row or use the arrows to reorder" —
   *  the export's own line, and the second half of it is a promise the page
   *  keeps: rows really do drag, and the arrows are the keyboard path to the
   *  same move. */
  summary: (lessons: number, sections: number) =>
    `${lessons} ${lessons === 1 ? "lesson" : "lessons"} across ${sections} ${
      sections === 1 ? "section" : "sections"
    } · drag a row or use the arrows to reorder`,
  empty: {
    title: "No sections yet",
    description:
      "A course is built from sections, and each section holds its lessons. Add the first one to get started.",
  },
  addSection: "Add section",
  newSectionTitle: "Untitled section",
  sectionLabel: (index: number) => `Section ${index + 1}`,
  lessonCount: (count: number) =>
    `${count} ${count === 1 ? "lesson" : "lessons"}`,
  sectionTitlePlaceholder: "Name this section",
  lessonTitlePlaceholder: "Name this lesson",
  /**
   * What an inline field says once its edit has landed.
   *
   * Every other write on this step announces itself by changing the list — a
   * row appears, a row moves, a row goes — so the screen is its own
   * confirmation and a toast per click would be the noise `addLesson`
   * deliberately stays silent to avoid. A rename is the exception: the text is
   * already on screen the instant it is typed, so committing it changes
   * nothing visible, and an edit that is only *probably* saved is worse than
   * one that says so. The action is what is confirmed, in the past tense,
   * rather than the value, which the row already shows.
   */
  saved: {
    section: "Section renamed.",
    lesson: "Lesson renamed.",
    duration: "Lesson length updated.",
    questions: "Question count updated.",
  },
  moveUp: "Move up",
  moveDown: "Move down",
  removeSection: "Delete section",
  removeLesson: "Delete lesson",
  preview: "Preview",
  /** Free-preview is a property of a *lesson a student could buy into*, so it
   *  is offered on video and article rows and not on a quiz — which is what
   *  the export draws, its quiz row carrying "Edit quiz" in that slot. */
  editQuiz: "Edit quiz",
  editArticle: "Edit article",
  uploadVideo: "Upload video",
  /** A video row that already has one — the dialog replaces or removes it. */
  editVideo: "Edit video",
  /** Why a row's editor button is inert for the moment after it is added. */
  settling: "Saving this lesson…",
  addLesson: { VIDEO: "Video", ARTICLE: "Article", QUIZ: "Quiz" },
  newLessonTitle: {
    VIDEO: "New video lesson",
    ARTICLE: "New article",
    QUIZ: "New quiz",
  },
  /**
   * The meta each row draws to the right of its type pill.
   *
   * **The export writes "04:12" and this writes "4 min"**, because
   * `CourseLesson.durationMinutes` is an `Int` — there is no seconds column,
   * so the drawn value cannot be stored, let alone edited. Add one if the
   * minute is ever too coarse; nothing above this line changes.
   */
  meta: {
    VIDEO: (minutes: number | null) =>
      minutes === null ? "Set length" : `${minutes} min`,
    ARTICLE: (minutes: number | null) =>
      minutes === null ? "Set length" : `${minutes} min read`,
    QUIZ: (questions: number | null) =>
      questions === null
        ? "Set questions"
        : `${questions} ${questions === 1 ? "question" : "questions"}`,
  },
} as const

/**
 * The editor for one lesson's content hangs off the course editor's own URL, so
 * the nav card's "you are editing this course" context survives the trip —
 * `/edit/article/<lessonId>` and `/edit/quiz/<lessonId>`. Both are static
 * segments beside `[step]`, which the App Router matches first.
 */
export function editorArticleHref(courseSlug: string, lessonId: string) {
  return `/dashboard/instructor/courses/${courseSlug}/edit/article/${lessonId}`
}

export function editorQuizHref(courseSlug: string, lessonId: string) {
  return `/dashboard/instructor/courses/${courseSlug}/edit/quiz/${lessonId}`
}

// ---------------------------------------------------------------------------
// Lesson video
// ---------------------------------------------------------------------------

/**
 * What the browser may upload. Client-safe on purpose — the file picker is a
 * Client Component and `lib/storage.ts` is `server-only`, the split
 * `lib/config/settings.ts` makes for avatars. The action re-checks both against
 * what the bucket reports actually landed.
 *
 * MP4, WebM and QuickTime are the three a browser's own `<video>` can play;
 * anything else would upload fine and then never render for a student.
 */
export const LESSON_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const
export const LESSON_VIDEO_MAX_BYTES = 2 * 1024 * 1024 * 1024

export const lessonVideoCopy = {
  title: "Lesson video",
  lead: "This is what students watch for this lesson. The lesson's length is taken from the video.",
  choose: "Choose a video",
  dropHint: "MP4, WebM or MOV, up to 2 GB",
  drop: "Drop a video here, or",
  uploading: (percent: number) => `Uploading… ${percent}%`,
  finishing: "Finishing up…",
  replace: "Replace video",
  remove: "Remove video",
  cancel: "Cancel upload",
  uploaded: "Video uploaded.",
  removed: "Video removed.",
  tooLarge: "That video is larger than 2 GB.",
  wrongType: "Upload an MP4, WebM or MOV file.",
  failed: "The upload didn't finish. Try again.",
  unconfigured: "Video uploads aren't configured on this environment.",
} as const

// ---------------------------------------------------------------------------
// Article
// ---------------------------------------------------------------------------

export const articleEditorCopy = {
  back: "Back to curriculum",
  eyebrow: "Article",
  lead: "Students read this as the lesson. Its reading time is worked out from the length when you save.",
  placeholder: "Start writing your article…",
  save: "Save article",
  saved: "Article saved.",
  unsaved: "Unsaved changes",
  allSaved: "All changes saved",
  toolbar: {
    paragraph: "Paragraph",
    heading2: "Heading",
    heading3: "Subheading",
    bulletList: "Bulleted list",
    orderedList: "Numbered list",
    bold: "Bold",
    italic: "Italic",
    undo: "Undo",
    redo: "Redo",
  },
} as const

/** The article is stored as the editor's own JSON, capped here so a paste of
 *  a whole book is refused rather than written. */
export const ARTICLE_MAX_CHARS = 200_000

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

/**
 * The quiz editor is drawn with the student quiz page's own parts
 * (`quiz-page.png`), so these limits are that page's too: it letters options
 * A–F, which is where six comes from, and a question needs a second option to
 * be a choice at all.
 */
export const QUIZ_LIMITS = {
  questions: 50,
  minOptions: 2,
  maxOptions: 6,
  prompt: 500,
  option: 200,
} as const

export const quizEditorCopy = {
  back: "Back to curriculum",
  title: (lesson: string) => `Quiz · ${lesson}`,
  counter: (index: number, total: number) =>
    `Question ${index + 1} of ${total}`,
  lead: "Write each question, then pick the correct answer by clicking its letter. Students see these exactly as laid out here.",
  promptPlaceholder: "Write your question",
  optionPlaceholder: (letter: string) => `Answer ${letter}`,
  markCorrect: (letter: string) => `Mark ${letter} as the correct answer`,
  correct: "Correct answer",
  addOption: "Add answer",
  removeOption: "Remove answer",
  addQuestion: "Add question",
  deleteQuestion: "Delete question",
  previous: "Previous",
  next: "Next",
  save: "Save quiz",
  saved: "Quiz saved.",
  unsaved: "Unsaved changes",
  allSaved: "All changes saved",
  jumpTo: (index: number) => `Go to question ${index + 1}`,
  /** Validation, phrased against the question number the instructor sees. */
  errors: {
    noQuestions: "Add at least one question.",
    tooMany: `A quiz can hold up to ${QUIZ_LIMITS.questions} questions.`,
    prompt: (n: number) => `Question ${n} needs a question.`,
    options: (n: number) =>
      `Question ${n} needs at least ${QUIZ_LIMITS.minOptions} answers.`,
    blankOption: (n: number) => `Question ${n} has an empty answer.`,
    duplicate: (n: number) => `Question ${n} has the same answer twice.`,
    correct: (n: number) => `Pick the correct answer for question ${n}.`,
  },
} as const

/**
 * The confirmation behind both trash buttons on the Curriculum step.
 *
 * **Neither export draws it, and it is not an embellishment.** Every other
 * control on that step is either reversible by the control beside it (an
 * arrow moves a row back, a rename types over itself) or adds something. These
 * two take work away and cannot be undone — there is no trash to restore from
 * — so they are the one place the step stops and asks, the same reading
 * `delete-category-dialog.tsx` records about its own menu item.
 *
 * **The section copy names the lessons it will take with it.**
 * `CourseLesson.section` cascades, so deleting a section is strictly the more
 * destructive of the two; saying "and its 6 lessons" before the click is
 * better than the toast that used to say it afterwards.
 */
export const deleteCurriculumCopy = {
  lesson: {
    title: "Delete this lesson?",
    description: (name: string) =>
      `“${name}” will be removed from the curriculum. This can't be undone.`,
    submit: "Delete lesson",
  },
  section: {
    title: "Delete this section?",
    description: (name: string, lessons: number) =>
      lessons === 0
        ? `“${name}” will be removed from the curriculum. This can't be undone.`
        : `“${name}” and the ${lessons === 1 ? "lesson" : `${lessons} lessons`} inside it will be removed. This can't be undone.`,
    submit: "Delete section",
  },
} as const

/** The three lesson kinds this builder can add, in the export's own order. */
export const LESSON_KINDS = ["VIDEO", "ARTICLE", "QUIZ"] as const
export type LessonKind = (typeof LESSON_KINDS)[number]

/**
 * The type pill and its icon tile, sampled off the curriculum export: video is
 * the blue `--accent-2`, article the green `--success`, quiz the violet
 * `--accent-1`. Tokens rather than the drawn hexes so dark mode follows, the
 * choice `billing-transactions.tsx` documents.
 */
export const lessonKindTone: Record<
  LessonKind,
  { pill: string; tile: string; label: string }
> = {
  VIDEO: {
    pill: "bg-accent-2/10 text-accent-2",
    tile: "bg-accent-2/10 text-accent-2",
    label: "Video",
  },
  ARTICLE: {
    pill: "bg-success/10 text-success",
    tile: "bg-success/10 text-success",
    label: "Article",
  },
  QUIZ: {
    pill: "bg-accent-1/10 text-accent-1",
    tile: "bg-accent-1/10 text-accent-1",
    label: "Quiz",
  },
}
