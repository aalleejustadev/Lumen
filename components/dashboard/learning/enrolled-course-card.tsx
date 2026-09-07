import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { EnrolledCourse } from "@/lib/config/my-learning"

/**
 * An enrolled-course card from `my-learning-page.png`. Same shell as the
 * catalog's `course-card.tsx` — per-category gradient art plus the category
 * badge, not the export's photos (see `lumen-course-card-art`) — but the
 * body below the title carries progress instead of price and rating.
 *
 * Everything links to `/dashboard/learning/[slug]` — the *enrolled* course
 * page, not `/dashboard/courses/[slug]`, which is the sale page for students
 * who haven't bought yet.
 */
function EnrolledCourseCard({ course }: { course: EnrolledCourse }) {
  const href = `/dashboard/learning/${course.slug}`

  return (
    <Card className="gap-0 overflow-hidden p-0 transition-shadow hover:shadow-card">
      <Link href={href} className="flex flex-col">
        <div
          className={`relative grid aspect-[725/242] place-items-center bg-gradient-to-br ${course.art}`}
        >
          <course.icon className="size-12 text-white/25" />
          <Badge className="absolute top-3 left-3 h-[22px] bg-black/55 px-2.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {course.category}
          </Badge>
        </div>

        <div className="flex flex-col px-5 pt-4">
          <h3 className="text-lg leading-snug">{course.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {course.instructor}
          </p>
        </div>
      </Link>

      <div className="px-5 pt-3">
        <div className="flex items-center gap-3">
          {/* `w-full` is load-bearing: a `Progress` with no width inside a
              flex row shrinks to its (empty) content and renders at 0px. */}
          <Progress
            value={course.progress}
            aria-label={`${course.title} progress`}
            className="w-full [&_[data-slot=progress-indicator]]:bg-bar-fill [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-track"
          />
          <span className="shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">
            {course.progress}%
          </span>
        </div>

        <p className="mt-2.5 text-sm text-muted-foreground">
          {course.completedLessons} / {course.totalLessons} lessons ·{" "}
          {course.nextLesson ? `Next: ${course.nextLesson}` : "Completed"}
        </p>
      </div>

      <div className="px-5 pt-4 pb-5">
        <Button
          nativeButton={false}
          render={<Link href={href} />}
          className="h-11 w-full gap-1.5 font-semibold"
        >
          {course.completed ? "Review" : "Continue"}
          <ChevronRightIcon data-icon="inline-end" className="size-4" />
        </Button>
      </div>
    </Card>
  )
}

export { EnrolledCourseCard }
