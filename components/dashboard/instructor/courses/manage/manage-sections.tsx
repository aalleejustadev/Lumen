import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import {
  manageGroups,
  manageRowHref,
  type ManageRow,
  type ManageRowTarget,
} from "@/lib/config/instructor-course-manage"
import type { ManageFacts } from "@/lib/instructor-course-manage"
import { cn } from "@/lib/utils"

/**
 * The left column of `manage-course.png`: three labelled groups of rows.
 *
 * The **Manage** heading is deliberately *not* here — it sits above the grid,
 * in `manage-course-page.tsx`. Measured, the export's right column begins level
 * with this column's first group label rather than with that heading, so
 * keeping the heading inside the left cell would push Course health 30px down
 * the page. It is the call `course-page.tsx` makes in the opposite direction
 * for its own `h1`.
 *
 * Measured at DPR 2: each group is a 13px uppercase `--subtle-foreground`
 * label 10px above a zero-padding card of flush 64px rows divided by
 * `--border-subtle` hairlines, the groups 20px apart. A row is a 36px `--hover`
 * tile 16px in from the card edge, 14px from a 16px/600 title over a 13px muted
 * line, with an optional 22px `--hover` pill and a 16px chevron at the
 * trailing edge on a 12px gap.
 *
 * **A row is a link only when its destination exists**, and renders inert —
 * with no chevron — otherwise. That is `attention-list.tsx`' rule, and three of
 * these eight rows are in it today: Students, Reviews and Analytics are sidebar
 * rows still carrying `built: false`. Each reads that flag **off
 * `instructorNav`** rather than repeating it, so every one lights up on its own
 * the day its route lands — the arrangement the Help Center's "Open
 * Discussions" button records.
 *
 * A row can also be inert on its own account: `manageRowHref` returns
 * `undefined` for **Quizzes** on a course that has none, because a link
 * promising quizzes that opened a page with none is the same dead affordance
 * read from the other end.
 *
 * A Server Component: nothing here has state, and the icons stay off the
 * bundle.
 */
function ManageSections({
  facts,
  course,
  builtRows,
}: {
  facts: ManageFacts
  /** Everything a destination is built from — see `ManageRowTarget`. */
  course: ManageRowTarget
  /** Which row keys have a live destination, resolved in the route. */
  builtRows: Set<string>
}) {
  return (
    <div>
      {manageGroups.map((group) => (
        <section key={group.title} className="mt-5 first:mt-0">
          <h3 className="text-[13px] leading-none font-medium tracking-[0.06em] text-subtle-foreground uppercase">
            {group.title}
          </h3>
          <Card className="mt-2.5 overflow-hidden p-0 ring-border [--card-spacing:0px]">
            {group.rows.map((row, index) => (
              <ManageRowItem
                key={row.key}
                row={row}
                facts={facts}
                href={
                  builtRows.has(row.key)
                    ? manageRowHref[row.key]?.(course)
                    : undefined
                }
                first={index === 0}
              />
            ))}
          </Card>
        </section>
      ))}
    </div>
  )
}

function ManageRowItem({
  row,
  facts,
  href,
  first,
}: {
  row: ManageRow
  facts: ManageFacts
  href?: string
  first: boolean
}) {
  const Icon = row.icon
  const badge = row.badge?.(facts) ?? null

  const body = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-hover">
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold">
          {row.title}
        </span>
        <span className="mt-1 block truncate text-[13px] text-muted-foreground">
          {row.detail(facts)}
        </span>
      </span>
      {badge ? (
        <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-hover px-2.5 text-[13px] text-muted-foreground tabular-nums">
          {badge}
        </span>
      ) : null}
      {/* No chevron on an inert row: the arrow is the promise of a
          destination, and there isn't one. `attention-list.tsx`' rule. */}
      {href ? (
        <ChevronRightIcon className="size-4 shrink-0 text-subtle-foreground" />
      ) : null}
    </>
  )

  const shared = cn(
    "flex h-16 items-center gap-3.5 px-4",
    !first && "border-t border-border-subtle"
  )

  if (!href) {
    return <div className={shared}>{body}</div>
  }

  return (
    <Link
      href={href}
      className={cn(shared, "transition-colors hover:bg-hover/60")}
    >
      {body}
    </Link>
  )
}

export { ManageSections }
