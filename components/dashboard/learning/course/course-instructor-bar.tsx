import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import type { CoursePlayerCourse } from "@/lib/config/course-player"
import { instructorProfileHref } from "@/lib/course-return"
import { initialsOf } from "@/components/dashboard/learning/course/initials"

/**
 * The instructor strip between the player and the tabs, from
 * `course-page__part1.png`. Far lighter than the sale page's
 * `instructor-card.tsx` — no bio, no teaching stats — because the student has
 * already bought: this is a way back to the person, not a reason to trust
 * them.
 *
 * `courseSlug` becomes `?from=` on the profile link — with `via=learning`, so
 * the profile's "Back to course" returns *here* and not to the same course's
 * sale page, which is what the student would otherwise be shown for a course
 * they already own. See `lib/course-return.ts`.
 */
function CourseInstructorBar({
  instructor,
  courseSlug,
}: {
  instructor: CoursePlayerCourse["instructor"]
  courseSlug: string
}) {
  return (
    <Card className="flex-row items-center justify-between gap-4 p-5 ring-border">
      <div className="flex min-w-0 items-center gap-4">
        {/* `size` left at its default: `size="lg"` gates its own size behind
            `data-[size=lg]:size-10`, an attribute selector that beats a plain
            `size-12` regardless of source order — see `instructor-card.tsx`. */}
        <Avatar className="size-12 shrink-0">
          <AvatarImage src={instructor.avatarUrl} alt="" />
          <AvatarFallback>{initialsOf(instructor.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-bold">{instructor.name}</p>
          <p className="truncate text-[15px] leading-6 text-muted-foreground">
            Mentor · {instructor.title}
          </p>
        </div>
      </div>

      <Link
        href={instructorProfileHref(instructor.name, {
          courseSlug,
          via: "learning",
        })}
        className="flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-foreground hover:text-muted-foreground"
      >
        View profile
        <ChevronRightIcon className="size-4" />
      </Link>
    </Card>
  )
}

export { CourseInstructorBar }
