import { SettingsNav } from "@/components/dashboard/settings/settings-nav"
import { settingsHeading } from "@/lib/config/settings"

/**
 * The settings shell, from
 * `ui-design/light/dashboard/student/setting-profile-page.png`: the heading
 * block, then a two-column grid of the sections card and whichever section
 * page is open.
 *
 * A layout rather than something each settings page repeats, so the four
 * sections keep one nav card and the heading can't drift between them.
 *
 * Measured off that export at DPR 2: a 1178px content column (so the grid is
 * capped rather than running to the viewport edge as the other dashboard
 * pages do), a 228px nav column and a 28px gutter. The nav card is
 * `self-start` so it keeps its own height — CSS Grid's default
 * `align-items: stretch` would otherwise pull it down to match the far taller
 * form column, the same trap `course-purchase-card.tsx` documents.
 *
 * The `h1` carries an explicit `font-bold`: `globals.css` sets every `h1`/`h2`
 * to 800, and the stem widths on this export measure 700 — see the dashboard
 * note in `CLAUDE.md`.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="max-w-[1178px]">
        <div>
          <h1 className="text-[32px] leading-none font-bold">
            {settingsHeading.title}
          </h1>
          <p className="mt-2.5 text-muted-foreground">
            {settingsHeading.description}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-[228px_minmax(0,1fr)]">
          <div className="lg:self-start">
            <SettingsNav />
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}
