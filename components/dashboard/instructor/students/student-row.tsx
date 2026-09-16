"use client"

import { MailIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { formatQuiz } from "@/components/dashboard/instructor/students/students-format"
import {
  studentsCopy,
  studentStatusBadge,
  studentStatusLabel,
} from "@/lib/config/instructor-students"
import type { StudentRow as Row } from "@/lib/instructor-students"
import { cn } from "@/lib/utils"

/**
 * One row of `students-page.png`'s table.
 *
 * Measured off that export at DPR 2: a **69px** row (`h-[69px]`) on
 * `--border-subtle` hairlines with cells inset 20px, a 40px avatar 10px from a
 * 15px/600 name over a 13px muted address, then the course title, the progress
 * group, the quiz fraction and the last-active stack, with a 38px icon button
 * at the trailing edge.
 *
 * The progress group is the one measured thing that is not obvious: a **225px**
 * track, 7px thick, 14px from the percentage beside it, with the lesson
 * counter on a second line beneath — the counter is under the *bar*, not under the whole
 * group, which is what keeps the percentage reading as the bar's own label.
 *
 * **The bar's width is the stored `progressPercent`, and the counter is the
 * lesson ratio, and the two deliberately disagree.** `Enrollment`'s own
 * docstring says so: the export draws 92% beside "23 / 25 lessons" (which is
 * 92%) but also 55% beside "14 / 25" on My Learning, because progress is
 * time-weighted against lesson duration rather than counted. Deriving the bar
 * from the counter would be the wrong half of that trade.
 */
function StudentTableRow({
  row,
  onMessage,
  busy,
}: {
  row: Row
  onMessage: () => void
  /** Only this row's button spins — the per-control rule `courses-list.tsx`
   *  states and `promotions-board.tsx` follows. */
  busy: boolean
}) {
  return (
    <TableRow className="h-[69px] border-border-subtle hover:bg-transparent">
      <TableCell className="px-5">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={row.image ?? undefined} alt="" />
            <AvatarFallback className="text-[13px]">
              {row.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[15px] leading-5 font-semibold">
              {row.name}
            </p>
            <p className="truncate text-[13px] leading-5 text-muted-foreground">
              {row.email}
            </p>
          </div>
        </div>
      </TableCell>

      <TableCell className="px-5 text-[15px] text-muted-foreground">
        <span className="block max-w-[260px] truncate">{row.courseTitle}</span>
      </TableCell>

      <TableCell className="px-5">
        <div className="grid gap-1.5">
          <div className="flex items-center gap-3.5">
            <span
              role="presentation"
              className="h-[7px] w-[225px] shrink-0 overflow-hidden rounded-full bg-track"
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(100, Math.max(0, row.progressPercent))}%`,
                }}
              />
            </span>
            <span className="text-[14px] font-semibold tabular-nums">
              {row.progressPercent}%
            </span>
          </div>
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {studentsCopy.lessons(row.completedLessons, row.totalLessons)}
          </span>
        </div>
      </TableCell>

      <TableCell className="px-5 text-[15px] font-semibold tabular-nums">
        {formatQuiz(row.quiz)}
      </TableCell>

      <TableCell className="px-5">
        <div className="grid gap-1.5">
          <span className="text-[14px] whitespace-nowrap text-muted-foreground">
            {row.lastActive}
          </span>
          <span
            className={cn(
              "inline-flex h-[22px] w-fit items-center rounded-full px-2.5 text-[12px] font-medium",
              studentStatusBadge[row.status]
            )}
          >
            {studentStatusLabel[row.status]}
          </span>
        </div>
      </TableCell>

      <TableCell className="px-5 text-right">
        {/* An icon button, as drawn. Its accessible name carries the student's
            own name, because "Message" repeated down a column tells a screen
            reader which row it is on no better than the icon does. */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          loading={busy}
          onClick={onMessage}
          aria-label={studentsCopy.message(row.name)}
          title={studentsCopy.message(row.name)}
          className="size-[38px] bg-card shadow-sm"
        >
          <MailIcon className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export { StudentTableRow }
