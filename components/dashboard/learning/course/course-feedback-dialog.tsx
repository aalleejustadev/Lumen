"use client"

import * as React from "react"
import { StarIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const RATING_LABELS = [
  "Poor",
  "Fair",
  "Good",
  "Very good",
  "Excellent",
] as const

/**
 * The "How is the course going?" prompt from `course-feedback.png`. Measured
 * off that export at DPR 2: a **518 x 437** dialog on `p-8`, a 60px amber
 * tile over a 24px heading, three lines of centred lead, a row of 36px stars
 * and a 48px button, with the footnote under it.
 *
 * The export draws the *unrated* state, so that is what this opens on:
 * outline button reading "Maybe later", stars unfilled. Picking a rating is
 * live — the stars fill on hover and click, and the button becomes a primary
 * "Submit rating" — because a five-star row that did nothing would be worse
 * than no row at all.
 *
 * **Nothing is written.** There is no `CourseReview` table behind this yet, so
 * submitting toasts and closes. It is also not yet triggered by anything real:
 * the prompt is meant to appear on its own once a student is a few lessons in,
 * which needs enrolment progress to exist. Until then `dashboard-search.tsx`
 * carries a palette entry so the design can be looked at — see the note there.
 */
function CourseFeedbackDialog({
  open,
  onOpenChange,
  courseTitle,
  instructorFirstName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseTitle: string
  instructorFirstName: string
}) {
  const [rating, setRating] = React.useState(0)
  const [hovered, setHovered] = React.useState(0)

  // The row fills to whichever is further along, so hovering previews a
  // rating without discarding the one already chosen.
  const shown = hovered || rating

  function close(open: boolean) {
    onOpenChange(open)
    if (!open) {
      setRating(0)
      setHovered(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] gap-0 rounded-2xl p-8 text-center sm:max-w-[518px]"
      >
        {/* Base UI moves focus here when the dialog opens, so this button
            always shows a focus ring. Without the two `focus-visible:` rules
            it's the browser's own black outline, not the app's ring. */}
        <DialogClose className="absolute top-5 right-5 flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <span className="mx-auto flex size-15 items-center justify-center rounded-2xl bg-star/15 text-star">
          <StarIcon className="size-7" />
        </span>

        <DialogTitle className="mt-6 font-sans text-2xl leading-tight font-bold">
          How is the course going?
        </DialogTitle>

        {/* A measure, not just the dialog's padding: the export sets this
            lead about two-thirds of the dialog's width so it wraps to three
            balanced lines rather than running the full 454px content box. */}
        <DialogDescription className="mx-auto mt-2.5 max-w-[400px] text-[17px] leading-7 text-muted-foreground">
          You have started {courseTitle} — your rating helps other learners
          decide, and helps {instructorFirstName} improve the course.
        </DialogDescription>

        <div
          className="mt-7 flex items-center justify-center gap-4"
          onMouseLeave={() => setHovered(0)}
        >
          {RATING_LABELS.map((label, index) => {
            const value = index + 1
            return (
              <button
                key={label}
                type="button"
                onClick={() => setRating(value)}
                onMouseEnter={() => setHovered(value)}
                onFocus={() => setHovered(value)}
                onBlur={() => setHovered(0)}
                aria-pressed={rating === value}
                className="cursor-pointer rounded-sm transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <StarIcon
                  className={cn(
                    "size-9",
                    value <= shown
                      ? "fill-star text-star"
                      : "fill-track text-track"
                  )}
                />
                <span className="sr-only">
                  {value} {value === 1 ? "star" : "stars"} — {label}
                </span>
              </button>
            )
          })}
        </div>

        {rating > 0 ? (
          <Button
            onClick={() => {
              toast.add({
                title: `Thanks — you rated ${courseTitle} ${rating} ${rating === 1 ? "star" : "stars"}.`,
                type: "success",
              })
              close(false)
            }}
            className="mx-auto mt-7 h-12 px-8 font-semibold"
          >
            Submit rating
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => close(false)}
            className="mx-auto mt-7 h-12 bg-card px-8 font-semibold shadow-sm"
          >
            Maybe later
          </Button>
        )}

        <p className="mt-4 text-sm text-subtle-foreground">
          You can update your review any time from My Learning.
        </p>
      </DialogContent>
    </Dialog>
  )
}

export { CourseFeedbackDialog }
