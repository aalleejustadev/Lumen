import { BarChart3Icon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { AnalyticsStats } from "@/components/dashboard/instructor/analytics/analytics-stats"
import { CoursePerformanceCard } from "@/components/dashboard/instructor/analytics/course-performance-card"
import { EnrolmentsChartCard } from "@/components/dashboard/instructor/analytics/enrolments-chart-card"
import { EnrolmentSourcesCard } from "@/components/dashboard/instructor/analytics/enrolment-sources-card"
import { RangeSelect } from "@/components/dashboard/instructor/analytics/range-select"
import { analyticsCopy } from "@/lib/config/instructor-analytics"
import type { AnalyticsPage as AnalyticsPageData } from "@/lib/instructor-analytics"

/**
 * `/dashboard/instructor/analytics`, from
 * `ui-design/light/dashboard/instructor/analytics-page.png`.
 *
 * A **Server Component**, and almost entirely one: the only two things that
 * reach the bundle are the range select in the header and the recharts card,
 * so the four KPI tiles, the sources card and the whole performance table are
 * rendered here and never shipped.
 *
 * Measured off that export at DPR 2: the instructor shell's usual page inset
 * over a full-width column, a header block **pixel-identical** to
 * `students-page.png`'s, `coupons-page__main.png`'s and `reviews-page.png`'s —
 * the lead ink lands on the same rows in all four — so it is that header,
 * reused rather than re-measured, with the 155 x 42 range select flush to the
 * content column's right edge. Then a four-up KPI row of **359.5px** cards on
 * an **18px** gap, and below it a **3:2** split (884px chart against 589px
 * sources) on a 20px gap, and the full-width performance card.
 *
 * **That second row is `items-start`, not stretched.** Measured, the export's
 * two cards are 352.5px and 256px: the sources card hugs its four rows rather
 * than growing to the chart's height, which Grid's default `align-items:
 * stretch` would otherwise do — the same property `course-purchase-card.tsx`
 * had to opt out of for its own reason.
 *
 * **An account with no course at all gets the empty state rather than a page
 * of zeroes**, which is the one thing four KPI tiles reading 0 and an empty
 * chart would be worse than. An instructor who has courses but no enrolments
 * in the window still gets the page: each block says so in its own words, and
 * "nothing happened this period" is a real answer the range select can change.
 */
function AnalyticsPage({ page }: { page: AnalyticsPageData }) {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* `font-bold` explicitly: `globals.css` sets every `h1` to 800 and
              the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
          <h1 className="text-[32px] leading-none font-bold">
            {analyticsCopy.title}
          </h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {analyticsCopy.description}
          </p>
        </div>
        <RangeSelect value={page.range} />
      </div>

      {page.hasCourses ? (
        <>
          <AnalyticsStats stats={page.stats} />

          <div className="mt-5 grid items-start gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <EnrolmentsChartCard series={page.series} />
            </div>
            <div className="lg:col-span-2">
              <EnrolmentSourcesCard rows={page.sources} />
            </div>
          </div>

          <div className="mt-5">
            <CoursePerformanceCard rows={page.courses} />
          </div>
        </>
      ) : (
        <Empty className="mt-6 rounded-xl bg-card py-16 ring-1 ring-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BarChart3Icon />
            </EmptyMedia>
            <EmptyTitle>{analyticsCopy.empty.title}</EmptyTitle>
            <EmptyDescription>
              {analyticsCopy.empty.description}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </main>
  )
}

export { AnalyticsPage }
