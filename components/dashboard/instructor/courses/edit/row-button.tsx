"use client"

import { cn } from "@/lib/utils"

/**
 * The small square controls at the trailing edge of every section and lesson
 * row — move up, move down, delete.
 *
 * Measured off `create-course-page__curriculum.png` at DPR 2: a **32px**
 * square with the export's own 1px hairline and, measured, no shadow — the
 * same reading `course-row-actions.tsx` made about My Courses' `⋯`.
 *
 * It is a plain `button` rather than a `Button`, for the reason the `⋯`
 * trigger is: none of the generated variants is a bare icon square at this
 * size, and the two that come close bring padding this row has no space for.
 * It carries its own `cursor-pointer` and `disabled:cursor-not-allowed`, the
 * local fix `button.tsx` documents.
 *
 * **A disabled arrow is drawn, not hidden.** The first section cannot move up
 * and the last cannot move down, and the export draws exactly that — greyed
 * chevrons on Section 1's ∧ and Section 3's ∨ — because a control that
 * vanished at the edges would make the row change shape as it moved.
 */
function RowButton({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-card text-muted-foreground ring-1 ring-border transition-colors outline-none",
        "hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card disabled:hover:text-muted-foreground",
        destructive && "hover:text-destructive"
      )}
    >
      {children}
    </button>
  )
}

export { RowButton }
