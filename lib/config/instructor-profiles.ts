import { browseCourses, type BrowseCourse } from "@/lib/config/browse-courses"

/**
 * Demo content for `/dashboard/instructors/[slug]`, measured off
 * `ui-design/light/dashboard/student/instructor-page__part{1,2}.png`. Same
 * arrangement as `browse-courses.ts` / `course-details.ts`: `Instructor` in
 * `prisma/schema.prisma` has the real columns now (`slug`, `about`,
 * `skills`, …), but there's no instructor-authoring flow yet to populate
 * them, so this file remains the data source.
 *
 * Only Simon Simorangkir (the export's own instructor) is hand-authored to
 * match the design exactly — including the reused-placeholder-text quirks
 * already noted for `course-details.ts` (his title here, "Illustrator at
 * Google", is verbatim Marco Devine's from the course sale page; the two
 * reviews below are shorter than the versions of the same two reviews shown
 * on `python-for-everybody`'s sale page). Every other instructor gets a
 * plausible profile generated from their `BrowseCourse` rows.
 */

export type InstructorReview = {
  name: string
  avatarUrl?: string
  rating: number
  timeAgo: string
  body: string
}

export type InstructorProfile = {
  slug: string
  name: string
  title: string
  avatarUrl?: string
  teachingSince: number
  rating: number
  reviewsCount: number
  studentsCount: number
  about: string[]
  skills: string[]
  reviews: InstructorReview[]
  courses: BrowseCourse[]
}

/** "Simon Simorangkir" -> "simon-simorangkir". Shared by the link on
 *  `instructor-card.tsx` and the lookup below, so they can't drift. */
export function instructorSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const NAME_TITLES = new Set([
  "dr",
  "dr.",
  "mr",
  "mr.",
  "mrs",
  "mrs.",
  "ms",
  "ms.",
  "prof",
  "prof.",
])

/** "Dr. Elias Vance" -> "Elias", not "Dr." — used for "About {firstName}" /
 *  "Courses by {firstName}" and the generated review copy below. */
export function firstNameOf(fullName: string) {
  const parts = fullName.split(" ").filter(Boolean)
  const index = parts.findIndex((part) => !NAME_TITLES.has(part.toLowerCase()))
  return parts[index === -1 ? 0 : index] ?? fullName
}

/** "Dr. Elias Vance" -> "EV", not "DEV" — first-name and last-word initials,
 *  skipping a leading title the same way `firstNameOf` does. */
export function initialsOf(fullName: string) {
  const parts = fullName.split(" ").filter(Boolean)
  const first = firstNameOf(fullName)
  const last = parts[parts.length - 1]
  const secondInitial = last && last !== first ? (last[0] ?? "") : ""
  return `${first[0] ?? ""}${secondInitial}`.toUpperCase()
}

/** Real headshots supplied for the marketing testimonials — see the same
 *  note in `course-details.ts`. */
const knownAvatars: Record<string, string> = {
  "Marco Devine": "/testimonials/marco-devine.png",
  "Simon Simorangkir": "/testimonials/simon-simorangkir.png",
}

function courseBySlug(slug: string) {
  const course = browseCourses.find((candidate) => candidate.slug === slug)
  if (!course)
    throw new Error(`Unknown course slug in instructor data: ${slug}`)
  return course
}

type ProfileOverride = Omit<InstructorProfile, "slug" | "courses"> & {
  courseSlugs: string[]
}

const flagshipProfiles: Record<string, ProfileOverride> = {
  "simon-simorangkir": {
    name: "Simon Simorangkir",
    title: "Illustrator at Google",
    avatarUrl: knownAvatars["Simon Simorangkir"],
    teachingSince: 2021,
    rating: 4.9,
    reviewsCount: 1204,
    studentsCount: 28410,
    about: [
      "I have spent twelve years drawing for a living — first in editorial, then in product design, and for the last five years at Google, where I build illustration systems used across dozens of surfaces.",
      "My teaching philosophy is simple: technique matters less than repeatable process. Most people who think they cannot draw are simply missing a workflow, so every course I make is built around one — from the first rough shape to a finished, exportable piece you can put in a portfolio.",
      "I read every question in the discussions and answer the most-upvoted ones in a live session each Friday. If something in a lesson does not land, tell me — several of my courses have been re-recorded because of student feedback.",
    ],
    skills: [
      "Vector illustration",
      "Design systems",
      "Colour theory",
      "Brand identity",
    ],
    reviews: [
      {
        name: "Nadia Rahman",
        avatarUrl: "/testimonials/nadia-rahman.png",
        rating: 5,
        timeAgo: "2 days ago",
        body: "The anchor-point section alone was worth it. I traced a full illustration on my first try.",
      },
      {
        name: "Aisha Bello",
        rating: 5,
        timeAgo: "1 month ago",
        body: "Beautifully produced — audio, pacing, and the on-screen callouts are all top tier.",
      },
    ],
    // Fixed order to match the export's page 1 — not derivable by sorting
    // (reviews desc would put "Design Systems in Figma" first).
    courseSlugs: [
      "mastering-illustration",
      "design-systems-in-figma",
      "colour-theory-for-designers",
      "advanced-illustration-techniques",
      "ux-research-fundamentals",
      "icon-design-fundamentals",
    ],
  },
}

const genericSkillsByCategory: Record<string, string[]> = {
  "Web Dev": ["JavaScript", "API design", "Testing", "Performance"],
  Design: ["Visual design", "Prototyping", "Design systems", "User research"],
  "Data & AI": ["Python", "Statistics", "Model evaluation", "Data pipelines"],
  Business: ["Financial modeling", "Strategy", "Forecasting", "Presentations"],
  Marketing: ["SEO", "Content strategy", "Analytics", "Copywriting"],
  Finance: ["Valuation", "Risk analysis", "Markets", "Portfolio theory"],
}

function buildGeneratedProfile(name: string, slug: string): InstructorProfile {
  const courses = browseCourses
    .filter((course) => course.instructor === name)
    .sort((a, b) => b.reviews - a.reviews)
  const totalStudents = courses.reduce((sum, course) => sum + course.reviews, 0)
  const avgRating =
    courses.reduce((sum, course) => sum + course.rating, 0) / courses.length
  const category = courses[0]?.category ?? "Web Dev"
  const firstName = firstNameOf(name)

  return {
    slug,
    name,
    title: `${category} Instructor`,
    avatarUrl: knownAvatars[name],
    teachingSince: 2022,
    rating: Math.round(avgRating * 10) / 10,
    reviewsCount: Math.max(20, Math.round(totalStudents * 0.025)),
    studentsCount: totalStudents,
    about: [
      `I've spent my career working hands-on in ${category.toLowerCase()}, and I built these courses to pass that experience on directly rather than teach from a textbook.`,
      `Every course follows the same shape: a real project, broken into small steps, with a check at the end of each one so you know it landed before moving to the next.`,
      `I read every question students post and fold the common ones back into the courses themselves — several lessons exist because enough people asked the same thing.`,
    ],
    skills:
      genericSkillsByCategory[category] ?? genericSkillsByCategory["Web Dev"]!,
    reviews: [
      {
        name: "Jordan Pierce",
        rating: 5,
        timeAgo: "5 days ago",
        body: `Clear, practical, and exactly what I needed to get moving with ${category.toLowerCase()}.`,
      },
      {
        name: "Elena Marsh",
        rating: 5,
        timeAgo: "3 weeks ago",
        body: `${firstName} explains the reasoning, not just the steps — that's what made it stick for me.`,
      },
    ],
    courses,
  }
}

export function getInstructorProfile(
  slug: string
): InstructorProfile | undefined {
  const flagship = flagshipProfiles[slug]
  if (flagship) {
    const { courseSlugs, ...rest } = flagship
    return { ...rest, slug, courses: courseSlugs.map(courseBySlug) }
  }

  const match = browseCourses.find(
    (course) => instructorSlug(course.instructor) === slug
  )
  if (!match) return undefined
  return buildGeneratedProfile(match.instructor, slug)
}
