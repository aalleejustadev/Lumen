"use client"

import { TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { maintenanceToggle } from "@/lib/config/admin-settings"

/**
 * The confirmation in front of the danger zone's one switch.
 *
 * No export draws it, and it is not an embellishment. Every other control on
 * Platform Controls saves the instant it is touched, which is right for a
 * setting you can put back by touching it again; this one, by its own
 * description, signs every learner and instructor out of the platform. A
 * mis-click there is not an edit, it is an outage — so it is the one switch
 * that asks. The same reasoning `delete-category-dialog.tsx` gives for being
 * the only confirmed item on its own page.
 *
 * **It only guards the "on" direction.** Turning maintenance mode off
 * restores service, which nobody needs protecting from.
 *
 * It borrows that dialog's geometry rather than inventing a second dialog
 * language — 440px on 30px padding, a 20px/700 title over a 15px lead, a 44px
 * action — and holds **one** button, per the standing rule `CLAUDE.md`
 * records: `DialogContent` already draws a close X, so a "Cancel" beside it
 * would be a second control whose only job is to dismiss.
 */
function MaintenanceDialog({
  open,
  onOpenChange,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[440px] gap-0 p-7.5 sm:max-w-[440px]">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-bold">
            {maintenanceToggle.confirmTitle}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-6">
            {maintenanceToggle.confirmDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <Button
            type="button"
            variant="destructive"
            loading={pending}
            onClick={onConfirm}
            className="h-11 gap-2 px-5"
          >
            <TriangleAlertIcon className="size-4" />
            {maintenanceToggle.confirmAction}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { MaintenanceDialog }
