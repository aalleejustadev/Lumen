import {
  BookOpenIcon,
  BrainCircuitIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  Code2Icon,
  PaletteIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react"

/**
 * Demo content for the student Overview page, measured off
 * `ui-design/light/dashboard/student/student-dashboard.png`. There is no
 * course/enrollment schema in `prisma/schema.prisma` yet — nothing on this
 * page reads from the database except the signed-in user's name. Swap this
 * file for real queries once courses, enrollments and progress exist as
 * tables; the components underneath don't need to change shape.
 */

export type LearningPath = {
  title: string
  completed: number
  total: number
  /** Maps to `--success` / `--warning` — the only two colors the export uses. */
  tone: "success" | "warning"
}

export const learningPaths: LearningPath[] = [
  { title: "Full-Stack Developer", completed: 4, total: 10, tone: "success" },
  { title: "Data Science Track", completed: 7, total: 12, tone: "warning" },
]

export const overallProgress = {
  percent: 72,
  deltaPercent: 5,
  previousPercent: 67,
  targetPercent: 100,
  coursesEnrolled: 14,
  coursesCompleted: 9,
}

export const weeklyGoal = {
  percent: 72.5,
  /** The two half-width bars under the headline figure. */
  breakdown: [
    { value: 65, tone: "warning" as const },
    { value: 50, tone: "success" as const },
  ],
  stats: [
    {
      icon: CalendarClockIcon,
      count: 5,
      label: "In Progress",
      tone: "warning" as const,
    },
    {
      icon: CalendarCheckIcon,
      count: 9,
      label: "Completed",
      tone: "success" as const,
    },
  ],
}

export type ActivitySlice = {
  label: string
  value: number
  /** Maps to `--chart-1` / `--chart-2` / `--chart-3` — the donut's own scale,
   *  distinct from the brand accents used on the marketing site. */
  color: "var(--chart-1)" | "var(--chart-2)" | "var(--chart-3)"
}

export const activityBreakdown: ActivitySlice[] = [
  { label: "Watching", value: 65.2, color: "var(--chart-1)" },
  { label: "Reading", value: 25, color: "var(--chart-2)" },
  { label: "Quizzes", value: 9.8, color: "var(--chart-3)" },
]

/** Weekly points behind "Your Progress by Month" — an undulating rise, as in
 *  the export. Values are a percentage-style score, not tied to a real metric
 *  yet. */
export const monthlyProgress: { week: string; value: number }[] = [
  { week: "W1", value: 42 },
  { week: "W2", value: 58 },
  { week: "W3", value: 61 },
  { week: "W4", value: 47 },
  { week: "W5", value: 38 },
  { week: "W6", value: 45 },
  { week: "W7", value: 57 },
  { week: "W8", value: 52 },
  { week: "W9", value: 60 },
  { week: "W10", value: 74 },
  { week: "W11", value: 88 },
  { week: "W12", value: 92 },
]

export type ContinueLearningCourse = {
  slug: string
  title: string
  category: string
  score: number
  /** 0-100. Below `CONTINUE_THRESHOLD` the row shows a "Continue" button
   *  instead of a progress bar — matches the export's two just-started rows. */
  progress: number
  art: string
  icon: LucideIcon
}

export const CONTINUE_THRESHOLD = 15

export const continueLearning: ContinueLearningCourse[] = [
  {
    slug: "introduction-to-react",
    title: "Introduction To React",
    category: "Web Development",
    score: 4.5,
    progress: 4,
    art: "from-accent-2 to-accent-3",
    icon: Code2Icon,
  },
  {
    slug: "machine-learning-basics",
    title: "Machine Learning Basics",
    category: "Data Science",
    score: 4.8,
    progress: 18,
    art: "from-accent-3 to-accent-1",
    icon: BrainCircuitIcon,
  },
  {
    slug: "digital-marketing-fundamentals",
    title: "Digital Marketing Fundamentals",
    category: "Marketing",
    score: 4.2,
    progress: 6,
    art: "from-warning to-star",
    icon: TrendingUpIcon,
  },
  {
    slug: "python-for-beginners",
    title: "Python For Beginners",
    category: "Programming",
    score: 4.6,
    progress: 48,
    art: "from-accent-1 to-accent-2",
    icon: BookOpenIcon,
  },
  {
    slug: "ux-design-principles",
    title: "UX Design Principles",
    category: "Design",
    score: 4.4,
    progress: 42,
    art: "from-accent-1 to-accent-3",
    icon: PaletteIcon,
  },
  {
    slug: "svelte-project-development",
    title: "Svelte Project Development",
    category: "Programming",
    score: 4.8,
    progress: 47,
    art: "from-accent-2 to-accent-1",
    icon: Code2Icon,
  },
]
