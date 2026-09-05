import {
  AwardIcon,
  BarChart3Icon,
  BookOpenIcon,
  ClockIcon,
  DownloadIcon,
  FileQuestionIcon,
  PlayIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CoursePreviewDialog } from "@/components/dashboard/courses/sale/course-preview-dialog"
import {
  CourseBuyButtons,
  CourseSaveButtons,
} from "@/components/dashboard/courses/sale/course-purchase-actions"
import { isWishlisted } from "@/lib/cart"
import type { CourseDetail } from "@/lib/config/course-details"
import { cn } from "@/lib/utils"

/**
 * The sticky purchase panel — visible at the top of both
 * `course-sale-page-part-1.png` and `-part-2.png` because it's the same
 * pinned element, not two renders of it. `self-start` on the grid item is
 * required alongside `sticky`: CSS Grid's default `align-items: stretch`
 * otherwise stretches the item to the (taller) left column's height, leaving
 * nothing for it to stick within.
 *
 * Async because it reads the viewer's wishlist state for `CourseSaveButtons`.
 * That's a query inside a component rather than a prop threaded from the
 * page, which keeps the button's data next to the button — `getSession()` is
 * React-cached, so it costs one extra row lookup, not another session round
 * trip.
 */
async function CoursePurchaseCard({ course }: { course: CourseDetail }) {
  const wishlisted = await isWishlisted(course.slug)

  const includes = [
    {
      icon: PlayIcon,
      label: `${course.includes.videoHours} hours on-demand video`,
    },
    {
      icon: BookOpenIcon,
      label: `${course.includes.articlesCount} articles and cheat sheets`,
    },
    {
      icon: FileQuestionIcon,
      label: `${course.includes.quizzesCount} quizzes with explanations`,
    },
    course.includes.downloadableResources
      ? { icon: DownloadIcon, label: "Downloadable project files" }
      : null,
    course.includes.certificate
      ? { icon: AwardIcon, label: "Certificate of completion" }
      : null,
    course.includes.lifetimeAccess
      ? { icon: BarChart3Icon, label: "Lifetime access, all devices" }
      : null,
  ].filter((item) => item !== null)

  // `CoursePreviewDialog` is a Client Component and `course.icon` is a
  // `LucideIcon` component reference, which can't cross that boundary as a
  // prop — so it's stripped off before the course goes down (see the dialog's
  // own note).
  const { icon: CourseIcon, ...previewCourse } = course

  return (
    <Card className="gap-0 overflow-hidden p-0 ring-border lg:sticky lg:top-[86px] lg:self-start">
      <div
        className={cn(
          "relative aspect-[696/300] bg-gradient-to-br",
          course.art
        )}
      >
        <CourseIcon className="absolute inset-0 m-auto size-16 text-white/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <CoursePreviewDialog course={previewCourse}>
          <button
            type="button"
            className="absolute bottom-4 left-4 flex cursor-pointer items-center gap-2 text-sm font-semibold text-white"
          >
            <PlayIcon className="size-4 fill-white" />
            Preview this course
          </button>
        </CoursePreviewDialog>
      </div>

      <div className="p-6.5">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[28px] font-extrabold tracking-[-0.02em] tabular-nums">
            ${course.price.toFixed(2)}
          </span>
          <span className="text-base text-muted-foreground tabular-nums line-through">
            ${course.listPrice.toFixed(2)}
          </span>
          <Badge className="h-6 bg-destructive/10 px-2 text-xs font-semibold text-destructive">
            {course.discountPercent}% off
          </Badge>
        </div>

        {course.saleEndsInDays > 0 ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-destructive">
            <ClockIcon className="size-4" />
            Sale ends in {course.saleEndsInDays} day
            {course.saleEndsInDays === 1 ? "" : "s"}
          </p>
        ) : null}

        <CourseBuyButtons slug={course.slug} />
        <p className="mt-3 text-center text-[13px] text-muted-foreground">
          30-day money-back guarantee
        </p>

        <Separator className="my-5" />

        <h3 className="font-semibold">This course includes</h3>
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {includes.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3 text-sm text-muted-foreground"
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </li>
          ))}
        </ul>

        <Separator className="my-5" />

        <CourseSaveButtons slug={course.slug} wishlisted={wishlisted} />
      </div>
    </Card>
  )
}

export { CoursePurchaseCard }
