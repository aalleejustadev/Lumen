"use client"

import * as React from "react"
import { MessageCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  REVIEW_REPLY_MAX,
  replyDialogCopy,
} from "@/lib/config/instructor-reviews"

/**
 * "Reply to this review" — where the card's **Reply** button goes.
 *
 * `reviews-page.png` draws the button and its result (the inset reply block)
 * and nothing in between, so this dialog has no export of its own. It is built
 * from `request-changes__dialog_admin.png`'s vocabulary — a 520px dialog on
 * 30px padding over a 90px textarea and a 44px submit — the borrowing
 * `payout-method-dialog.tsx` makes from a dialog export for a surface that has
 * none.
 *
 * **The export's dialogs draw no Cancel and neither does this**, per the
 * standing rule: `DialogContent` already draws a close X, and a second control
 * whose only job is to dismiss is the redundancy the payout-run dialog had
 * removed.
 *
 * The description says out loud that the reply is public. A review reply is
 * the one thing an instructor writes on this page that a stranger reads, and
 * `CourseReviewReply` has no edit path — so the warning belongs before the
 * click rather than in a toast after it.
 */
function ReplyDialog({
  open,
  onOpenChange,
  authorName,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  authorName: string
  pending: boolean
  onSubmit: (body: string) => void
}) {
  const [body, setBody] = React.useState("")

  // Cleared on close, not on open, so the field doesn't visibly empty itself
  // during the closing animation — `request-changes-dialog.tsx`' note.
  function handleOpenChange(next: boolean) {
    if (!next) setBody("")
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* `sm:max-w-[520px]` repeats the variant on purpose: `DialogContent`
          carries `sm:max-w-sm` (384px), which a plain `max-w-*` loses to above
          the breakpoint whatever order Tailwind emits. */}
      <DialogContent className="w-[520px] gap-0 p-7.5 sm:max-w-[520px]">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-bold">
            {replyDialogCopy.title}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-6">
            {replyDialogCopy.description(authorName)}
          </DialogDescription>
        </DialogHeader>

        {/* `bg-background` and its repeated `dark:` twin: the field sits on a
            white dialog, so the page colour is what separates the two, and the
            variant is spelled twice because `Textarea` carries
            `dark:bg-input/30` — the trap `settings-controls.ts` documents. */}
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={REVIEW_REPLY_MAX}
          placeholder={replyDialogCopy.placeholder}
          aria-label={replyDialogCopy.title}
          className="mt-6 min-h-[110px] resize-none bg-background text-[15px] md:text-[15px] dark:bg-background"
        />

        <div className="mt-7">
          <Button
            type="button"
            loading={pending}
            disabled={body.trim() === ""}
            onClick={() => onSubmit(body)}
            className="h-11 gap-2 px-5"
          >
            <MessageCircleIcon className="size-4" />
            {replyDialogCopy.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { ReplyDialog }
