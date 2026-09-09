"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  CATEGORY_ACCENTS,
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  categoryAccent,
  categoryAccentClasses,
  categoryAccentLabels,
  categoryDialogCopy,
  type CategoryAccent,
} from "@/lib/config/admin-categories"
import type { CategoryInput } from "@/lib/actions/admin-categories"
import { cn } from "@/lib/utils"

/**
 * "New category", from
 * `ui-design/light/dashboard/admin/new-category__dialog_admin.png` — and
 * "Edit category", which has no export of its own and is the same four fields
 * with a different title and submit. One component rather than two, so the two
 * forms cannot drift.
 *
 * Measured off that export at DPR 2: a **478px** dialog on 30px padding, a
 * 20px/700 title over a 15px lead, 44px text fields on `--background` with a
 * 15px value, six 34px swatches on a 9px gap, a 67px bordered navigation row,
 * and a 44px submit.
 *
 * Three readings of the export worth keeping:
 *
 *  - **The fields are filled with `--background`, not left transparent.** They
 *    sit on a white dialog, so the page colour is what separates the two. The
 *    `dark:` twin is spelled out for the reason `settings-controls.ts` gives:
 *    `Input`/`Textarea` carry `dark:bg-input/30`, a `:is(.dark *)`-wrapped
 *    selector a plain `bg-background` loses to on specificity, which would
 *    fill the control *lighter* than its own dialog in dark mode. Repeating
 *    the variant is what lets tailwind-merge drop the generated class — that
 *    is the fix, not `!`. `md:text-[15px]` is the same trap over `md:text-sm`.
 *  - **The selected swatch is a 3px `--foreground` border with a white tick**,
 *    drawn *inside* the 34px box rather than around it — measured, there is no
 *    gap between the ring and the fill. Every swatch carries the border so the
 *    six stay the same size; on the five unselected ones it is transparent,
 *    which shows the fill through it because a background paints under a
 *    border by default.
 *  - **The switch is the notifications page's**, 46 x 26 with a 20px thumb
 *    inset 3px, against the generated 32 x 18.4 — see that form's `SWITCH`
 *    note. Reproducing it here rather than importing it: the two are the same
 *    measurement read off two exports, and a learner settings page is not
 *    something an admin dialog should be coupled to.
 *
 * **The export's "Cancel" is deliberately not reproduced** — see
 * `categoryDialogCopy`.
 *
 * The swatches are native radios inside their labels (`sr-only`, not removed),
 * so arrow-key selection and the group's screen-reader semantics come from the
 * platform — the arrangement the quiz page's option rows and the new-user
 * role cards both use.
 */

/** Everything the dialog needs to know about the row it is editing. */
export type CategoryDialogValues = {
  name: string
  description: string
  accentColor: string
  showInNav: boolean
}

const BLANK: CategoryDialogValues = {
  name: "",
  description: "",
  accentColor: "blue",
  showInNav: true,
}

const FIELD = cn(
  "bg-background text-[15px] md:text-[15px] dark:bg-background",
  "placeholder:text-muted-foreground"
)

const LABEL = "text-[15px] font-semibold"

const SWITCH = cn(
  "border-0 p-[3px] data-[size=default]:h-6.5 data-[size=default]:w-11.5",
  "data-unchecked:bg-track dark:data-unchecked:bg-track",
  "[&_[data-slot=switch-thumb]]:size-5",
  "[&_[data-slot=switch-thumb]]:data-checked:translate-x-full"
)

function CategoryDialog({
  open,
  onOpenChange,
  mode,
  targetId,
  values,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  /** Which row is being edited. Only its identity matters here — see below. */
  targetId?: string
  /** The row's current values when editing; null opens a blank form. */
  values: CategoryDialogValues | null
  pending: boolean
  onSubmit: (input: CategoryInput) => void
}) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [accent, setAccent] = React.useState<CategoryAccent>("blue")
  const [showInNav, setShowInNav] = React.useState(true)

  // The form is seeded by **adjusting state during render** rather than in an
  // effect — React's own pattern for "a prop changed, reset some state", and
  // the one `audit-log-browser.tsx` uses for the same reason. Keying the whole
  // component on the row would work and would throw focus away on every
  // parent re-render mid-typing.
  //
  // The trigger is `formKey`, a **string**, not the `values` object: the
  // parent rebuilds that object on every render, so comparing identities would
  // re-seed the fields on each keystroke and spin the render loop. `formKey`
  // changes exactly when a different row is opened, or when the dialog opens
  // at all.
  const formKey = open
    ? mode === "edit"
      ? `edit:${targetId}`
      : "create"
    : null
  const [seededKey, setSeededKey] = React.useState<string | null>(null)
  if (formKey !== seededKey) {
    setSeededKey(formKey)
    if (formKey) {
      const seed = values ?? BLANK
      setName(seed.name)
      setDescription(seed.description)
      setAccent(categoryAccent(seed.accentColor))
      setShowInNav(seed.showInNav)
    }
  }

  const copy = categoryDialogCopy
  const trimmed = name.trim()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (trimmed.length === 0 || pending) return
    onSubmit({ name: trimmed, description, accentColor: accent, showInNav })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* `sm:max-w-[478px]` repeats the variant on purpose: `DialogContent`
          carries `sm:max-w-sm` (384px), which a plain `max-w-*` loses to above
          the breakpoint whatever order Tailwind emits — the same fix the
          Request-changes dialog documents. */}
      <DialogContent className="w-[478px] gap-0 p-7.5 sm:max-w-[478px]">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-bold">
            {mode === "create" ? copy.createTitle : copy.editTitle}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-6">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="mt-4 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="category-name" className={LABEL}>
              {copy.nameLabel}
            </label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={CATEGORY_NAME_MAX_LENGTH}
              placeholder={copy.namePlaceholder}
              autoComplete="off"
              className={cn(FIELD, "h-11 px-3.5")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="category-description" className={LABEL}>
              {copy.descriptionLabel}
            </label>
            <Textarea
              id="category-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={CATEGORY_DESCRIPTION_MAX_LENGTH}
              placeholder={copy.descriptionPlaceholder}
              // `field-sizing-content` on the generated component would grow
              // the box as you type and walk everything below it down the
              // dialog, so the height is pinned to the export's 58px.
              className={cn(
                FIELD,
                "field-sizing-fixed h-[100px] min-h-[100px] px-3.5 py-2.5"
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className={LABEL}>{copy.accentLabel}</p>
            <div
              role="radiogroup"
              aria-label={copy.accentLabel}
              className="flex flex-wrap gap-[9px]"
            >
              {CATEGORY_ACCENTS.map((value) => {
                const selected = value === accent
                return (
                  <label
                    key={value}
                    className={cn(
                      "size-[34px] cursor-pointer rounded-lg border-[3px] transition-colors",
                      "grid place-items-center",
                      "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                      categoryAccentClasses[value].swatch,
                      selected ? "border-foreground" : "border-transparent"
                    )}
                  >
                    <input
                      type="radio"
                      name="category-accent"
                      value={value}
                      checked={selected}
                      onChange={() => setAccent(value)}
                      className="sr-only"
                    />
                    <span className="sr-only">
                      {categoryAccentLabels[value]}
                    </span>
                    {selected ? (
                      <CheckIcon
                        aria-hidden
                        className="size-4 text-white"
                        strokeWidth={2.75}
                      />
                    ) : null}
                  </label>
                )
              })}
            </div>
          </div>

          {/* 67px on the export, which `py-3.5` over a 20px title line and an
              18px description line lands on. A plain `div` rather than a
              `Card`: `Card`'s hairline is a `ring`, which paints outside the
              layout box and would push this past the drawn height — the trap
              the wishlist rows and the notification toggles both record. */}
          <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5">
            <div>
              {/* A `label htmlFor` rather than a `label` wrapping the switch:
                  Base UI's `Switch` renders a `button`, and a label does not
                  forward a click to a nested button the way it does to a
                  nested input — the association has to be explicit. Same
                  arrangement `notifications-form.tsx`'s toggle rows use. */}
              <Label
                htmlFor="category-show-in-nav"
                className="cursor-pointer text-[15px] leading-5 font-semibold"
              >
                {copy.navTitle}
              </Label>
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                {copy.navDescription}
              </p>
            </div>
            <Switch
              id="category-show-in-nav"
              checked={showInNav}
              onCheckedChange={setShowInNav}
              className={SWITCH}
            />
          </div>

          <div className="mt-1">
            <Button
              type="submit"
              loading={pending}
              disabled={trimmed.length === 0}
              className="h-11 px-5"
            >
              {mode === "create" ? copy.createSubmit : copy.editSubmit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { CategoryDialog }
