import { Card } from "@/components/ui/card"
import {
  activityIcon,
  activityTone,
  manageCourseCopy,
} from "@/lib/config/instructor-course-manage"
import type { ActivityItem } from "@/lib/instructor-course-manage"
import { cn } from "@/lib/utils"

/**
 * **Recent activity** — the second card in the right column of
 * `manage-course.png`.
 *
 * Measured off that export at DPR 2: the health card's 576px shell on the same
 * 20px padding and 16px/700 title, then the items 18px below it on a 20px gap
 * — a **30px** tinted tile 12px from a 15px line over a 13px
 * `--subtle-foreground` timestamp on a 20px rhythm.
 *
 * **It is a merged view of four tables, not a stored log.** There is no
 * activity model and adding one would put a second copy of facts `Enrollment`,
 * `CourseReview`, `CourseQuestion` and `InstructorEarning` already hold — the
 * reasoning `Discussion.replyCount` records from the other side. What that
 * costs is that the feed is only as long as those four have to say, which is
 * why the empty state exists at all: the export draws four items because the
 * course it draws has four things to report.
 *
 * The timestamps arrive **already written** ("Today", "3 days ago"), for the
 * reason `audit-format.ts` gives: a relative time computed on both sides of
 * the boundary is a hydration mismatch waiting for a row to sit on a minute
 * boundary, and it keeps `date-fns` out of the bundle.
 *
 * A Server Component, so the four lucide glyphs never reach the client.
 */
function ActivityCard({ activity }: { activity: ActivityItem[] }) {
  return (
    <Card className="p-5 ring-border [--card-spacing:0px]">
      <h2 className="text-[16px] leading-none font-bold">
        {manageCourseCopy.activityHeading}
      </h2>

      {activity.length === 0 ? (
        <p className="mt-4 text-[15px] leading-5 text-muted-foreground">
          {manageCourseCopy.activityEmpty}
        </p>
      ) : (
        <ul className="mt-4.5 space-y-5">
          {activity.map((item) => {
            const Icon = activityIcon[item.kind]

            return (
              <li key={item.id} className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid size-[30px] shrink-0 place-items-center rounded-md",
                    activityTone[item.kind]
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-5">{item.text}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-subtle-foreground">
                    {item.when}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export { ActivityCard }
