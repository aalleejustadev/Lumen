import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const stats = [
  { figure: "12,000+", label: "Courses across 10 categories" },
  { figure: "480k", label: "Learners on the platform" },
  { figure: "88%", label: "Median completion rate" },
  { figure: "$4.2M", label: "Paid out to instructors" },
]

/**
 * One 1152x120 panel split into four equal cells by 1px rules.
 *
 * The rules are `gap-px` over a `bg-border` panel rather than per-cell
 * borders: it draws the same hairline between every pair of neighbours at
 * any column count, so the 2-up mobile grid gets its cross automatically
 * without nth-child juggling.
 */
function StatsSection({ className }: { className?: string }) {
  return (
    <section className={cn("w-full", className)}>
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <Card className="grid grid-cols-2 gap-px bg-border py-0 ring-border lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1.5 bg-card px-6 py-7 text-center"
            >
              {/* .stat-figure tracks at -0.025em; the export measures -0.04em
                  on figures this large, so the extra tightening is local
                  rather than pushed onto every KPI in the app. */}
              <span className="stat-figure text-3xl tracking-[-0.04em] lg:text-[38px]">
                {stat.figure}
              </span>
              <span className="text-sm tracking-[-0.01em] text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </section>
  )
}

export { StatsSection }
