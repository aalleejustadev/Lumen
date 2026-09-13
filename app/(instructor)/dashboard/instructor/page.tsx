import type { Metadata } from "next"
import Link from "next/link"
import { PresentationIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { instructorOverviewCopy } from "@/lib/config/instructor-nav"
import { siteConfig } from "@/lib/config/site"

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
 * **The bento grid beneath it is not built yet.** `instructor-dashboard.png`
 * draws seven cards — production progress, completion rate, course output, a
 * watch-time donut, revenue by month and a top-courses table — each of which
 * needs reads that do not exist (`WatchTimeRollup`, lesson publication state,
 * per-instructor revenue). Rather than invent a different overview, or fill
 * the space with figures nobody can trust, the page says plainly where the
 * work stands. Replace this block with that grid; the shell, the guard and the
 * heading above it stay as they are.
 */
export default function InstructorDashboardPage() {
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

      <Empty className="mt-6 rounded-xl border bg-card py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PresentationIcon />
          </EmptyMedia>
          <EmptyTitle>Your teaching workspace is ready</EmptyTitle>
          <EmptyDescription>
            Everything in the sidebar is this mode — your courses, your
            students, your earnings. The pages behind those rows are being
            built; the Overview lands here first.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            Back to student mode
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
