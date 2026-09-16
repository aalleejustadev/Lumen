"use client"

import { LayoutGridIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/**
 * The **"All courses" filter**, shared by every instructor surface that lists
 * rows belonging to one course — Students, Coupons and Q&A today.
 *
 * It is one component rather than three copies for the reason `count-card.tsx`
 * and `sidebar-nav.tsx` are: the three pages had the same twenty lines of
 * `Select` three times over, down to the same two comments, and the only real
 * differences were a control height and a copy key. A change to how this
 * behaves has to land on all three at once, which is what a shared component
 * makes unavoidable and three copies make a matter of memory.
 *
 * Three things about it are decisions rather than markup:
 *
 *  - **It drops *below* the trigger** (`alignItemWithTrigger={false}`,
 *    `align="start"`), not over it. Base UI's default aligns the selected item
 *    on top of the trigger, which is right for a short fixed enum and wrong
 *    here: the list is data, so with six courses the popup covered the trigger
 *    *and* the search field beside it, and it jumped to a different place
 *    depending on which course was selected. Opting out also restores the
 *    slide-in, which the popup's own `data-[align-trigger=true]:animate-none`
 *    suppresses. `browse-courses.tsx` made the same call for its own filters.
 *  - **The popup is free to be wider than the trigger.** Course titles are
 *    long and the trigger's width is a filter-row budget, not a measurement of
 *    the data — the export could only ever draw the placeholder, so its width
 *    settles nothing about real titles. The popup takes the trigger's width as
 *    a floor and grows to its content; see the note on `SelectContent`, which
 *    is where that was actually wrong.
 *  - **The trigger truncates and the popup does not.** A selected long title
 *    ellipses in the trigger rather than stretching the filter row, but the
 *    menu you pick from shows the whole thing, because that is the only place
 *    the choice is actually made. The truncation is a span and a `min-w-0`
 *    rather than the `line-clamp-1` `SelectTrigger` already applies: that
 *    class is dead here, because the same rule sets the value to `display:
 *    flex` and `-webkit-line-clamp` needs `-webkit-box`.
 *
 * The **id is never printed**: `SelectValue` takes the render-function form,
 * without which the trigger shows a raw cuid. `CLAUDE.md` records the four
 * places that shipped wrong before anyone noticed.
 */
function CourseFilter({
  courses,
  value,
  onValueChange,
  label,
  className,
}: {
  courses: readonly { id: string; title: string }[]
  /** The course id, or null for "all". */
  value: string | null
  onValueChange: (courseId: string | null) => void
  /** "All courses" — the placeholder, the accessible name and the reset item,
   *  which are one string on purpose. */
  label: string
  /** The caller's own control height, since the three filter rows are
   *  measured off three exports (42px here, 44px on Q&A). */
  className?: string
}) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(next: string | null) =>
        onValueChange(!next || next === ALL ? null : next)
      }
    >
      {/* `data-[size=default]:h-*` has to be repeated by the caller for the
          reason every other trigger in the app records: `SelectTrigger`'s own
          `data-[size=default]:h-8` is an attribute selector that a plain
          height loses to on specificity. */}
      <SelectTrigger
        aria-label={label}
        className={cn(
          "gap-2 rounded-lg bg-card shadow-sm",
          // `SelectValue` is a flex box (the trigger says so), which makes the
          // `line-clamp-1` it is also given do nothing — so a long title
          // overflowed the trigger rather than ellipsing. `min-w-0` is what
          // lets the truncating span below actually shrink.
          "**:data-[slot=select-value]:min-w-0",
          className
        )}
      >
        <LayoutGridIcon className="size-4 shrink-0 text-muted-foreground" />
        <SelectValue>
          {(current: string) => (
            <span className="truncate">
              {courses.find((course) => course.id === current)?.title ?? label}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        <SelectItem value={ALL}>{label}</SelectItem>
        {courses.map((course) => (
          <SelectItem key={course.id} value={course.id}>
            {course.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** The sentinel for "no course filter". It is a value rather than `null`
 *  because a `Select` needs something to hold, and it never reaches the URL —
 *  each page's `push` turns it back into a deleted parameter. */
const ALL = "all"

export { CourseFilter }
