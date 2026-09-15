import { InstructorSettingsNav } from "@/components/dashboard/instructor/settings/instructor-settings-nav"
import { instructorSettingsHeading } from "@/lib/config/instructor-settings"

/**
 * The instructor workspace's settings shell, from
 * `ui-design/light/dashboard/instructor/profile-page.png`: the heading block,
 * then a two-column grid of the sections card and whichever section is open.
 *
 * A layout rather than something each section repeats, so the four keep one
 * nav card and the heading cannot drift between them — the arrangement both
 * `app/(dashboard)/dashboard/settings/layout.tsx` and
 * `app/(admin)/dashboard/admin/settings/layout.tsx` already make.
 *
 * Measured off this export at DPR 2: the nav card runs x=69→527 (229px), the
 * form card x=581→2427 (923px), a 27px gutter between them and a 1179px
 * content column — **the learner and admin shells' numbers exactly**. So the
 * values are reused rather than re-derived: the three exports are one design
 * at three sets of copy, and a pixel or two invented by re-measuring would be
 * a difference nobody could explain later. Like those two, this one is capped
 * rather than full-width, unlike the rest of the workspace.
 *
 * The nav card is `self-start` so it keeps its own height — CSS Grid's default
 * `align-items: stretch` would otherwise pull it down to match the far taller
 * form column, the trap `course-purchase-card.tsx` documents.
 *
 * The `h1` carries an explicit `font-bold`: `globals.css` sets every `h1`/`h2`
 * to 800 and the dashboard exports draw 700 — see the design note in
 * `CLAUDE.md`.
 *
 * The teaching guard lives in `app/(instructor)/layout.tsx`, which covers
 * every route in this group.
 */
export default function InstructorSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="max-w-[1178px]">
        <div>
          <h1 className="text-[32px] leading-none font-bold">
            {instructorSettingsHeading.title}
          </h1>
          <p className="mt-2.5 text-muted-foreground">
            {instructorSettingsHeading.description}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-[228px_minmax(0,1fr)]">
          <div className="lg:self-start">
            <InstructorSettingsNav />
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}
