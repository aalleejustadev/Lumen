import { AdminSettingsNav } from "@/components/dashboard/admin/settings/admin-settings-nav"
import { adminSettingsHeading } from "@/lib/config/admin-settings"

/**
 * The admin settings shell, from
 * `ui-design/light/dashboard/admin/platform-settings.png`: the heading block,
 * then a two-column grid of the sections card and whichever section is open.
 *
 * A layout rather than something each of the four pages repeats, so they keep
 * one nav card and the heading cannot drift between them — the arrangement
 * `app/(dashboard)/dashboard/settings/layout.tsx` already makes for the
 * learner's four.
 *
 * Measured off that export at DPR 2 and verified against the render: a 228px
 * nav card, a 28px gutter and a 922px form card — **exactly** the learner
 * shell's numbers, adding to the same 1178px content column. So the values
 * are the same here, not re-derived: the two exports draw one design at two
 * sets of copy, and a 6px difference invented by re-measuring would be a bug
 * nobody could explain later. Like that layout, this one is capped rather
 * than full-width, unlike every other console page.
 *
 * The nav card is `self-start` so it keeps its own height — CSS Grid's
 * default `align-items: stretch` would otherwise pull it down to match the
 * far taller form column, the trap `course-purchase-card.tsx` documents.
 *
 * The `h1` carries an explicit `font-bold`: `globals.css` sets every `h1`/`h2`
 * to 800 and the dashboard exports draw 700 — see the design note in
 * `CLAUDE.md`.
 *
 * The role guard lives in `app/(admin)/layout.tsx`, which covers every route
 * in this group.
 */
export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="max-w-[1178px]">
        <div>
          <h1 className="text-[32px] leading-none font-bold">
            {adminSettingsHeading.title}
          </h1>
          <p className="mt-2.5 text-muted-foreground">
            {adminSettingsHeading.description}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-[228px_minmax(0,1fr)]">
          <div className="lg:self-start">
            <AdminSettingsNav />
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}
