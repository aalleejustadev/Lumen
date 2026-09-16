"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MESSAGE_ALL_LIMIT } from "@/lib/config/instructor-students"

/**
 * **Message all** — the one control on this page the export draws and does not
 * explain.
 *
 * It is built rather than drawn inert because a page's primary action that
 * opens nothing is the 404 this codebase's own rule refuses, and the page's
 * lead already promises it ("reach out when someone stalls"). But a button
 * that silently wrote into 1,500 inboxes would be the other kind of mistake,
 * so it asks first, and what it asks is shaped by three decisions:
 *
 *  - **It names the real number it will reach, before you type anything.**
 *    That count is the *current filter's*, not the whole cohort — which is
 *    what makes the control useful (message everyone stalled in one course)
 *    and what makes the cap acceptable. Narrowing the filter is how you aim
 *    it, and the dialog says so when the cap has bitten.
 *  - **There is no Cancel**, per the standing rule: `DialogContent` already
 *    draws a close X, so a second control whose only job is to dismiss is the
 *    redundancy the payout-run dialog had removed.
 *  - **It is one message into each student's existing thread**, not a
 *    broadcast channel — so a reply lands in the ordinary inbox and the
 *    conversation continues where every other one does. `messageAllStudents`
 *    is what guarantees that; see its note.
 *
 * There is no export for this dialog, so it borrows the vocabulary
 * `new-category__dialog_admin.png` sets and `payout-method-dialog.tsx` already
 * borrowed: a 478px content column on 30px padding, with a 40px submit.
 */
function MessageAllDialog({
  open,
  onOpenChange,
  recipients,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** How many students the current filter holds — the server caps the send at
   *  `MESSAGE_ALL_LIMIT` regardless, which is what the note below says. */
  recipients: number
  pending: boolean
  onSubmit: (body: string) => void
}) {
  const [body, setBody] = React.useState("")

  // Reset when the dialog opens, adjusted during render rather than in an
  // effect — React's own "a prop changed, reset some state" pattern and the
  // one the hooks lint rule accepts. Keyed on the boolean, so typing is never
  // clobbered by a re-render while it is open.
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setBody("")
  }

  const reach = Math.min(recipients, MESSAGE_ALL_LIMIT)
  const capped = recipients > MESSAGE_ALL_LIMIT

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-7.5 sm:max-w-[538px]">
        <DialogHeader className="gap-2 text-left">
          <DialogTitle className="text-[20px] font-bold">
            Message your students
          </DialogTitle>
          <DialogDescription className="text-[15px]">
            {recipients === 0
              ? "No student matches the current filter."
              : `This goes to ${reach} ${
                  reach === 1 ? "student" : "students"
                } matching your current filter, in their own conversation about the course they're taking.`}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 grid gap-2">
          <Label htmlFor="message-all-body" className="text-[15px]">
            Message
          </Label>
          <Textarea
            id="message-all-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            placeholder="Checking in — how are you getting on with the course?"
            className="resize-none text-[15px] md:text-[15px] dark:bg-background"
          />
          {capped ? (
            <p className="text-[13px] text-muted-foreground">
              {recipients} students match. This sends to the first {reach} —
              narrow the filter to reach the rest.
            </p>
          ) : null}
        </div>

        <DialogFooter className="mt-7">
          <Button
            type="button"
            loading={pending}
            disabled={recipients === 0 || body.trim() === ""}
            onClick={() => onSubmit(body)}
            className="h-10 px-4"
          >
            Send message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { MessageAllDialog }
