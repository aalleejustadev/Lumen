"use client"

import { CircleCheckIcon, InfoIcon, MessageCircleIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Stars } from "@/components/dashboard/instructor/reviews/stars"
import { userRoleBadge } from "@/lib/config/admin-users"
import { reviewsCopy } from "@/lib/config/instructor-reviews"
import type { ReviewRow } from "@/lib/instructor-reviews"
import { cn } from "@/lib/utils"

/**
 * One review from `ui-design/light/dashboard/instructor/reviews-page.png`: the
 * reviewer's line, the headline and body, the two controls, and — once it has
 * one — the instructor's reply inset beneath them.
 *
 * Measured off that export at DPR 2: a card on **20px** vertical / 22px
 * horizontal padding, a **42px** avatar 14px from the content column, a
 * 15px/700 name beside 12px stars and the muted age, a 14px course line under
 * it, then a 16px/700 headline, 15px muted body, and the controls. The reply
 * is a **2px `--border`** rule at the content column's own left edge, 14px
 * from a **30px** avatar, 12px from a 15px/700 name beside the 18px
 * `Instructor` pill.
 *
 * Five things about it are decisions rather than markup:
 *
 *  - **The controls are built at the app's 40px baseline against the export's
 *    34px**, so the card renders ~6px taller than the 181px drawn. That is the
 *    standing trade `CLAUDE.md` states and `reported-review-card.tsx` and
 *    `courses-list.tsx` both already made against their own exports; the type
 *    is not shrunk to close it.
 *  - **"You replied" is a status, not a control.** The export draws it as
 *    green text with a tick where the unreplied card draws a filled button,
 *    and there is no edit affordance anywhere on it — `CourseReviewReply` is
 *    unique per review, so a reply is posted once. Adding an edit would be
 *    designing past the export; the reply is already on screen, which is the
 *    check that matters.
 *  - **Report goes inert once a report is open against the review**, with the
 *    reason on the control — the treatment `user-row-actions.tsx` gives a
 *    learner's "View profile". The queue already holds the review, so a second
 *    report adds a row to a moderator's morning and nothing to the decision.
 *    Hiding the button is not the guard: `reportReview` re-checks it.
 *  - **The reply's role pill is `userRoleBadge`**, not a local violet. Sampled,
 *    the export's text is `#8b5cf6` — `--role-instructor` exactly — and two
 *    surfaces must not tint the same word two ways, which is the call
 *    `auditRoleBadge` already made and the discussion thread kept.
 *  - **`CourseReview.title` is nullable**, so a review with no headline drops
 *    the line rather than drawing an empty one. The export only draws reviews
 *    that have one.
 */
function ReviewCard({
  row,
  busy,
  onReply,
  onReport,
}: {
  row: ReviewRow
  /** Which of this card's two controls is mid-flight, so only that one spins
   *  — the per-control rule `courses-list.tsx` states. */
  busy: "reply" | "report" | null
  onReply: () => void
  onReport: () => void
}) {
  const badge = userRoleBadge("instructor")

  return (
    <Card className="p-0 ring-border [--card-spacing:0px]">
      <div className="px-5.5 py-5">
        <div className="flex gap-3.5">
          <Avatar className="size-[42px] shrink-0">
            <AvatarImage
              src={row.authorImage ?? undefined}
              alt=""
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="bg-hover text-[13px] font-semibold text-foreground">
              {row.authorInitials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] leading-[22px]">
              <span className="font-bold">{row.authorName}</span>
              {/* The glyph row is `aria-hidden`, so the rating reaches a
                  screen reader as a sentence rather than as nothing — the
                  summary card needs no equivalent because it prints the
                  figure. */}
              <span className="sr-only">{reviewsCopy.rated(row.rating)}</span>
              <Stars rating={row.rating} />
              <span className="text-[14px] text-subtle-foreground">
                · {row.createdAgo}
              </span>
            </div>
            <p className="truncate text-[14px] leading-5 text-muted-foreground">
              {row.courseTitle}
            </p>

            {row.title ? (
              <p className="mt-0.5 text-base leading-6 font-bold">
                {row.title}
              </p>
            ) : null}
            <p
              className={cn(
                "text-[15px] leading-6 text-muted-foreground",
                row.title ? "mt-1" : "mt-2"
              )}
            >
              {row.body}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {row.reply ? (
                <span className="flex items-center gap-2 text-[15px] font-medium text-success">
                  <CircleCheckIcon className="size-4" />
                  {reviewsCopy.replied}
                </span>
              ) : (
                <Button
                  type="button"
                  loading={busy === "reply"}
                  onClick={onReply}
                  className="h-10 gap-2 px-4"
                >
                  <MessageCircleIcon className="size-4" />
                  {reviewsCopy.reply}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                loading={busy === "report"}
                disabled={row.reported}
                title={row.reported ? reviewsCopy.reportPending : undefined}
                onClick={onReport}
                className="h-10 gap-2 bg-card px-4 text-muted-foreground shadow-sm"
              >
                <InfoIcon className="size-4" />
                {reviewsCopy.report}
              </Button>
            </div>

            {row.reply ? (
              <div className="mt-3.5 flex gap-3 border-l-2 border-border pl-3.5">
                <Avatar className="size-[30px] shrink-0">
                  <AvatarImage
                    src={row.reply.authorImage ?? undefined}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback className="bg-hover text-[11px] font-semibold text-foreground">
                    {row.reply.authorInitials}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[15px] leading-[22px] font-bold">
                      {row.reply.authorName}
                    </span>
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[12px] leading-[14px] font-medium",
                        badge.className
                      )}
                    >
                      {reviewsCopy.instructor}
                    </span>
                  </div>
                  <p className="text-[15px] leading-5 text-muted-foreground">
                    {row.reply.body}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}

export { ReviewCard }
