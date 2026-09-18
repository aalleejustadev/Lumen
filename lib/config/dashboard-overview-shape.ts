/**
 * The Overview grid's shapes, apart from the reads that build them.
 *
 * The split `lib/config/catalog-shape.ts` records: `lib/dashboard-overview.ts`
 * is `server-only` and two of these cards are recharts Client Components, so
 * the shape has to live where both can import it.
 */
export type LearningPath = {
  title: string
  completed: number
  total: number
  /** Maps to `--success` / `--warning` — the only two colours the export uses. */
  tone: "success" | "warning"
}

export type ActivitySlice = {
  label: string
  value: number
  color: "var(--chart-1)" | "var(--chart-2)" | "var(--chart-3)"
}

export type ContinueLearningCourse = {
  slug: string
  title: string
  category: string
  categorySlug: string
  score: number
  /** 0-100. Below `CONTINUE_THRESHOLD` the row shows a "Continue" button
   *  instead of a progress bar — matches the export's two just-started rows. */
  progress: number
  art: string
}

export const CONTINUE_THRESHOLD = 15

export type OverviewData = {
  learningPaths: LearningPath[]
  overall: {
    percent: number
    deltaPercent: number
    coursesEnrolled: number
    coursesCompleted: number
  }
  activity: ActivitySlice[]
  weekly: { week: string; value: number }[]
  continueLearning: ContinueLearningCourse[]
}
