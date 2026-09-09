"use client"

import { EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { adminCategoriesCopy } from "@/lib/config/admin-categories"

/**
 * The `⋯` at the end of each row. The export draws the button — a 34px
 * bordered white box with three `--subtle-foreground` dots — but not the menu
 * open, so its two items are ours.
 *
 * **Delete is drawn disabled, with the reason beside it, rather than dropped**
 * when the category cannot go: the same treatment `user-row-actions.tsx` gives
 * "View profile" for a learner with no public page, and for the same reason —
 * a menu that changes shape row to row for no visible cause is worse than one
 * that says why. There are two such causes and both are real constraints
 * rather than house rules:
 *
 *  - courses are filed under it, and `Course.category` is a required relation
 *    with no `onDelete`, which Postgres enforces as RESTRICT;
 *  - sub-categories roll up into it, which `onDelete: SetNull` would silently
 *    promote to the top level — quietly adding rows to this very page.
 *
 * `deleteCategory` re-checks both server-side and in this order, so the toast
 * and the disabled reason are the same sentence. Hiding the item is not the
 * guard.
 *
 * Unlike the users table's borderless trigger this one carries the export's
 * hairline and no shadow — measured, the box is a 1px `--border` on `--card`
 * with nothing under it.
 */
function CategoryRowActions({
  name,
  courseCount,
  childCount,
  pending,
  onEdit,
  onDelete,
}: {
  name: string
  courseCount: number
  childCount: number
  pending: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const blockedReason =
    childCount > 0
      ? adminCategoriesCopy.deleteBlockedByChildren(childCount)
      : courseCount > 0
        ? adminCategoriesCopy.deleteBlockedByCourses(courseCount)
        : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${name}`}
        className="grid size-[34px] shrink-0 cursor-pointer place-items-center rounded-lg border border-border bg-card text-subtle-foreground transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:bg-hover aria-expanded:text-foreground"
      >
        <EllipsisIcon className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          disabled={pending}
          onClick={onEdit}
          className="cursor-pointer p-2"
        >
          <PencilIcon />
          {adminCategoriesCopy.edit}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {blockedReason ? (
          <DropdownMenuItem disabled title={blockedReason} className="p-2">
            <Trash2Icon />
            {adminCategoriesCopy.delete}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={pending}
            onClick={onDelete}
            className="cursor-pointer p-2 text-destructive [&_svg]:text-destructive"
          >
            <Trash2Icon />
            {adminCategoriesCopy.delete}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { CategoryRowActions }
