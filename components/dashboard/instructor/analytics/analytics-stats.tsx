import { StatCard } from "@/components/dashboard/stat-card"
import {
  analyticsFootnotes,
  analyticsStatCards,
} from "@/lib/config/instructor-analytics"
import type { AnalyticsStats as Stats } from "@/lib/instructor-analytics"

/**
 * The four-up KPI row at the top of `analytics-page.png`.
 *
 * A **Server Component**, so a row of markup and its four lucide icons never
 * reach the bundle — the arrangement the other instructor pages record for
 * their own stat rows.
 *
 * The tile is the shared `StatCard`, which this export draws identically to
 * `platform-overview.png`'s and `reports-page__admin.png`'s — a 20px inset, a
 * 34px icon tile 12px from a 15px muted label, and the figure with its delta
 * on a shared baseline below, all measured — **plus one line**: the muted
 * footnote under the figure that says what the number is *of*. That is why
 * `footnote` exists on the shared card, and why the card here measures 137.5px
 * against the console's 116.
 *
 * Both of the other opt-ins are on: `arrow`, because this export draws a ↑/↓
 * before each delta, and — for Open questions alone — `deltaFormat: "count"`,
 * because it draws "+2".
 *
 * What each figure *means* is decided in `lib/instructor-analytics.ts`; this is
 * only what it is called and how it is drawn.
 */
function AnalyticsStats({ stats }: { stats: Stats }) {
  const footnotes: Record<(typeof analyticsStatCards)[number]["key"], string> =
    {
      enrolments: analyticsFootnotes.enrolments(stats.perDay),
      openQuestions: analyticsFootnotes.openQuestions,
      completion: analyticsFootnotes.completion,
      watchTime: analyticsFootnotes.watchTime,
    }

  return (
    <div className="mt-6 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
      {analyticsStatCards.map((card) => (
        <StatCard
          key={card.key}
          label={card.label}
          icon={card.icon}
          value={stats[card.key].value}
          delta={stats[card.key].delta}
          format={card.format}
          deltaFormat={card.deltaFormat}
          footnote={footnotes[card.key]}
          arrow
        />
      ))}
    </div>
  )
}

export { AnalyticsStats }
