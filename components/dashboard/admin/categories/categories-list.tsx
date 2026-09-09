"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/toast"
import {
  CategoryDialog,
  type CategoryDialogValues,
} from "@/components/dashboard/admin/categories/category-dialog"
import { CategoryRowActions } from "@/components/dashboard/admin/categories/category-row-actions"
import { DeleteCategoryDialog } from "@/components/dashboard/admin/categories/delete-category-dialog"
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryInput,
} from "@/lib/actions/admin-categories"
import {
  adminCategoriesCopy,
  categoryAccent,
  categoryAccentClasses,
} from "@/lib/config/admin-categories"
import { FALLBACK_CATEGORY_ICON } from "@/lib/config/admin-overview"
import type { CategoryRow } from "@/lib/admin/categories"
import { cn } from "@/lib/utils"

/**
 * The whole of `/dashboard/admin/categories` below the page title, from
 * `ui-design/light/dashboard/admin/categories-page__admin.png`: the **New
 * category** button and one card per category.
 *
 * Measured off that export at DPR 2: full content width on the console's usual
 * 32px page inset, 72px rows on a 14px gap and 18px of side padding, a 40px
 * tinted tile 16px from a 16px/700 name, then a fixed right-hand cluster — a
 * courses column, a students column, a 190 x 8 bar, a right-aligned
 * percentage and the 34px `⋯` box. The header button is 40px, which is the
 * app's control baseline; the export draws 41.
 *
 * Four things about it are worth knowing before changing any of it:
 *
 *  - **The two count columns hide below `xl`.** Their widths are measured off
 *    an export drawn on a ~1800px viewport; keeping them at every width would
 *    squeeze the name to nothing on a laptop. The bar, the percentage and the
 *    menu never hide — they are what the page is *for*.
 *  - **The row gap is 14px even though the export measures 13px of visible
 *    background between hairlines.** `Card`'s hairline is a `ring`, which
 *    paints *outside* the layout box, so a 14px gap reads as ~12.5 — the trap
 *    the wishlist rows and the notification toggles both record.
 *  - **The percentage and the bar read the same number**, so they cannot
 *    disagree. What that number *means* is settled in
 *    `lib/admin/categories.ts`, along with the note that the export's own six
 *    reconcile with neither of its own columns.
 *  - **Every category draws the same grid glyph**, which is what the export
 *    draws and what `FALLBACK_CATEGORY_ICON`'s own comment already promised.
 *    Only the colour changes, from `Category.accentColor`.
 *
 * It is one client component because the pending flag belongs to the header
 * button, the rows and both dialogs at once, and because each dialog needs to
 * know which row opened it. The composer above is a Server Component and can
 * hold none of that.
 */
function CategoriesList({ rows }: { rows: CategoryRow[] }) {
  const [saving, startSaving] = React.useTransition()
  // `null` means the New-category dialog; a row means Edit. One flag rather
  // than two booleans, so the two can never both be open.
  const [editing, setEditing] = React.useState<
    { mode: "create" } | { mode: "edit"; row: CategoryRow } | null
  >(null)
  const [deleting, setDeleting] = React.useState<CategoryRow | null>(null)

  function save(input: CategoryInput) {
    const target = editing
    if (!target) return
    startSaving(async () => {
      const result =
        target.mode === "create"
          ? await createCategory(input)
          : await updateCategory(target.row.id, input)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) setEditing(null)
    })
  }

  function confirmDelete() {
    const row = deleting
    if (!row) return
    startSaving(async () => {
      const result = await deleteCategory(row.id)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      // Closed either way: a refusal is a fact about the category, not
      // something a second press of the same button will change.
      setDeleting(null)
    })
  }

  const Icon = FALLBACK_CATEGORY_ICON

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-none font-bold">
            {adminCategoriesCopy.title}
          </h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {adminCategoriesCopy.description}
          </p>
        </div>

        <Button
          onClick={() => setEditing({ mode: "create" })}
          className="h-10 gap-2 px-4"
        >
          <PlusIcon className="size-4" />
          {adminCategoriesCopy.newLabel}
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="mt-6 items-center gap-3 px-6 py-20 text-center ring-border">
          <p className="text-base font-bold">
            {adminCategoriesCopy.emptyTitle}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {adminCategoriesCopy.emptyDescription}
          </p>
        </Card>
      ) : (
        <div
          className={cn(
            "mt-6 flex flex-col gap-3.5",
            // The rows stay on screen and dim while a write settles, rather
            // than the list blanking under the dialog that started it.
            saving && "pointer-events-none opacity-60 transition-opacity"
          )}
        >
          {rows.map((row) => {
            const accent =
              categoryAccentClasses[categoryAccent(row.accentColor)]

            return (
              <Card
                key={row.id}
                className="h-18 flex-row items-center gap-4 px-4.5 ring-border"
              >
                <div
                  aria-hidden
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-lg",
                    accent.tile
                  )}
                >
                  <Icon className={cn("size-4", accent.icon)} />
                </div>

                <h2 className="min-w-0 flex-1 truncate text-base font-bold">
                  {row.name}
                </h2>

                <p className="hidden w-[110px] shrink-0 text-[15px] text-muted-foreground xl:block">
                  {adminCategoriesCopy.courses(row.courseCount)}
                </p>
                <p className="hidden w-[130px] shrink-0 text-[15px] text-muted-foreground xl:block">
                  {adminCategoriesCopy.students(row.studentCount)}
                </p>

                <Progress
                  value={row.share}
                  aria-label={`${row.name} share of enrolments`}
                  className={cn(
                    "w-[190px] shrink-0",
                    "[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-track",
                    accent.bar
                  )}
                />
                <span className="w-[42px] shrink-0 text-right text-[15px] font-semibold tabular-nums">
                  {row.share}%
                </span>

                <CategoryRowActions
                  name={row.name}
                  courseCount={row.courseCount}
                  childCount={row.childCount}
                  pending={saving}
                  onEdit={() => setEditing({ mode: "edit", row })}
                  onDelete={() => setDeleting(row)}
                />
              </Card>
            )
          })}
        </div>
      )}

      <CategoryDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        mode={editing?.mode ?? "create"}
        targetId={editing?.mode === "edit" ? editing.row.id : undefined}
        values={editing?.mode === "edit" ? toDialogValues(editing.row) : null}
        pending={saving}
        onSubmit={save}
      />

      <DeleteCategoryDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        name={deleting?.name ?? ""}
        pending={saving}
        onConfirm={confirmDelete}
      />
    </>
  )
}

/** A row as the dialog's four fields. `description` is nullable in the
 *  database and a controlled `<textarea>` cannot take `null`. */
function toDialogValues(row: CategoryRow): CategoryDialogValues {
  return {
    name: row.name,
    description: row.description ?? "",
    accentColor: row.accentColor,
    showInNav: row.showInNav,
  }
}

export { CategoriesList }
