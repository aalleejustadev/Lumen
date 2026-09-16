"use client"

import Link from "next/link"
import { ChevronUpIcon, MessageCircleIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { QA_HREF, qaCopy, qaStatusBadge } from "@/lib/config/qa"
import type { QuestionRow } from "@/lib/qa"
import { cn } from "@/lib/utils"

/**
 * One question, from `ui-design/light/dashboard/instructor/Q&A-page.png`.
 *
 * Measured off that export at DPR 2: a **125px** card on a 12px gap at the
 * shell's full content width, a 45px vote column at the leading edge holding a
 * chevron over a bold count over a 13px "votes", then a 17px/700 title, a 14px
 * muted body, and a meta row of a 28px avatar, the author, the age, a course
 * chip and the lesson label. The trailing edge stacks the status pill over the
 * reply count.
 *
 * Two things decide what it does:
 *
 *  - **The pill reads `answeredByInstructor`, not the reply count.** A
 *    question with six learner replies and no instructor answer is still
 *    awaiting one — that is what the column exists to say, and what the
 *    Unanswered tab filters on.
 *  - **The title is the way in; the vote arrow is the only other control.**
 *    The reply count beside it is deliberately not a second link to the same
 *    place — one affordance per destination, the rule
 *    `discussion-card.tsx` follows.
 */
function QuestionCard({
  row,
  voting,
  onVote,
}: {
  row: QuestionRow
  voting: boolean
  onVote: () => void
}) {
  const status = row.answered ? qaStatusBadge.answered : qaStatusBadge.awaiting

  return (
    <Card className="gap-0 p-5 ring-border">
      <div className="flex gap-4">
        {/* Vote column ------------------------------------------------- */}
        <button
          type="button"
          onClick={onVote}
          aria-pressed={row.voted}
          aria-label={row.voted ? "Remove your vote" : "Vote for this question"}
          className={cn(
            "flex w-[46px] shrink-0 cursor-pointer flex-col items-center gap-0.5 rounded-lg py-1 transition-colors",
            row.voted ? "text-foreground" : "text-muted-foreground",
            "hover:bg-hover"
          )}
        >
          {voting ? (
            <Spinner className="size-4" />
          ) : (
            <ChevronUpIcon
              className={cn("size-4", row.voted && "text-primary")}
            />
          )}
          <span className="text-[17px] leading-none font-bold text-foreground tabular-nums">
            {row.voteCount}
          </span>
          <span className="text-[12px] leading-none">{qaCopy.votes}</span>
        </button>

        {/* Content and the trailing status column share one row from `sm` up,
            which is what the export draws. Below it the status column's pill
            is ~170px of `shrink-0` against a 400px card, which squeezed the
            title to a word a line — so the two stack and the pill sits beside
            the reply count instead of above it. */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] leading-snug font-bold">
              <Link
                href={`${QA_HREF}/${row.id}`}
                className="text-foreground hover:underline"
              >
                {row.title}
              </Link>
            </h2>
            {/* One line is the export's, and one line of a 400px card is a
                few words — so the clamp opens to two below `sm`. */}
            <p className="mt-1.5 line-clamp-2 text-[14px] text-muted-foreground sm:line-clamp-1">
              {row.body}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="flex items-center gap-2">
                <Avatar className="size-7">
                  <AvatarImage src={row.author.image ?? undefined} alt="" />
                  <AvatarFallback className="text-[11px]">
                    {row.author.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[14px] font-semibold text-foreground">
                  {row.author.name}
                </span>
              </span>
              <span className="text-[14px] text-muted-foreground">
                · {row.age}
              </span>
              {/* `inline-block` with the line height doing the centring, not
                  `inline-flex`: a flex box cannot truncate its own text, and a
                  long course title on a phone otherwise wrapped inside a box
                  pinned to 26px and spilled out of it. */}
              <span className="inline-block h-[26px] max-w-full truncate rounded-full bg-hover px-3 text-[13px] leading-[26px] text-muted-foreground">
                {row.courseTitle}
              </span>
              {row.lessonLabel ? (
                <span className="text-[14px] text-muted-foreground">
                  {row.lessonLabel}
                </span>
              ) : null}
            </div>
          </div>

          {/* Status + replies ------------------------------------------ */}
          <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end">
            {/* `whitespace-nowrap` on both: stacked below `sm` they share a
                line, and letting "Answered by instructor" wrap inside a pill
                pinned to 26px spills the text out of it. */}
            <span
              className={cn(
                "inline-flex h-[26px] items-center rounded-full px-3 text-[13px] font-medium whitespace-nowrap",
                status.className
              )}
            >
              {status.label}
            </span>
            <span className="flex items-center gap-2 text-[14px] whitespace-nowrap text-muted-foreground tabular-nums">
              <MessageCircleIcon className="size-4" />
              {qaCopy.replies(row.replyCount)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export { QuestionCard }
