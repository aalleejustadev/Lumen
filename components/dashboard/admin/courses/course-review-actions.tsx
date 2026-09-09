"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { RequestChangesDialog } from "@/components/dashboard/admin/courses/request-changes-dialog"
import {
  approveCourse,
  rejectCourse,
  requestCourseChanges,
} from "@/lib/actions/admin-courses"
import { courseViewCopy } from "@/lib/config/admin-courses"

/**
 * The three buttons along the bottom of `course-view-page__admin.png`:
 * **Approve & publish**, **Request changes**, and a red **Reject**.
 *
 * Measured off that export at DPR 2: 44px controls on a 10px gap. Reject is
 * drawn as red *text* on a plain surface rather than a filled destructive
 * button, which is the right weight for the one decision on the page that
 * cannot be resubmitted against — it should not be the thing your eye lands
 * on. The `Button` "ghost" variant plus `text-destructive` is that, and it
 * keeps the focus ring and the cursor rules the other two have.
 *
 * The whole strip is only rendered for a course awaiting review; the composer
 * decides that, so this component never has to reason about status.
 *
 * On success it `router.refresh()`es rather than navigating away: the decision
 * changes the page you are standing on (the pill, the buttons), and the admin
 * may well want to read the checklist again before moving on. The list is one
 * click away in "Back to courses".
 */
function CourseReviewActions({
  courseId,
  courseTitle,
  instructorName,
}: {
  courseId: string
  courseTitle: string
  instructorName: string
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [requesting, setRequesting] = React.useState(false)

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action()
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) {
        setRequesting(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="mt-7 flex flex-wrap items-center gap-2.5">
        <Button
          disabled={pending}
          onClick={() => run(() => approveCourse(courseId))}
          className="h-11 gap-2 px-5"
        >
          <CheckIcon className="size-4" />
          {courseViewCopy.approve}
        </Button>

        <Button
          variant="outline"
          disabled={pending}
          onClick={() => setRequesting(true)}
          className="h-11 bg-card px-5 shadow-sm"
        >
          {courseViewCopy.requestChanges}
        </Button>

        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => rejectCourse(courseId))}
          className="h-11 px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {courseViewCopy.reject}
        </Button>
      </div>

      <RequestChangesDialog
        open={requesting}
        onOpenChange={setRequesting}
        courseTitle={courseTitle}
        instructorName={instructorName}
        pending={pending}
        onSubmit={(input) => run(() => requestCourseChanges(courseId, input))}
      />
    </>
  )
}

export { CourseReviewActions }
