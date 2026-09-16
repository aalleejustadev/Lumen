import Link from "next/link"
import { ArrowLeftIcon, GraduationCapIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CourseArt } from "@/components/dashboard/course-art"
import { PublishToggle } from "@/components/dashboard/instructor/courses/manage/publish-toggle"
import { courseStatusBadge } from "@/lib/config/course-status"
import { manageCourseCopy } from "@/lib/config/instructor-course-manage"
import { previewAsStudentHref } from "@/lib/course-return"
import type { ManageCoursePage } from "@/lib/instructor-course-manage"
import { cn } from "@/lib/utils"

/**
 * The top of `manage-course.png`: the back link, a 96 x 64 thumbnail beside
 * the 24px/700 title and its status pill, the lead underneath, and the two
 * actions at the trailing edge.
 *
 * Measured at DPR 2: the back link on a 14px row at the page's own 32px inset
 * — `leading-none`, or the inherited 1.5 line box drops the whole header 5px —
 * the title block 16px under it, a 96 x 64 thumbnail **20px** from a 24px/700
 * title, a 20px pill 12px past that, and two 38px buttons right-aligned to the
 * content column.
 *
 * A **Server Component** — only the publish control needs the client, and it
 * is its own file, so the thumbnail, the pill and the preview link never reach
 * the bundle.
 *
 * **Preview as student** opens `/dashboard/learning/[slug]`, the *enrolled*
 * course page — the player, the syllabus and the four tabs somebody sees after
 * buying. Not `/dashboard/courses/[slug]`, which is the sale page: an
 * instructor previewing their own course wants to see what they teach, not the
 * pitch, and the sale page only resolves a course that is in the static
 * student catalog. It links unconditionally rather than going inert on an
 * unpublished course, because the enrolled page does not gate on status and an
 * archived course is precisely one whose owner may still want to look at it.
 *
 * The href comes from `lib/course-return.ts` rather than being written here,
 * because it carries `?via=manage` — which is what lets that page send the
 * instructor back *here* instead of into the student shell's My Learning.
 */
function ManageHeader({ course }: { course: ManageCoursePage }) {
  const badge = courseStatusBadge(course.status)
  const published = course.status === "PUBLISHED"

  return (
    <div>
      <Link
        href="/dashboard/instructor/courses"
        className="inline-flex items-center gap-2 text-[14px] leading-none text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {manageCourseCopy.back}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-start gap-5">
          <CourseArt
            thumbnailUrl={course.thumbnailUrl}
            categorySlug={course.categorySlug}
            categoryAccent={course.categoryAccent}
            className="h-16 w-24 shrink-0 overflow-hidden rounded-xl"
            iconClassName="size-6"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl leading-tight font-bold">
                {course.title}
              </h1>
              <span
                className={cn(
                  "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[12px] font-medium",
                  badge.className
                )}
              >
                {badge.label}
              </span>
            </div>
            <p className="mt-2 text-[15px] text-muted-foreground">
              {manageCourseCopy.lead}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-4">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={previewAsStudentHref(course.slug)} />}
            className="h-[38px] gap-2 bg-card px-4 text-[14px]"
          >
            <GraduationCapIcon className="size-4" />
            {manageCourseCopy.preview}
          </Button>

          <PublishToggle courseId={course.id} published={published} />
        </div>
      </div>
    </div>
  )
}

export { ManageHeader }
