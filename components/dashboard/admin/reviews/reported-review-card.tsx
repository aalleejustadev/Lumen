"use client"

import { BadgeCheckIcon, MailIcon, Trash2Icon, XIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { adminReviewsCopy, reportReasonBadge } from "@/lib/config/admin-reviews"
import { initialsOf } from "@/lib/user"
import { cn } from "@/lib/utils"

/** One card's worth of the queue, with its "4 hours ago" already written. */
export type ReportedReviewCardRow = {
  id: string
  reason: Parameters<typeof reportReasonBadge>[0]
  reportedLabel: string
  reportedTitle: string
  body: string
  courseTitle: string
  authorName: string
  authorEmail: string
  authorImage: string | null
  authorSuspended: boolean
}

/** Which button on this card is mid-flight, so only that one spins. */
export type CardAction = "remove" | "keep" | "hide" | "suspend"

/**
 * One card from `ui-design/light/dashboard/admin/reported-reviews__admin.png`:
 * a header line, the review in a quote block, and the row of decisions.
 *
 * Measured off that export at DPR 2: a 160px card on 18px vertical / 20px
 * horizontal padding, a 34px avatar 12px from a 15px/600 name, then the muted
 * "on <course>" and the reason pill on the same 12px rhythm, with the
 * timestamp pushed to the trailing edge. The quote is a 2px `--border` rule
 * 14px from 16px muted body copy on a 24px line. Decisions are 36px in the
 * export and are built at **40px** — the app's control baseline, which
 * `CLAUDE.md` says beats the literal measurement, and which `courses-list.tsx`
 * already applied to that export's 38px buttons. The avatar rounds the other
 * way, to the console's own `size-9`, so the two admin surfaces that draw a
 * face draw the same one.
 *
 * Four readings of the export are worth recording, because none of them is
 * settled by the picture:
 *
 *  - **The name is the reviewer's real one.** The export writes "Anonymous
 *    learner" on all three cards while giving each a *different* face, so it
 *    is a placeholder in a name slot, not a policy — an anonymised queue would
 *    have dropped the avatar too, and both trailing actions ("Suspend
 *    reviewer", "Message author") act on a specific person. The standing rule
 *    across this console is that real rows beat the export's mock strings.
 *  - **The quote block is the review body**, not the reporter's note. It is
 *    the thing "Remove review" removes, and the reason pill already carries
 *    *why* it was flagged. Leaving the reporter's sentence out is also the
 *    page's own stated principle: the lead says reviews are never removed for
 *    being critical, and leading with the complainant's framing is how that
 *    goes wrong. `ContentReport.note` is still stored for an appeal screen.
 *  - **The card padding is 18px vertical against 20px horizontal**, measured,
 *    which `Card` cannot express through `--card-spacing` alone — that one
 *    variable drives the block padding *and* the row gap, and the gaps here
 *    are 12px and 16px. So the variable is zeroed and an inner box carries the
 *    padding, the arrangement `course-review-page.tsx` uses.
 *  - **Suspend is drawn as text, not a filled destructive button** — the same
 *    weight the course view gives Reject. It goes inert once the account is
 *    already suspended, with the reason on the control, which is the treatment
 *    `user-row-actions.tsx` gives a learner's "View profile".
 */
function ReportedReviewCard({
  row,
  busy,
  disabled,
  onAct,
}: {
  row: ReportedReviewCardRow
  busy: CardAction | null
  disabled: boolean
  onAct: (action: CardAction) => void
}) {
  const badge = reportReasonBadge(row.reason)

  return (
    <Card className="ring-border [--card-spacing:0px]">
      <div className="px-5 py-4.5">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 shrink-0">
            <AvatarImage
              src={row.authorImage ?? undefined}
              alt=""
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="bg-hover text-[11px] font-semibold text-foreground">
              {initialsOf(row.authorName, row.authorEmail)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-[15px] font-semibold">{row.authorName}</span>
            <span className="min-w-0 truncate text-[15px] text-muted-foreground">
              {adminReviewsCopy.on(row.courseTitle)}
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-medium",
                badge.className
              )}
            >
              {badge.label}
            </span>
          </div>

          <span
            title={row.reportedTitle}
            className="shrink-0 text-[15px] text-subtle-foreground"
          >
            {row.reportedLabel}
          </span>
        </div>

        <p className="mt-3 border-l-2 border-border pl-3.5 text-base leading-6 text-muted-foreground">
          {row.body}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Button
            loading={busy === "remove"}
            disabled={disabled}
            onClick={() => onAct("remove")}
            className="h-10 gap-2 px-4"
          >
            <Trash2Icon className="size-4" />
            {adminReviewsCopy.remove}
          </Button>

          <Button
            variant="outline"
            loading={busy === "keep"}
            disabled={disabled}
            onClick={() => onAct("keep")}
            className="h-10 bg-card px-4 shadow-sm"
          >
            {adminReviewsCopy.keep}
          </Button>

          <Button
            variant="outline"
            loading={busy === "hide"}
            disabled={disabled}
            onClick={() => onAct("hide")}
            className="h-10 gap-2 bg-card px-4 shadow-sm"
          >
            <XIcon className="size-4" />
            {adminReviewsCopy.hide}
          </Button>

          <Button
            variant="outline"
            loading={busy === "suspend"}
            disabled={disabled || row.authorSuspended}
            title={
              row.authorSuspended
                ? adminReviewsCopy.suspendUnavailable
                : undefined
            }
            onClick={() => onAct("suspend")}
            className="h-10 gap-2 bg-card px-4 text-destructive shadow-sm hover:text-destructive [&_svg]:text-destructive"
          >
            <BadgeCheckIcon className="size-4" />
            {adminReviewsCopy.suspend}
          </Button>

          {/* A `mailto:`, for the reason `user-row-actions.tsx` records: the
              `Conversation`/`Message` models exist but no messaging surface
              does, and mail is what "message this person" means until there
              is somewhere else for it to go. */}
          <Button
            variant="outline"
            nativeButton={false}
            className="ml-auto h-10 gap-2 bg-card px-4 text-muted-foreground shadow-sm"
            render={<a href={`mailto:${row.authorEmail}`} />}
          >
            <MailIcon className="size-4" />
            {adminReviewsCopy.message}
          </Button>
        </div>
      </div>
    </Card>
  )
}

export { ReportedReviewCard }
