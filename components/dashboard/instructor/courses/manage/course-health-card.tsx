import { Card } from "@/components/ui/card"
import {
  healthMetrics,
  manageCourseCopy,
} from "@/lib/config/instructor-course-manage"
import type { ManageCoursePage } from "@/lib/instructor-course-manage"
import { cn } from "@/lib/utils"

/**
 * **Course health** — the first card in the right column of
 * `manage-course.png`: three labelled bars, each a percentage the course's own
 * rows answer.
 *
 * Measured off that export at DPR 2: a 576px card on **20px** padding, a
 * 16px/700 title, then the rows 16px below it on a 14px gap — a 15px label
 * opposite a right-aligned bold percentage, and a **7px** bar 4px under them,
 * running the card's full 536px content width. The bar's track is `--track`
 * and the three fills were sampled off the export at `--success` (#22c55e),
 * `--accent-2` (#3b82f6) and `--accent-1` (#8b5cf6) **exactly**, which is why
 * `healthMetrics` names the tokens rather than the hexes — dark mode then
 * follows, the choice `billing-transactions.tsx` documents.
 *
 * Two things the export could not draw, because it draws one healthy course:
 *
 *  - **A metric with nothing behind it says so rather than drawing a zero.**
 *    Quiz pass rate is the live case — there is no scoring flow yet, so
 *    `QuizAttempt.passed` has no writer — and a 0% pass rate is a far worse
 *    lie than an absence. The empty track stays, so the card keeps its rhythm
 *    and the row is legible as a measurement not yet taken.
 *  - **The quiz row is dropped entirely on a course with no quizzes.** "No
 *    data yet" beside a metric that can never apply is noise, which is the
 *    reasoning `attention-list.tsx` records for an empty queue.
 *
 * A Server Component: nothing here has state.
 */
function CourseHealthCard({
  health,
  hasQuizzes,
}: {
  health: ManageCoursePage["health"]
  /** Whether the course has any quiz lessons at all — see the module note. */
  hasQuizzes: boolean
}) {
  const metrics = healthMetrics.filter(
    (metric) => metric.key !== "quizPass" || hasQuizzes
  )

  return (
    <Card className="p-5 ring-border [--card-spacing:0px]">
      {/* `font-bold` explicitly: `globals.css` sets every `h2` to 800 and the
          dashboard exports draw card titles at 700. */}
      <h2 className="text-[16px] leading-none font-bold">
        {manageCourseCopy.healthHeading}
      </h2>

      <div className="mt-4 space-y-3.5">
        {metrics.map((metric) => {
          const value = health[metric.key]

          return (
            <div key={metric.key}>
              <div className="flex items-baseline justify-between gap-3 text-[15px] leading-5">
                <span className="min-w-0 truncate text-muted-foreground">
                  {metric.label}
                </span>
                {value === null ? (
                  <span className="shrink-0 text-[13px] text-subtle-foreground">
                    {manageCourseCopy.noData}
                  </span>
                ) : (
                  <span className="shrink-0 font-bold tabular-nums">
                    {value}%
                  </span>
                )}
              </div>

              {/* `role="presentation"`, not a progressbar: the figure is
                  already written beside it in text, so an ARIA value would
                  only announce it twice — the treatment `my-course-row.tsx`
                  gives its own "% built" bar. */}
              <span
                role="presentation"
                className="mt-1 block h-[7px] overflow-hidden rounded-full bg-track"
              >
                <span
                  className={cn("block h-full rounded-full", metric.className)}
                  style={{ width: `${value ?? 0}%` }}
                />
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export { CourseHealthCard }
