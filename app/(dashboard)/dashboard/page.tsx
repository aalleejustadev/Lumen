import type { Metadata } from "next"

import { Badge } from "@/components/ui/badge"
import { DashboardOverview } from "@/components/dashboard/overview/dashboard-overview"
import { getSession } from "@/lib/auth"
import { getDashboardOverview } from "@/lib/dashboard-overview"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Dashboard · ${siteConfig.name}`,
}

/**
 * The student Overview page, built against
 * `ui-design/light/dashboard/student/student-dashboard.png`. Unlike the
 * marketing routes this is a dense app screen, so it runs the full content
 * width rather than the 1200px marketing column — `DashboardOverview` owns
 * the bento grid beneath the heading.
 *
 * The badge reads **Student mode** unconditionally. It used to say
 * "Instructor mode" when `User.intent` was TEACHING, which was a stand-in for
 * a mode that did not exist yet — and is now simply wrong: this is the student
 * shell, instructor mode is its own route group at `/dashboard/instructor`,
 * and `intent` is only the "I want to teach" box on the sign-up form. A pill
 * naming the mode you are *not* in would be worse than none.
 */
export default async function DashboardPage() {
  const session = await getSession()
  const user = session!.user
  const firstName = user.name.split(" ")[0] || user.name
  const overview = await getDashboardOverview()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="flex items-center gap-3">
        <h1 className="text-[32px] leading-none">Overview</h1>
        <Badge
          variant="outline"
          className="h-6 gap-1.5 border-border bg-card px-2.5 font-medium text-foreground"
        >
          <span className="size-1.5 rounded-full bg-accent-2" />
          Student mode
        </Badge>
      </div>

      <div className="mt-6">
        <DashboardOverview firstName={firstName} data={overview} />
      </div>
    </main>
  )
}
