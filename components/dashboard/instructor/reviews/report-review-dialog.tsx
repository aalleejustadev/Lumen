"use client"

import * as React from "react"
import { SendHorizontalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import {
  REPORT_NOTE_MAX,
  reportDialogCopy,
  reportReasonOptions,
} from "@/lib/config/instructor-reviews"

/**
 * "Report this review" — where the card's **Report** button goes.
 *
 * Like the reply dialog it has no export of its own and is built from
 * `request-changes__dialog_admin.png`'s vocabulary: a 520px dialog on 30px
 * padding, the reasons on a 20px pitch, a 90px note and a 44px submit.
 *
 * Three things about it:
 *
 *  - **The reasons are a radio group, not checkboxes.** `ContentReport.reason`
 *    is a single enum column and the admin queue draws one pill per report, so
 *    a multi-select would have to pick one to store and throw the rest away.
 *    That is the opposite call from `request-changes-dialog.tsx`, whose
 *    reasons really are a list.
 *  - **A reason is required and the note is not**, which is what those two
 *    columns say: `reason` is non-null, `note` is nullable. The submit is
 *    disabled until one is picked rather than refusing afterwards.
 *  - **The description states the platform's rule** — reviews are never
 *    removed for being critical — in the same words the admin queue's own lead
 *    uses. The two sides of one decision must not be promised different
 *    things, which is the point `instructor-help.ts` records about quoting
 *    rules rather than re-writing them.
 *
 * No Cancel, per the standing dialog rule.
 */
function ReportReviewDialog({
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onSubmit: (input: { reason: string; note: string }) => void
}) {
  const [reason, setReason] = React.useState("")
  const [note, setNote] = React.useState("")

  function handleOpenChange(next: boolean) {
    if (!next) {
      setReason("")
      setNote("")
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[520px] gap-0 p-7.5 sm:max-w-[520px]">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-bold">
            {reportDialogCopy.title}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-6">
            {reportDialogCopy.description}
          </DialogDescription>
        </DialogHeader>

        <p
          id="report-reason-heading"
          className="mt-6 text-[15px] font-semibold"
        >
          {reportDialogCopy.reasonHeading}
        </p>
        <RadioGroup
          value={reason}
          onValueChange={(value: string) => setReason(value)}
          // The heading *is* the group's label, so point at it rather than
          // repeating the string in an `aria-label` — `notifications-form.tsx`.
          aria-labelledby="report-reason-heading"
          className="mt-3 gap-3"
        >
          {reportReasonOptions.map((option) => (
            <div key={option.value} className="flex items-center gap-3">
              <RadioGroupItem
                id={`report-${option.value}`}
                value={option.value}
              />
              <label
                htmlFor={`report-${option.value}`}
                className="cursor-pointer text-[15px]"
              >
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup>

        <label
          htmlFor="report-review-note"
          className="mt-6 text-[15px] font-semibold"
        >
          {reportDialogCopy.noteHeading}
        </label>
        {/* `bg-background` with its repeated `dark:` twin, for the reason
            `settings-controls.ts` records. */}
        <Textarea
          id="report-review-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={REPORT_NOTE_MAX}
          placeholder={reportDialogCopy.notePlaceholder}
          className="mt-3 min-h-[90px] resize-none bg-background text-[15px] md:text-[15px] dark:bg-background"
        />

        <div className="mt-7">
          <Button
            type="button"
            loading={pending}
            disabled={reason === ""}
            onClick={() => onSubmit({ reason, note })}
            className="h-11 gap-2 px-5"
          >
            <SendHorizontalIcon className="size-4" />
            {reportDialogCopy.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { ReportReviewDialog }
