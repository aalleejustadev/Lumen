"use client"

import * as React from "react"
import { SendHorizontalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  changeReasonOptions,
  NOTE_MAX_LENGTH,
  requestChangesCopy,
} from "@/lib/config/admin-courses"

/**
 * "Request changes", from
 * `ui-design/light/dashboard/admin/request-changes__dialog_admin.png`.
 *
 * Measured off that export at DPR 2: a **520px** dialog on 30px padding, the
 * five reasons as 16px checkboxes on a 20px pitch, a 90px textarea, and a 44px
 * submit.
 *
 * **The export's "Cancel" is deliberately not reproduced.** `DialogContent`
 * already draws a close X in its corner, and a second control whose only job
 * is to dismiss the dialog is the redundancy the payout-run dialog had removed
 * — the standing rule for dialogs in this app, which is why the footer keeps
 * the one button that actually does something.
 *
 * Both fields are optional, as the export allows: a note with no boxes ticked
 * is a perfectly ordinary request, and so is the reverse. State resets when
 * the dialog closes rather than persisting — the next course you send back is
 * a different conversation.
 */
function RequestChangesDialog({
  open,
  onOpenChange,
  courseTitle,
  instructorName,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseTitle: string
  instructorName: string
  pending: boolean
  onSubmit: (input: { reasons: string[]; note: string }) => void
}) {
  const [reasons, setReasons] = React.useState<string[]>([])
  const [note, setNote] = React.useState("")

  // Cleared on close, not on open, so the fields don't visibly empty
  // themselves during the closing animation.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setReasons([])
      setNote("")
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* `sm:max-w-[520px]` repeats the variant on purpose: `DialogContent`
          carries `sm:max-w-sm` (384px), and a plain `max-w-*` override loses
          to it above the breakpoint whatever order Tailwind emits — repeating
          the prefix is what lets tailwind-merge drop the generated one, the
          same fix `settings-controls.ts` documents for `md:text-sm`. */}
      <DialogContent className="w-[520px] gap-0 p-7.5 sm:max-w-[520px]">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-bold">
            {requestChangesCopy.title}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-6">
            {requestChangesCopy.description(courseTitle, instructorName)}
          </DialogDescription>
        </DialogHeader>

        <p className="mt-6 text-[15px] font-semibold">
          {requestChangesCopy.reasonsHeading}
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {changeReasonOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 text-[15px]"
            >
              <Checkbox
                checked={reasons.includes(option.value)}
                onCheckedChange={(checked) =>
                  setReasons((current) =>
                    checked === true
                      ? [...current, option.value]
                      : current.filter((entry) => entry !== option.value)
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </div>

        <label
          htmlFor="request-changes-note"
          className="mt-6 text-[15px] font-semibold"
        >
          {requestChangesCopy.noteHeading}
        </label>
        {/* `bg-background` and its repeated `dark:` twin: the field sits on a
            white card, so the export fills it with the page colour to separate
            the two. The variant is spelled twice because `Textarea` carries
            `dark:bg-input/30`, a `:is(.dark *)`-wrapped selector a plain
            override loses to — the trap `settings-controls.ts` documents. */}
        <Textarea
          id="request-changes-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={NOTE_MAX_LENGTH}
          placeholder={requestChangesCopy.notePlaceholder}
          className="mt-3 min-h-[90px] resize-none bg-background text-[15px] md:text-[15px] dark:bg-background"
        />

        <div className="mt-7">
          <Button
            type="button"
            loading={pending}
            onClick={() => onSubmit({ reasons, note })}
            className="h-11 gap-2 px-5"
          >
            <SendHorizontalIcon className="size-4" />
            {requestChangesCopy.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { RequestChangesDialog }
