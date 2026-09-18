import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { InstructorOverview } from "@/components/dashboard/instructor/overview/instructor-overview"
import { instructorOverviewCopy } from "@/lib/config/instructor-nav"
import { siteConfig } from "@/lib/config/site"
import { getInstructorOverview } from "@/lib/instructor-overview"

export const metadata: Metadata = {
  title: `Instructor · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor` — the instructor workspace's landing page, and where
 * the Student / Instructor switch drops you.
 *
 * The heading row is the one `instructor-dashboard.png` draws, and its badge is
 * the sibling of the student Overview's "Student mode" and the console's
 * "Admin mode" pill: sampled off that export, the fill is the page ground
 * (244,244,243 — i.e. transparent, like the console's rather than the
 * student's `bg-card`) and the dot is #8a5cf5, which is `--role-instructor`
 * exactly. The title carries an explicit `font-bold` for the reason the
 * dashboard exports' own measurements give — `globals.css` sets every `h1` to
 * 800 and these draw 700.
 *
 * **The bento grid is the export's seven cards, over real rows.** It was a
 * placeholder for a stated reason — production progress, completion, watch
 * time and per-instructor revenue all needed reads that did not exist. They do
 * now: enrolment is written on purchase, `LessonProgress` by the lesson
 * player, `InstructorEarning` at fulfilment, and `CourseLesson.isPublished` by
 * the editor. `lib/instructor-overview.ts` is the one read behind all seven,
 * and an account with no courses gets empty states rather than seeded figures.
 */
export default async function InstructorDashboardPage() {
  const data = await getInstructorOverview()
  // The layout's guard already refuses anyone without a teaching profile, so
  // a null here means the profile vanished mid-request rather than a visitor
  // who should be redirected.
  if (!data) notFound()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="flex items-center gap-3">
        <h1 className="text-[32px] leading-none font-bold">
          {instructorOverviewCopy.title}
        </h1>
        <Badge
          variant="outline"
          className="h-6.5 gap-2 border-border bg-transparent px-3 font-medium text-foreground"
        >
          <span className="size-1.5 rounded-full bg-role-instructor" />
          {instructorOverviewCopy.modeBadge}
        </Badge>
      </div>

      <div className="mt-6">
        <InstructorOverview data={data} />
      </div>
    </main>
  )
}
