"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { publishToggleCopy } from "@/lib/config/instructor-course-manage"
import { setCoursePublished } from "@/lib/actions/instructor-course-manage"

/**
 * **Unpublish** on a live course, **Republish** on one that has been taken
 * down — the only control on this page that writes anything.
 *
 * Red text on the page's own surface rather than a filled destructive button,
 * which is what the export draws and the right weight for it: the same
 * treatment the admin course view gives **Reject**, its one irreversible
 * decision.
 *
 * **Only the unpublish direction is confirmed.** That is the split
 * `maintenance-dialog.tsx` makes and for its reason — taking a live course off
 * sale ends every prospective learner's ability to buy it, where re-listing
 * one an admin already approved restores a state the platform was happily in.
 * The dialog drops a Cancel, per the standing rule: `DialogContent` already
 * draws a close X, so a second control whose only job is to dismiss is
 * redundant.
 *
 * `router.refresh()` after a success rather than relying on the action's
 * `revalidatePath` alone: that call re-renders the *dashboard* layout tree, and
 * this page's own header pill and stats live under a different route group.
 */
function PublishToggle({
  courseId,
  published,
}: {
  courseId: string
  published: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function run(next: boolean) {
    startTransition(async () => {
      const result = await setCoursePublished(courseId, next)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) {
        setOpen(false)
        router.refresh()
      }
    })
  }

  if (!published) {
    return (
      <Button
        type="button"
        variant="outline"
        loading={pending}
        onClick={() => run(true)}
        className="h-[38px] bg-card px-4 text-[14px]"
      >
        {publishToggleCopy.republish.action}
      </Button>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-[38px] bg-card px-4 text-[14px] text-destructive hover:text-destructive"
      >
        {publishToggleCopy.unpublish.action}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* `maintenance-dialog.tsx`' geometry, reused rather than
            re-derived — 440px on 30px padding, a 20px/700 title over a 15px
            lead and one 44px action. Neither is drawn by an export, and two
            confirmations in one app should not be two dialogs. */}
        <DialogContent className="w-[440px] gap-0 p-7.5 sm:max-w-[440px]">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-xl font-bold">
              {publishToggleCopy.unpublish.title}
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-6">
              {publishToggleCopy.unpublish.description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            <Button
              type="button"
              variant="destructive"
              loading={pending}
              onClick={() => run(false)}
              className="h-11 px-5"
            >
              {publishToggleCopy.unpublish.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { PublishToggle }
