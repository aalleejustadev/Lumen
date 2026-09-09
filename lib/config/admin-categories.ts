/**
 * Everything `/dashboard/admin/categories` *says*, and nothing it counts — the
 * same split `admin-overview.ts`, `admin-reports.ts`, `admin-audit.ts` and
 * `admin-users.ts` make. `lib/admin/categories.ts` returns rows and figures;
 * this file turns them into the words from
 * `ui-design/light/dashboard/admin/categories-page__admin.png` and
 * `new-category__dialog_admin.png`.
 *
 * It also carries the accent vocabulary and the accent guard, which read like
 * query concerns and belong here for the mechanical reason `admin-users.ts`
 * spells out: the list and the dialog are Client Components and need both, and
 * importing any *value* from `lib/admin/categories.ts` would pull `lib/db` and
 * the Postgres driver into the browser bundle. This module imports nothing but
 * types, so it crosses freely.
 */

export const adminCategoriesCopy = {
  title: "Categories",
  description: "How the catalog is organised, and where demand actually sits.",
  newLabel: "New category",
  /** The export only draws a full list; the empty state is invented. */
  emptyTitle: "No categories yet",
  emptyDescription:
    "Categories are how learners browse the catalog and how instructors file a course. Add the first one to get started.",
  courses: (count: number) =>
    `${count.toLocaleString("en-US")} ${count === 1 ? "course" : "courses"}`,
  students: (count: number) =>
    `${count.toLocaleString("en-US")} ${count === 1 ? "student" : "students"}`,
  /** The `⋯` menu. The export doesn't draw it open, so these are ours. */
  edit: "Edit category",
  delete: "Delete category",
  /**
   * Why Delete is disabled. `Course.category` is a required relation with no
   * `onDelete`, which Postgres enforces as RESTRICT — the seed's own note — so
   * a category with courses filed under it genuinely cannot be removed, and
   * saying which and how many is more use than a failed attempt.
   */
  deleteBlockedByCourses: (count: number) =>
    `${count.toLocaleString("en-US")} ${
      count === 1 ? "course is" : "courses are"
    } still filed under this category`,
  deleteBlockedByChildren: (count: number) =>
    `${count} sub-categor${count === 1 ? "y rolls" : "ies roll"} up into this one`,
} as const

// ---------------------------------------------------------------------------
// Accent colours
// ---------------------------------------------------------------------------

/**
 * The six swatches from the New-category dialog, in the order it draws them.
 *
 * `Category.accentColor` stores the *token* name, not a hex — see the model's
 * own note. A free hex would escape the theme and break dark mode, and these
 * are the six the export offers.
 */
export const CATEGORY_ACCENTS = [
  "blue",
  "violet",
  "cyan",
  "green",
  "amber",
  "red",
] as const

export type CategoryAccent = (typeof CATEGORY_ACCENTS)[number]

/** What a stored value falls back to when it is not one of the six. */
export const FALLBACK_CATEGORY_ACCENT: CategoryAccent = "blue"

export function isCategoryAccent(value: unknown): value is CategoryAccent {
  return (
    typeof value === "string" &&
    (CATEGORY_ACCENTS as readonly string[]).includes(value)
  )
}

export function categoryAccent(value: string): CategoryAccent {
  return isCategoryAccent(value) ? value : FALLBACK_CATEGORY_ACCENT
}

/**
 * The four places a category's colour is drawn: the row's tinted 40px tile and
 * the glyph inside it, the dialog's solid swatch, and the row's progress
 * indicator.
 *
 * Each maps onto an existing theme token rather than the export's literal
 * hexes — the export's own six sit a shade off ours, and a hardcoded hex would
 * not follow dark mode. The tile is `/10` over the card, which is the tint
 * `attentionToneClasses` already uses for exactly this kind of tile.
 *
 * The indicator is reached with a descendant selector because `Progress`
 * composes its own track and indicator and takes no per-slot props — the
 * pattern `reviews-card.tsx` and `progress-statistics-card.tsx` established.
 */
export const categoryAccentClasses: Record<
  CategoryAccent,
  { tile: string; icon: string; swatch: string; bar: string }
> = {
  blue: {
    tile: "bg-accent-2/10",
    icon: "text-accent-2",
    swatch: "bg-accent-2",
    bar: "[&_[data-slot=progress-indicator]]:bg-accent-2",
  },
  violet: {
    tile: "bg-accent-1/10",
    icon: "text-accent-1",
    swatch: "bg-accent-1",
    bar: "[&_[data-slot=progress-indicator]]:bg-accent-1",
  },
  cyan: {
    tile: "bg-accent-3/10",
    icon: "text-accent-3",
    swatch: "bg-accent-3",
    bar: "[&_[data-slot=progress-indicator]]:bg-accent-3",
  },
  green: {
    tile: "bg-success/10",
    icon: "text-success",
    swatch: "bg-success",
    bar: "[&_[data-slot=progress-indicator]]:bg-success",
  },
  amber: {
    // `--star`, not `--warning`: the export's amber sits between the two and
    // `--warning` is the orange the courses page's own note picks out.
    tile: "bg-star/10",
    icon: "text-star",
    swatch: "bg-star",
    bar: "[&_[data-slot=progress-indicator]]:bg-star",
  },
  red: {
    tile: "bg-destructive/10",
    icon: "text-destructive",
    swatch: "bg-destructive",
    bar: "[&_[data-slot=progress-indicator]]:bg-destructive",
  },
}

/** How the dialog names each swatch for a screen reader. */
export const categoryAccentLabels: Record<CategoryAccent, string> = {
  blue: "Blue",
  violet: "Violet",
  cyan: "Cyan",
  green: "Green",
  amber: "Amber",
  red: "Red",
}

// ---------------------------------------------------------------------------
// The New / Edit category dialog
// ---------------------------------------------------------------------------

/** Caps the two free-text fields. Enforced in the action as well as the DOM. */
export const CATEGORY_NAME_MAX_LENGTH = 60
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 160

/**
 * `new-category__dialog_admin.png`. The same dialog does the editing: there is
 * no export for that, and a second form over the same four fields would be one
 * more thing to keep in step — only the title and the submit change.
 *
 * **The export's "Cancel" is deliberately not reproduced.** `DialogContent`
 * already draws a close X in its corner, and a second control whose only job
 * is to dismiss is the redundancy `CLAUDE.md` records as the standing rule for
 * dialogs here — the payout-run dialog had both of its footer buttons removed
 * for it, and the Request-changes dialog dropped the same "Cancel".
 */
export const categoryDialogCopy = {
  createTitle: "New category",
  editTitle: "Edit category",
  description:
    "Categories shape how learners browse the catalog and how instructors classify a course.",
  nameLabel: "Name",
  namePlaceholder: "e.g. Photography",
  descriptionLabel: "Short description",
  descriptionPlaceholder: "What belongs in this category?",
  accentLabel: "Accent colour",
  navTitle: "Show in main navigation",
  navDescription: "Featured categories appear in the browse menu.",
  createSubmit: "Create category",
  editSubmit: "Save changes",
} as const

/**
 * The delete confirmation. No export draws it, and it is not optional: the
 * `⋯` menu's other item opens a form you can back out of, while this one is
 * immediate and cannot be undone.
 */
export const deleteCategoryCopy = {
  title: "Delete category?",
  description: (name: string) =>
    `${name} will be removed from the catalog. Nothing else changes, and this cannot be undone.`,
  submit: "Delete category",
} as const
