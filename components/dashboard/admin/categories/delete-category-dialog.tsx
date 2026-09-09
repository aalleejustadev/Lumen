"use client"

import { Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteCategoryCopy } from "@/lib/config/admin-categories"

/**
 * The confirmation behind "Delete category". No export draws it, and it is not
 * an embellishment: the menu's other item opens a form you can back out of,
 * while this one is immediate and cannot be undone.
 *
 * It borrows the New-category dialog's own geometry rather than inventing a
 * second dialog language — 30px padding, a 20px/700 title over a 15px lead,
 * and a 44px action — and holds **one** button, for the reason `CLAUDE.md`
 * records as the standing rule: `DialogContent` already draws a close X, so a
 * "Cancel" beside it would be a second control whose only job is to dismiss.
 *
 * The button is `destructive`, which in this app's `buttonVariants` is a
 * tinted red rather than a filled one — the same weight the course review
 * page's Reject carries, and the right one for a decision with no undo.
 */
function DeleteCategoryDialog({
  open,
  onOpenChange,
  name,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[440px] gap-0 p-7.5 sm:max-w-[440px]">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-bold">
            {deleteCategoryCopy.title}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-6">
            {deleteCategoryCopy.description(name)}
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
            <Trash2Icon className="size-4" />
            {deleteCategoryCopy.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { DeleteCategoryDialog }
