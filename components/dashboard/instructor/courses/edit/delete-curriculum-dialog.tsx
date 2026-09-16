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
import { deleteCurriculumCopy } from "@/lib/config/course-editor"

/** What is about to be deleted — the board holds one of these or nothing. */
export type DeleteTarget =
  | { kind: "section"; sectionId: string; title: string; lessons: number }
  | { kind: "lesson"; sectionId: string; lessonId: string; title: string }

/**
 * The confirmation behind both trash buttons on the Curriculum step.
 *
 * It borrows `delete-category-dialog.tsx`' geometry rather than inventing a
 * second dialog language — 440px on 30px padding, a 20px/700 title over a 15px
 * lead, and one 44px `destructive` action — and holds **no Cancel**, per the
 * standing rule: `DialogContent` already draws a close X, so a second control
 * whose only job is to dismiss is redundant.
 *
 * **It has no pending state, and that is not an omission.** Everything on this
 * step is applied locally and told to the server afterwards, so confirming
 * closes the dialog and the row goes at once; a spinner would be waiting for
 * something the instructor has already been shown the result of. If the write
 * is refused the row comes back and the board toasts why — see
 * `curriculum-board.tsx`.
 */
function DeleteCurriculumDialog({
  target,
  onOpenChange,
  onConfirm,
}: {
  target: DeleteTarget | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const copy =
    target?.kind === "section"
      ? {
          ...deleteCurriculumCopy.section,
          description: deleteCurriculumCopy.section.description(
            target.title,
            target.lessons
          ),
        }
      : {
          ...deleteCurriculumCopy.lesson,
          description: deleteCurriculumCopy.lesson.description(
            target?.title ?? ""
          ),
        }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="w-[440px] gap-0 p-7.5 sm:max-w-[440px]">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-bold">{copy.title}</DialogTitle>
          <DialogDescription className="text-[15px] leading-6">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="h-11 gap-2 px-5"
          >
            <Trash2Icon className="size-4" />
            {copy.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { DeleteCurriculumDialog }
