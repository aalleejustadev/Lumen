"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { notifyCourseSubmitted } from "@/lib/notify"
import { canTeach, getInstructorProfile } from "@/lib/instructor"
import {
  articleWordCount,
  sanitizeArticle,
  type ArticleDoc,
} from "@/lib/article-body"
import {
  ARTICLE_MAX_CHARS,
  articleEditorCopy,
  COURSE_CURRENCIES,
  COURSE_MESSAGE_MAX,
  courseMessagesCopy,
  COVER_MAX_BYTES,
  COVER_MIME_TYPES,
  curriculumCopy,
  LANDING_LIMITS,
  landingPageCopy,
  PRICE_TIERS_CENTS,
  pricingCopy,
  LESSON_VIDEO_MAX_BYTES,
  LESSON_VIDEO_TYPES,
  lessonVideoCopy,
  quizEditorCopy,
  QUIZ_LIMITS,
  type LessonKind,
} from "@/lib/config/course-editor"
import type {
  EditorLesson,
  EditorSection,
  EditorVideo,
} from "@/lib/instructor-course-edit"
import { validateQuizDraft, type QuizDraftQuestion } from "@/lib/quiz-draft"
import {
  createLessonVideoUpload,
  deleteCourseCover,
  deleteLessonObject,
  putCourseCover,
  inspectObject,
  lessonVideoPrefix,
} from "@/lib/storage"

/**
 * The writes behind the course editor. Reads live in
 * `lib/instructor-course-edit.ts`.
 *
 * **Every one of them resolves the course through `owned()`**, which takes the
 * instructor from the session and puts `instructorId` in the `where` — never a
 * check on an id the browser sent. Course, section and lesson ids all reach
 * the client, so an action that trusted the one it was handed would let any
 * instructor rewrite somebody else's syllabus. A section or lesson is reached
 * *through* its course for the same reason, so a stray `sectionId` cannot be
 * used to reach across catalogs. It re-checks `canTeach` too — the function
 * `app/(instructor)/layout.tsx` guards the shell with, so the two cannot
 * disagree — because a Server Action is a public endpoint and the layout's
 * guard covers the page, not this.
 *
 * Three more rules hold across the file:
 *
 *  - **Order is always rewritten as a dense 0..n-1 run**, never patched. Two
 *    rows sharing an `order` would shuffle between renders, and a gap left by
 *    a delete would make "move down" a no-op at the edge. `resequence()` is
 *    the one helper, so a new mutation cannot opt out.
 *  - **`Course.lessonCount` and `totalDurationMinutes` are recomputed from the
 *    rows after anything that could move them**, rather than incremented.
 *    Four other surfaces draw `lessonCount`, and a counter that drifts is
 *    wrong in all of them at once.
 *  - **Everything returns `{ ok, message }` for the caller to toast** rather
 *    than throwing, the shape `lib/actions/cart.ts` set.
 */

export type EditorActionResult = { ok: boolean; message: string }

const DENIED: EditorActionResult = {
  ok: false,
  message: "Only the instructor who owns this course can edit it.",
}
const MISSING: EditorActionResult = {
  ok: false,
  message: "That course could not be found.",
}

/** The one resolver every action below starts from. */
async function owned(courseId: string) {
  const session = await getSession()
  if (!session) return null
  if (!(await canTeach(session.user))) return null

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return null

  const course = await db.course.findFirst({
    where: { id: courseId, instructorId: profile.id },
    select: { id: true, slug: true, title: true, status: true },
  })
  if (!course) return null

  return { course, userId: session.user.id, role: session.user.role ?? null }
}

/**
 * Revalidates the **dashboard layout**, which is what carries the editor, the
 * manage page, My Courses and the sidebar's counts at once — the mechanism
 * `lib/actions/wishlist.ts` documents. A course whose lesson count changed
 * moves the manage page's "4 sections · 25 lessons" row and My Courses' lesson
 * chip, so revalidating only this page would leave both stale behind a back
 * button.
 *
 * **Only the writes that change something outside this page call it**, and
 * that is deliberate rather than an omission. Reordering a lesson and renaming
 * one change nothing any other surface draws, and a revalidation re-renders
 * the whole dashboard tree and streams fresh props back — which, on a control
 * somebody drags, reads as the editor stuttering under their hand. The board
 * applies those optimistically and never hears back unless the write failed;
 * see `curriculum-board.tsx`.
 */
function revalidateEditor() {
  revalidatePath("/dashboard", "layout")
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * The one write that does **not** start from `owned()`, because there is no
 * course yet — what `/dashboard/instructor/courses/new` posts.
 *
 * **It asks for a title and a category and nothing else.** Those are the two
 * columns a `Course` cannot be written without that only its author can
 * answer; every other required field takes a draft's honest default (no
 * subtitle, no price, no duration) and is filled in on the steps that own it.
 * Asking for more here would be building the Course landing page step in the
 * wrong place.
 *
 * The slug is derived once and **never re-derived on a rename**, the call
 * `admin-categories.ts` records about its own: it is the course's stable key,
 * and every route under `/dashboard/instructor/courses/…` is built from it.
 */
export async function createCourse(input: {
  title: string
  categoryId: string
}): Promise<EditorActionResult & { slug?: string }> {
  const session = await getSession()
  if (!session) return DENIED
  if (!(await canTeach(session.user))) return DENIED

  const profile = await getInstructorProfile(session.user.id)
  if (!profile) return DENIED

  const title = input.title.trim().slice(0, 200)
  if (title === "") return { ok: false, message: "Give your course a title." }

  const category = await db.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  })
  if (!category) return { ok: false, message: "Pick a category." }

  const course = await db.course.create({
    data: {
      slug: await uniqueCourseSlug(title),
      title,
      subtitle: "",
      instructorId: profile.id,
      categoryId: category.id,
      level: "BEGINNER",
      durationHours: 0,
      priceCents: 0,
      listPriceCents: 0,
      status: "DRAFT",
    },
    select: { slug: true },
  })

  revalidateEditor()
  return { ok: true, message: "", slug: course.slug }
}

/** A numeric suffix on collision rather than a failed write — the behaviour
 *  `admin-categories.ts` settled for category slugs. */
async function uniqueCourseSlug(title: string): Promise<string> {
  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "course"

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const slug = suffix === 0 ? base : `${base}-${suffix + 1}`
    const taken = await db.course.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!taken) return slug
  }
  return `${base}-${Date.now()}`
}

// ---------------------------------------------------------------------------
// Intended learners
// ---------------------------------------------------------------------------

/**
 * The one form on the first step. It takes a **typed payload rather than
 * `FormData`**, for `notifications-form.tsx`' reason: the outcome and
 * requirement lists are already React state (rows are added and removed
 * client-side), so reading them back off the DOM would only add a way for the
 * two to disagree. It is still validated here — a Server Action is a public
 * endpoint.
 *
 * Blank rows are dropped rather than rejected: the export's list ends in an
 * empty "Add another outcome" box, so submitting with one untouched is the
 * ordinary case, not a mistake worth a toast.
 */
export async function saveIntendedLearners(
  courseId: string,
  input: {
    learningOutcomes: string[]
    requirements: string[]
    intendedAudience: string
  }
): Promise<EditorActionResult> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const clean = (rows: string[]) =>
    rows
      .map((row) => row.trim())
      .filter((row) => row !== "")
      .slice(0, 20)
      .map((row) => row.slice(0, 300))

  const audience = input.intendedAudience.trim().slice(0, 1000)

  await db.course.update({
    where: { id: found.course.id },
    data: {
      learningOutcomes: clean(input.learningOutcomes),
      requirements: clean(input.requirements),
      // Empty means "not answered", which is what `intendedAudience` being
      // nullable says — storing "" would make the step read as complete.
      intendedAudience: audience === "" ? null : audience,
    },
  })

  revalidateEditor()
  return { ok: true, message: "Saved." }
}

// ---------------------------------------------------------------------------
// Course landing page
// ---------------------------------------------------------------------------

/**
 * The Course landing page step's fields — title, subtitle, description.
 *
 * **Renaming a course does not move its slug**, the call `createCourse`
 * records: the slug is the course's stable key and every route under
 * `/dashboard/instructor/courses/…` is built from it, so the editor you are
 * standing in keeps working after the save.
 *
 * The description arrives as one string and is stored as `Course.description`'s
 * paragraphs, split on blank lines — the shape the sale page's "About" card
 * renders one `<p>` per entry from.
 */
export async function saveLandingPage(
  courseId: string,
  input: { title: string; subtitle: string; description: string }
): Promise<EditorActionResult> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const title = String(input.title ?? "")
    .trim()
    .slice(0, LANDING_LIMITS.title)
  if (title === "") {
    return { ok: false, message: landingPageCopy.errors.title }
  }
  const subtitle = String(input.subtitle ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LANDING_LIMITS.subtitle)
  const description = String(input.description ?? "")
    .slice(0, LANDING_LIMITS.description)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "")

  await db.course.update({
    where: { id: found.course.id },
    data: { title, subtitle, description },
  })

  revalidateEditor()
  return { ok: true, message: landingPageCopy.saved }
}

/**
 * The cover image. **It applies on pick**, like the profile page's avatar,
 * while the fields beside it wait for *Save landing page* — the arrangement
 * that page already has, and the reason an image is not lost to a stray click
 * away from unsaved text. The old object is collected only after the column
 * points at the new one.
 */
export async function uploadCourseCover(
  courseId: string,
  formData: FormData
): Promise<EditorActionResult & { url?: string }> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const file = formData.get("image")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: landingPageCopy.cover.wrongType }
  }
  if (!(COVER_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, message: landingPageCopy.cover.wrongType }
  }
  if (file.size > COVER_MAX_BYTES) {
    return { ok: false, message: landingPageCopy.cover.tooLarge }
  }

  const url = await putCourseCover(found.course.id, {
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type,
  })
  if (!url) return { ok: false, message: landingPageCopy.cover.unconfigured }

  const previous = await db.course.findUnique({
    where: { id: found.course.id },
    select: { thumbnailUrl: true },
  })
  await db.course.update({
    where: { id: found.course.id },
    data: { thumbnailUrl: url },
  })
  await deleteCourseCover(found.course.id, previous?.thumbnailUrl ?? null)

  revalidateEditor()
  return { ok: true, message: landingPageCopy.cover.updated, url }
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/**
 * The Pricing step. Three things decide what it writes:
 *
 *  - **Only a price on the ladder is accepted** (`PRICE_TIERS_CENTS`), which is
 *    what the export's select offers — with one exception: the price the course
 *    already has, so saving the business toggle on a seeded course priced off
 *    the ladder does not force a re-price.
 *  - **The list price moves the sale price with it.** `Course.listPriceCents`
 *    is the struck-through figure and `priceCents` what a learner pays. With no
 *    sale running the two are the same number; while one is running
 *    (`saleEndsAt` in the future) the discount is kept as a *percentage*, so a
 *    cheaper list price can never leave a "sale" price above it.
 *  - **Coupons are not re-priced.** `Coupon.resultingPriceCents` is a snapshot
 *    by design — the price a learner was promised when the code went out.
 */
export async function savePricing(
  courseId: string,
  input: {
    currency: string
    listPriceCents: number
    includedInBusiness: boolean
  }
): Promise<EditorActionResult> {
  const found = await owned(courseId)
  if (!found) return DENIED

  if (
    !COURSE_CURRENCIES.some((currency) => currency.value === input.currency)
  ) {
    return { ok: false, message: pricingCopy.errors.currency }
  }

  const course = await db.course.findUnique({
    where: { id: found.course.id },
    select: { priceCents: true, listPriceCents: true, saleEndsAt: true },
  })
  if (!course) return MISSING

  const list = Math.round(Number(input.listPriceCents))
  const allowed =
    (PRICE_TIERS_CENTS as readonly number[]).includes(list) ||
    (list === course.listPriceCents && list > 0)
  if (!allowed) return { ok: false, message: pricingCopy.errors.price }

  const onSale =
    course.saleEndsAt !== null &&
    course.saleEndsAt > new Date() &&
    course.listPriceCents > 0 &&
    course.priceCents < course.listPriceCents
  const price = onSale
    ? Math.round((list * course.priceCents) / course.listPriceCents)
    : list

  await db.course.update({
    where: { id: found.course.id },
    data: {
      currency: input.currency,
      listPriceCents: list,
      priceCents: price,
      includedInBusiness: input.includedInBusiness === true,
    },
  })

  revalidateEditor()
  return { ok: true, message: pricingCopy.saved }
}

// ---------------------------------------------------------------------------
// Course messages
// ---------------------------------------------------------------------------

/**
 * The Course messages step — `Course.welcomeMessage` and
 * `congratulationsMessage`. **Blank is stored as null**, which is what the
 * columns' own note means by "blank skips the message": an empty string would
 * be a message with nothing in it, and would tick the step.
 *
 * **Nothing sends them yet, and that is not an omission in this action.** The
 * welcome message belongs on enrolment and the congratulations on completion,
 * and neither event has a writer: checkout fulfilment (`lib/orders.ts`) marks
 * the order paid without creating an `Enrollment`, and nothing sets
 * `Enrollment.completedAt`. The sender belongs beside whichever code first
 * writes those rows — as a message from the instructor in the course's
 * `Conversation`, the thread the Messages page already draws.
 */
export async function saveCourseMessages(
  courseId: string,
  input: { welcomeMessage: string; congratulationsMessage: string }
): Promise<EditorActionResult> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const clean = (value: unknown) => {
    const text = String(value ?? "")
      .trim()
      .slice(0, COURSE_MESSAGE_MAX)
    return text === "" ? null : text
  }

  await db.course.update({
    where: { id: found.course.id },
    data: {
      welcomeMessage: clean(input.welcomeMessage),
      congratulationsMessage: clean(input.congratulationsMessage),
    },
  })

  revalidateEditor()
  return { ok: true, message: courseMessagesCopy.saved }
}

// ---------------------------------------------------------------------------
// Curriculum — sections
// ---------------------------------------------------------------------------

export async function addSection(
  courseId: string
): Promise<EditorActionResult & { section?: EditorSection }> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const count = await db.courseSection.count({
    where: { courseId: found.course.id },
  })
  const created = await db.courseSection.create({
    data: {
      courseId: found.course.id,
      title: curriculumCopy.newSectionTitle,
      order: count,
    },
    select: { id: true, title: true },
  })

  // Handed back for `addLesson`' reason: the board drew a placeholder the
  // instant the button was pressed, and without the real id the rename that
  // usually follows immediately would address a section the server has never
  // heard of.
  revalidateEditor()
  return {
    ok: true,
    message: "",
    section: { id: created.id, title: created.title, lessons: [] },
  }
}

export async function renameSection(
  courseId: string,
  sectionId: string,
  title: string
): Promise<EditorActionResult> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const trimmed = title.trim().slice(0, 200)
  if (trimmed === "") {
    return { ok: false, message: "A section needs a name." }
  }

  // Scoped by `courseId` as well as `id`: a section id from another
  // instructor's course must miss rather than match.
  const { count } = await db.courseSection.updateMany({
    where: { id: sectionId, courseId: found.course.id },
    data: { title: trimmed },
  })
  if (count === 0) return MISSING

  // No revalidation: a section's name is drawn nowhere but here.
  return { ok: true, message: "" }
}

export async function deleteSection(
  courseId: string,
  sectionId: string
): Promise<EditorActionResult> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const section = await db.courseSection.findFirst({
    where: { id: sectionId, courseId: found.course.id },
    select: {
      id: true,
      title: true,
      _count: { select: { lessons: true } },
      lessons: { select: { id: true } },
    },
  })
  if (!section) return MISSING

  // `CourseLesson.section` cascades, so the lessons go with it. That is the
  // case Postgres would *not* stop — the trap the admin Community page's
  // topic delete documents — so the count is said out loud in the toast
  // rather than discovered afterwards.
  await db.$transaction(async (tx) => {
    await tx.courseSection.delete({ where: { id: section.id } })
    await resequence(tx, found.course.id)
  })
  await dropLessonVideos(
    found.course.id,
    section.lessons.map((lesson) => lesson.id)
  )
  await syncCourseTotals(found.course.id)

  revalidateEditor()
  return {
    ok: true,
    message:
      section._count.lessons === 0
        ? `“${section.title}” deleted.`
        : `“${section.title}” and its ${section._count.lessons} ${
            section._count.lessons === 1 ? "lesson" : "lessons"
          } deleted.`,
  }
}

export async function moveSection(
  courseId: string,
  sectionId: string,
  /** The 0-based position to land on. The client sends a destination rather
   *  than a direction so one action serves both the arrows and a drag. */
  toIndex: number
): Promise<EditorActionResult> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const sections = await db.courseSection.findMany({
    where: { courseId: found.course.id },
    orderBy: { order: "asc" },
    select: { id: true },
  })
  const from = sections.findIndex((section) => section.id === sectionId)
  if (from === -1) return MISSING

  const target = clamp(toIndex, 0, sections.length - 1)
  if (target === from) return { ok: true, message: "" }

  const ordered = reorder(sections, from, target)
  await db.$transaction(
    ordered.map((section, index) =>
      db.courseSection.update({
        where: { id: section.id },
        data: { order: index },
      })
    )
  )

  // No revalidation — order is drawn nowhere but here, and the board has
  // already moved the row. See `revalidateEditor`.
  return { ok: true, message: "" }
}

// ---------------------------------------------------------------------------
// Curriculum — lessons
// ---------------------------------------------------------------------------

export async function addLesson(
  courseId: string,
  sectionId: string,
  kind: LessonKind
): Promise<EditorActionResult & { lesson?: EditorLesson }> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const section = await db.courseSection.findFirst({
    where: { id: sectionId, courseId: found.course.id },
    select: { id: true },
  })
  if (!section) return MISSING

  const count = await db.courseLesson.count({
    where: { sectionId: section.id },
  })
  const created = await db.courseLesson.create({
    data: {
      sectionId: section.id,
      title: curriculumCopy.newLessonTitle[kind],
      type: kind,
      order: count,
      // A new lesson is **not published**, which is what
      // `CourseLesson.isPublished` is for and what My Courses' "% built" bar
      // counts. Adding a row should move the denominator, not the numerator.
      isPublished: false,
    },
    select: { id: true, title: true },
  })
  await syncCourseTotals(found.course.id)

  // The row comes back so the board can swap it in for the placeholder it
  // drew the instant the button was pressed — without the real id the next
  // edit to that row would address a lesson the server has never heard of.
  // **No toast**: the row appearing is the confirmation, and a message for
  // every click of three buttons is noise.
  revalidateEditor()
  return {
    ok: true,
    message: "",
    lesson: {
      id: created.id,
      title: created.title,
      kind,
      durationMinutes: null,
      questionsCount: null,
      isPreview: false,
      hasQuiz: false,
      video: null,
      hasArticle: false,
    },
  }
}

export async function updateLesson(
  courseId: string,
  lessonId: string,
  input: {
    title?: string
    durationMinutes?: number | null
    questionsCount?: number | null
    isPreview?: boolean
  }
): Promise<EditorActionResult> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const lesson = await db.courseLesson.findFirst({
    where: { id: lessonId, section: { courseId: found.course.id } },
    select: { id: true, type: true },
  })
  if (!lesson) return MISSING

  const data: {
    title?: string
    durationMinutes?: number | null
    questionsCount?: number | null
    isPreview?: boolean
  } = {}

  if (input.title !== undefined) {
    const trimmed = input.title.trim().slice(0, 300)
    if (trimmed === "") return { ok: false, message: "A lesson needs a name." }
    data.title = trimmed
  }
  if (input.durationMinutes !== undefined) {
    data.durationMinutes =
      input.durationMinutes === null
        ? null
        : clamp(Math.round(input.durationMinutes), 0, 6000)
  }
  if (input.questionsCount !== undefined) {
    data.questionsCount =
      input.questionsCount === null
        ? null
        : clamp(Math.round(input.questionsCount), 0, 200)
  }
  if (input.isPreview !== undefined) {
    // A quiz is never a free preview: the export offers the toggle on video
    // and article rows and puts "Edit quiz" in that slot on a quiz, so the
    // state simply does not exist for one.
    if (lesson.type === "QUIZ") {
      return { ok: false, message: "A quiz can't be a free preview." }
    }
    data.isPreview = input.isPreview
  }

  await db.courseLesson.update({ where: { id: lesson.id }, data })

  // A length is the only field here that anything outside this page draws —
  // it rolls into `Course.totalDurationMinutes` and `durationHours`, which the
  // sale page quotes. A title or a preview flag revalidates nothing.
  if (input.durationMinutes !== undefined) {
    await syncCourseTotals(found.course.id)
    revalidateEditor()
  }

  return { ok: true, message: "" }
}

export async function deleteLesson(
  courseId: string,
  lessonId: string
): Promise<EditorActionResult> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const lesson = await db.courseLesson.findFirst({
    where: { id: lessonId, section: { courseId: found.course.id } },
    select: { id: true, title: true, sectionId: true },
  })
  if (!lesson) return MISSING

  await db.$transaction(async (tx) => {
    await tx.courseLesson.delete({ where: { id: lesson.id } })
    await resequenceLessons(tx, lesson.sectionId)
  })
  await dropLessonVideos(found.course.id, [lesson.id])
  await syncCourseTotals(found.course.id)

  revalidateEditor()
  return { ok: true, message: `“${lesson.title}” deleted.` }
}

/**
 * Moves a lesson inside its own section.
 *
 * **Cross-section moves are not supported**, by either the arrows or a drag,
 * and that is a limit rather than an oversight: the export demonstrates
 * neither, and a drop target spanning two sections needs a drawn state for
 * "this row will land here" that no export provides. Delete and re-add is the
 * honest path until one does.
 */
export async function moveLesson(
  courseId: string,
  lessonId: string,
  toIndex: number
): Promise<EditorActionResult> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const lesson = await db.courseLesson.findFirst({
    where: { id: lessonId, section: { courseId: found.course.id } },
    select: { id: true, sectionId: true },
  })
  if (!lesson) return MISSING

  const lessons = await db.courseLesson.findMany({
    where: { sectionId: lesson.sectionId },
    orderBy: { order: "asc" },
    select: { id: true },
  })
  const from = lessons.findIndex((row) => row.id === lesson.id)
  const target = clamp(toIndex, 0, lessons.length - 1)
  if (from === -1 || from === target) return { ok: true, message: "" }

  const ordered = reorder(lessons, from, target)
  await db.$transaction(
    ordered.map((row, index) =>
      db.courseLesson.update({ where: { id: row.id }, data: { order: index } })
    )
  )

  // No revalidation, for `moveSection`' reason.
  return { ok: true, message: "" }
}

// ---------------------------------------------------------------------------
// Lesson video
// ---------------------------------------------------------------------------

/**
 * The first half of an upload: signs a PUT the browser sends the file to
 * directly. See `createLessonVideoUpload` for why the bytes never pass through
 * here.
 *
 * The type and size the browser reports are checked now so an obviously wrong
 * file is refused before minutes of uploading, **and checked again in
 * `attachLessonVideo` against what the bucket says landed** — the claim here
 * is only the browser's.
 */
export async function startLessonVideoUpload(
  courseId: string,
  lessonId: string,
  file: { contentType: string; sizeBytes: number }
): Promise<EditorActionResult & { uploadUrl?: string; key?: string }> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const lesson = await ownedLessonOfType(found.course.id, lessonId, "VIDEO")
  if (!lesson) return MISSING

  if (!isVideoType(file.contentType)) {
    return { ok: false, message: lessonVideoCopy.wrongType }
  }
  if (file.sizeBytes > LESSON_VIDEO_MAX_BYTES) {
    return { ok: false, message: lessonVideoCopy.tooLarge }
  }

  const upload = await createLessonVideoUpload(
    found.course.id,
    lesson.id,
    file.contentType
  )
  if (!upload) return { ok: false, message: lessonVideoCopy.unconfigured }

  return { ok: true, message: "", ...upload }
}

/**
 * The second half: once the PUT has finished, records the object as this
 * lesson's video.
 *
 * **The key has to sit under this lesson's own prefix**, or it is refused — a
 * key is just a string from the browser, and without the check one instructor
 * could attach another's upload. The size and type written to `MediaAsset` are
 * the bucket's, read back with a HEAD, never the browser's.
 *
 * The lesson's length follows from the video. The duration is read by the
 * browser (it is the only party that decoded the file), so it is clamped, but
 * it only ever feeds the "4 min" a syllabus shows.
 *
 * The video it replaces is collected afterwards — row and object — so a
 * lesson never holds two, and a failed cleanup never fails the upload.
 */
export async function attachLessonVideo(
  courseId: string,
  lessonId: string,
  input: { key: string; fileName: string; durationSeconds: number | null }
): Promise<
  EditorActionResult & { video?: EditorVideo; durationMinutes?: number | null }
> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const lesson = await ownedLessonOfType(found.course.id, lessonId, "VIDEO")
  if (!lesson) return MISSING

  if (!input.key.startsWith(lessonVideoPrefix(found.course.id, lesson.id))) {
    return { ok: false, message: lessonVideoCopy.failed }
  }

  const object = await inspectObject(input.key)
  if (!object) return { ok: false, message: lessonVideoCopy.failed }
  if (
    !isVideoType(object.contentType) ||
    object.sizeBytes > LESSON_VIDEO_MAX_BYTES
  ) {
    await deleteLessonObject(found.course.id, lesson.id, input.key)
    return { ok: false, message: lessonVideoCopy.wrongType }
  }

  const seconds =
    input.durationSeconds !== null && Number.isFinite(input.durationSeconds)
      ? clamp(Math.round(input.durationSeconds), 0, 24 * 60 * 60)
      : null
  const minutes =
    seconds === null
      ? lesson.durationMinutes
      : Math.max(1, Math.round(seconds / 60))
  const fileName = input.fileName.trim().slice(0, 200) || null

  const previous = lesson.videoAssetId
    ? await db.mediaAsset.findFirst({
        where: { id: lesson.videoAssetId, ownerId: lesson.id },
        select: { id: true, storageKey: true },
      })
    : null

  await db.$transaction(async (tx) => {
    const asset = await tx.mediaAsset.create({
      data: {
        ownerType: "LESSON_VIDEO",
        ownerId: lesson.id,
        title: fileName,
        storageKey: input.key,
        url: object.url,
        mimeType: object.contentType,
        sizeBytes: object.sizeBytes,
        durationSeconds: seconds,
        uploadedById: found.userId,
      },
      select: { id: true },
    })
    await tx.courseLesson.update({
      where: { id: lesson.id },
      data: { videoAssetId: asset.id, durationMinutes: minutes },
    })
    if (previous) {
      await tx.mediaAsset.delete({ where: { id: previous.id } })
    }
  })
  if (previous) {
    await deleteLessonObject(found.course.id, lesson.id, previous.storageKey)
  }

  await syncCourseTotals(found.course.id)
  revalidateEditor()
  return {
    ok: true,
    message: lessonVideoCopy.uploaded,
    video: {
      url: object.url,
      fileName,
      sizeBytes: object.sizeBytes,
      durationSeconds: seconds,
    },
    durationMinutes: minutes,
  }
}

export async function removeLessonVideo(
  courseId: string,
  lessonId: string
): Promise<EditorActionResult> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const lesson = await ownedLessonOfType(found.course.id, lessonId, "VIDEO")
  if (!lesson) return MISSING

  await db.courseLesson.update({
    where: { id: lesson.id },
    data: { videoAssetId: null },
  })
  await dropLessonVideos(found.course.id, [lesson.id])

  revalidateEditor()
  return { ok: true, message: lessonVideoCopy.removed }
}

// ---------------------------------------------------------------------------
// Article
// ---------------------------------------------------------------------------

/**
 * Writes an ARTICLE lesson's body. It takes the editor's document **as a JSON
 * string** — Tiptap's node attributes are not plain objects, and a Server
 * Action passes a non-plain object through as an opaque reference the server
 * cannot read, which silently saved every subheading as a heading — and
 * **walks it through `sanitizeArticle` before anything is stored**, so the column only
 * ever holds the node types the toolbar offers — see `lib/article-body.ts`.
 *
 * The lesson's "N min read" follows from the text at 200 words a minute, the
 * same way a video's length follows from the file: it is a fact about the
 * body, and a figure typed by hand would drift from it at the next edit.
 */
export async function saveArticle(
  courseId: string,
  lessonId: string,
  input: string
): Promise<
  EditorActionResult & { body?: ArticleDoc; durationMinutes?: number | null }
> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const lesson = await db.courseLesson.findFirst({
    where: {
      id: lessonId,
      section: { courseId: found.course.id },
      type: { in: ["ARTICLE", "PRACTICE"] },
    },
    select: { id: true },
  })
  if (!lesson) return MISSING

  // The raw string is capped before it is parsed, so an oversized payload is
  // refused without building it in memory first. Markup the sanitiser drops
  // makes the raw form larger than the stored one, hence the headroom.
  if (typeof input !== "string" || input.length > ARTICLE_MAX_CHARS * 4) {
    return { ok: false, message: "That article is too long to save." }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    return { ok: false, message: "That article couldn't be read." }
  }
  const doc = sanitizeArticle(parsed)
  if (!doc) return { ok: false, message: "That article couldn't be read." }

  const serialized = JSON.stringify(doc)
  if (serialized.length > ARTICLE_MAX_CHARS) {
    return { ok: false, message: "That article is too long to save." }
  }

  const words = articleWordCount(doc)
  const minutes = words === 0 ? null : Math.max(1, Math.ceil(words / 200))

  await db.courseLesson.update({
    where: { id: lesson.id },
    data: {
      // An emptied editor clears the column rather than storing an empty
      // document, so the row reads as "not written" again.
      articleBody: words === 0 ? null : serialized,
      durationMinutes: minutes,
    },
  })
  await syncCourseTotals(found.course.id)

  revalidateEditor()
  return {
    ok: true,
    message: articleEditorCopy.saved,
    body: doc,
    durationMinutes: minutes,
  }
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

/**
 * Writes a QUIZ lesson's questions, answers and correct answers in one go.
 *
 * **The whole quiz is saved at once, but rows are matched rather than
 * replaced.** A question or option that arrives with an id this quiz already
 * owns is updated in place; anything without one is created; anything the
 * quiz owned that did not come back is deleted. Replacing every row on each
 * save would be simpler and would cascade away every `QuizAnswer` a student
 * had recorded — and `QuizOption` exists as a row per option precisely so the
 * correct answer is attached to the answer rather than to a position.
 *
 * An id is only honoured if it belongs to *this* quiz (or, for an option, to
 * that question), so a stray id from elsewhere is treated as a new row rather
 * than reaching across.
 *
 * `CourseLesson.questionsCount` is set from what landed, because the syllabus
 * and the student's "Question 1 of N" read that number.
 */
export async function saveQuiz(
  courseId: string,
  lessonId: string,
  input: QuizDraftQuestion[]
): Promise<EditorActionResult & { questions?: QuizDraftQuestion[] }> {
  const found = await owned(courseId)
  if (!found) return DENIED

  const lesson = await ownedLessonOfType(found.course.id, lessonId, "QUIZ")
  if (!lesson) return MISSING

  if (!Array.isArray(input)) return MISSING
  const questions: QuizDraftQuestion[] = input
    .slice(0, QUIZ_LIMITS.questions + 1)
    .map((question) => ({
      id: typeof question?.id === "string" ? question.id : undefined,
      prompt: String(question?.prompt ?? "")
        .trim()
        .slice(0, QUIZ_LIMITS.prompt),
      options: (Array.isArray(question?.options) ? question.options : [])
        .slice(0, QUIZ_LIMITS.maxOptions)
        .map((option) => ({
          id: typeof option?.id === "string" ? option.id : undefined,
          label: String(option?.label ?? "")
            .trim()
            .slice(0, QUIZ_LIMITS.option),
          isCorrect: option?.isCorrect === true,
        })),
    }))

  const invalid = validateQuizDraft(questions)
  if (invalid) return { ok: false, message: invalid.message }

  const saved = await db.$transaction(async (tx) => {
    const quiz = await tx.quiz.upsert({
      where: { lessonId: lesson.id },
      create: { lessonId: lesson.id, title: lesson.title },
      update: { title: lesson.title },
      select: {
        id: true,
        questions: {
          select: { id: true, options: { select: { id: true } } },
        },
      },
    })

    const existing = new Map(
      quiz.questions.map((question) => [
        question.id,
        new Set(question.options.map((option) => option.id)),
      ])
    )
    const kept = new Set(
      questions.flatMap((question) =>
        question.id && existing.has(question.id) ? [question.id] : []
      )
    )
    const removed = [...existing.keys()].filter((id) => !kept.has(id))
    if (removed.length > 0) {
      await tx.quizQuestion.deleteMany({
        where: { id: { in: removed }, quizId: quiz.id },
      })
    }

    const result: QuizDraftQuestion[] = []
    for (const [order, question] of questions.entries()) {
      const ownOptions =
        question.id && kept.has(question.id) ? existing.get(question.id)! : null

      const row = ownOptions
        ? await tx.quizQuestion.update({
            where: { id: question.id },
            data: { prompt: question.prompt, order },
            select: { id: true },
          })
        : await tx.quizQuestion.create({
            data: { quizId: quiz.id, prompt: question.prompt, order },
            select: { id: true },
          })

      const keptOptions = new Set(
        question.options.flatMap((option) =>
          option.id && ownOptions?.has(option.id) ? [option.id] : []
        )
      )
      const staleOptions = [...(ownOptions ?? [])].filter(
        (id) => !keptOptions.has(id)
      )
      if (staleOptions.length > 0) {
        await tx.quizOption.deleteMany({
          where: { id: { in: staleOptions }, questionId: row.id },
        })
      }

      const options = []
      for (const [optionOrder, option] of question.options.entries()) {
        const data = {
          label: option.label,
          isCorrect: option.isCorrect,
          order: optionOrder,
        }
        const saved =
          option.id && keptOptions.has(option.id)
            ? await tx.quizOption.update({
                where: { id: option.id },
                data,
                select: { id: true },
              })
            : await tx.quizOption.create({
                data: { ...data, questionId: row.id },
                select: { id: true },
              })
        options.push({ ...data, id: saved.id })
      }

      result.push({
        id: row.id,
        prompt: question.prompt,
        options: options.map(({ id, label, isCorrect }) => ({
          id,
          label,
          isCorrect,
        })),
      })
    }

    await tx.courseLesson.update({
      where: { id: lesson.id },
      data: { questionsCount: result.length },
    })

    return result
  })

  revalidateEditor()
  return { ok: true, message: quizEditorCopy.saved, questions: saved }
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

/**
 * **Publish means "submit for review"** — see `publishCopy`. It writes a
 * `CourseSubmission`, moves the course to `IN_REVIEW` and records the checks
 * the curriculum can answer, in one transaction, so the console's queue and
 * `Course.status` cannot disagree about whether the course is waiting — the
 * arrangement `admin-courses.ts`' own `decide()` states from the other side.
 *
 * **It refuses a course that is not DRAFT or NEEDS_CHANGES**, which is the
 * same stale-tab reasoning that page records: two windows open on one course
 * is the ordinary case, and the second press must not queue it twice.
 *
 * The gate before that is the honest half: a course with no lessons, or with
 * nothing on the Intended learners step, is refused with the step named. A
 * sentence in a dialog that nothing checks is the promise
 * `instructor-coupons.ts` already refuses to make about its own "three active
 * coupons" rule.
 *
 * **Only the two automated checks are written.** `cover_resolution` needs an
 * image upload that does not exist and `audio_quality` is a human judgement —
 * `CourseSubmissionCheck.automated` is the column that says so. Predicting
 * either would put a verdict nobody made in front of a reviewer; the admin
 * course view renders whatever rows exist, so three become four the day those
 * land.
 */
export async function publishCourse(
  courseId: string
): Promise<EditorActionResult> {
  const found = await owned(courseId)
  if (!found) return DENIED

  if (
    found.course.status !== "DRAFT" &&
    found.course.status !== "NEEDS_CHANGES"
  ) {
    return {
      ok: false,
      message: "This course isn't in a state that can be submitted.",
    }
  }

  const course = await db.course.findUnique({
    where: { id: found.course.id },
    select: {
      id: true,
      title: true,
      learningOutcomes: true,
      durationHours: true,
      thumbnailUrl: true,
      // Named on the console's notification, so a reviewer sees who submitted
      // without opening the course.
      instructor: { select: { name: true } },
      sections: {
        select: { lessons: { select: { id: true, type: true, order: true } } },
      },
    },
  })
  if (!course) return MISSING

  const lessons = course.sections.flatMap((section) => section.lessons)
  if (lessons.length === 0) {
    return {
      ok: false,
      message: "Add at least one lesson on the Curriculum step first.",
    }
  }
  if (course.learningOutcomes.length === 0) {
    return {
      ok: false,
      message: "Fill in the Intended learners step first.",
    }
  }

  const longEnough = lessons.length >= 10 && course.durationHours >= 5
  const hasQuiz = lessons.some((lesson) => lesson.type === "QUIZ")

  await db.$transaction(async (tx) => {
    const submission = await tx.courseSubmission.create({
      data: {
        courseId: course.id,
        submittedById: found.userId,
      },
      select: { id: true },
    })
    await tx.courseSubmissionCheck.createMany({
      data: [
        {
          submissionId: submission.id,
          key: "min_lessons_and_video",
          label: "At least 10 lessons and 5 hours of video",
          passed: longEnough,
        },
        {
          submissionId: submission.id,
          key: "closes_with_quiz",
          label: "Closes with a graded quiz or project",
          passed: hasQuiz,
        },
      ],
    })
    await tx.course.update({
      where: { id: course.id },
      data: { status: "IN_REVIEW", submittedAt: new Date() },
    })
    await tx.auditLog.create({
      data: {
        actorId: found.userId,
        actorName: found.course.title,
        actorRole: found.role,
        action: "course.submitted",
        targetType: "course",
        targetId: course.id,
        targetLabel: course.title,
        // A catalog change, so COURSES — `AuditCategory` has no CONTENT
        // member, the point the admin Categories page records.
        category: "COURSES",
      },
    })
  })

  // **Tells the console, rather than relying on it to notice.** The sidebar
  // badge already counted IN_REVIEW courses, but a badge is not a
  // notification: it says how many, never which one or when. Outside the
  // transaction, because a submission must not roll back over a feed row.
  await notifyCourseSubmitted({
    courseId: course.id,
    courseTitle: course.title,
    instructorName: course.instructor?.name ?? "An instructor",
    instructorUserId: found.userId,
  })

  revalidateEditor()
  return {
    ok: true,
    message: `“${course.title}” is with the review team.`,
  }
}

// ---------------------------------------------------------------------------

/** A lesson of one type, reached through a course the caller owns. */
async function ownedLessonOfType(
  courseId: string,
  lessonId: string,
  type: "VIDEO" | "QUIZ"
) {
  return db.courseLesson.findFirst({
    where: { id: lessonId, type, section: { courseId } },
    select: {
      id: true,
      title: true,
      durationMinutes: true,
      videoAssetId: true,
    },
  })
}

function isVideoType(contentType: string) {
  return (LESSON_VIDEO_TYPES as readonly string[]).includes(contentType)
}

/**
 * Collects every video these lessons own — the `MediaAsset` rows and the
 * objects behind them. `MediaAsset.ownerId` is not a foreign key (the table is
 * polymorphic), so deleting a lesson cascades nothing there; without this the
 * rows would outlive the lesson and the files would sit in the bucket forever.
 */
async function dropLessonVideos(courseId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return
  const assets = await db.mediaAsset.findMany({
    where: { ownerType: "LESSON_VIDEO", ownerId: { in: lessonIds } },
    select: { id: true, ownerId: true, storageKey: true },
  })
  if (assets.length === 0) return

  await db.mediaAsset.deleteMany({
    where: { id: { in: assets.map((asset) => asset.id) } },
  })
  await Promise.all(
    assets.map((asset) =>
      deleteLessonObject(courseId, asset.ownerId, asset.storageKey)
    )
  )
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

/** Moves one entry and returns the whole list in its new order. */
function reorder<T>(rows: T[], from: number, to: number): T[] {
  const next = rows.slice()
  const [moved] = next.splice(from, 1)
  if (moved !== undefined) next.splice(to, 0, moved)
  return next
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0]

/** Rewrites section order as a dense run — see the module note. */
async function resequence(tx: Tx, courseId: string) {
  const sections = await tx.courseSection.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: { id: true },
  })
  for (const [index, section] of sections.entries()) {
    await tx.courseSection.update({
      where: { id: section.id },
      data: { order: index },
    })
  }
}

async function resequenceLessons(tx: Tx, sectionId: string) {
  const lessons = await tx.courseLesson.findMany({
    where: { sectionId },
    orderBy: { order: "asc" },
    select: { id: true },
  })
  for (const [index, lesson] of lessons.entries()) {
    await tx.courseLesson.update({
      where: { id: lesson.id },
      data: { order: index },
    })
  }
}

/**
 * Recomputes the two counters on `Course` from the rows that actually exist.
 * `durationHours` follows from the minutes, because the sale page's "12 hours"
 * and the syllabus's per-lesson minutes are the same fact at two scales and a
 * course whose parts did not add up to its whole would be visible on one
 * screen.
 */
async function syncCourseTotals(courseId: string) {
  const lessons = await db.courseLesson.findMany({
    where: { section: { courseId } },
    select: { durationMinutes: true },
  })
  const minutes = lessons.reduce(
    (sum, lesson) => sum + (lesson.durationMinutes ?? 0),
    0
  )

  await db.course.update({
    where: { id: courseId },
    data: {
      lessonCount: lessons.length,
      totalDurationMinutes: minutes,
      durationHours: Math.round(minutes / 60),
    },
  })
}
