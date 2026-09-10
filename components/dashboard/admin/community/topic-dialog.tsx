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
  categoryAccent,
  categoryAccentClasses,
  categoryAccentLabels,
  type CategoryAccent,
} from "@/lib/config/admin-categories"
import {
  TOPIC_DESCRIPTION_MAX_LENGTH,
  TOPIC_NAME_MAX_LENGTH,
  topicDialogCopy,
  topicVisibilityOptions,
} from "@/lib/config/admin-community"
import type { TopicInput } from "@/lib/actions/admin-community"
import type { TopicVisibility } from "@/lib/generated/prisma/client"
import { cn } from "@/lib/utils"

/**
 * "Create community topic", from
 * `ui-design/light/dashboard/admin/new-topic__admin.png` — and "Edit
 * community topic", which has no export of its own and is the same six
 * controls with a different title and submit. One component rather than two,
 * so the two forms cannot drift.
 *
 * It is deliberately `category-dialog.tsx`'s vocabulary: the two exports draw
 * the same 44px fields on `--background`, the same six 34px accent swatches
 * and the same 46 x 26 switch, so the classes are the ones that file already
 * measured, and **the accent palette is imported rather than re-declared** —
 * a colour must not mean two things in one console, the reading
 * `auditRoleBadge` settled by delegating to `userRoleBadge`.
 *
 * Two things this export adds over that one:
 *
 *  - **"Who can see it" is three radio *cards*, not swatches** — a title over
 *    a description, with the selected one carrying a 2px `--foreground` ring
 *    and the `--background` fill the unselected ones use as their whole
 *    surface. Native radios inside their labels (`sr-only`, not removed), so
 *    arrow-key selection and the group's screen-reader semantics come from
 *    the platform — the arrangement the quiz options and the new-user role
 *    cards both use.
 *  - **Two switch rows rather than one**, which are the two booleans on
 *    `CommunityTopic` that its own notes tie to this dialog:
 *    `learnersCanStartThreads` (what draws the row's **Staff post only**
 *    pill) and `requiresModeratorApproval` (the source of
 *    `DiscussionStatus.PENDING_APPROVAL`).
 *
 * **The export's "Cancel" is deliberately not reproduced**, per the standing
 * rule `CLAUDE.md` records: `DialogContent` already draws a close X, so a
 * second control whose only job is to dismiss is redundant. The dialog is
 * tall enough to scroll, so the content scrolls inside a fixed height rather
 * than the page growing behind the overlay.
 */

export type TopicDialogValues = {
  name: string
  description: string
  accentColor: string
  visibility: TopicVisibility
  learnersCanStartThreads: boolean
  requiresModeratorApproval: boolean
}

const BLANK: TopicDialogValues = {
  name: "",
  description: "",
  accentColor: "blue",
  visibility: "EVERYONE",
  learnersCanStartThreads: true,
  requiresModeratorApproval: false,
}

const FIELD = cn(
  "bg-background text-[15px] md:text-[15px] dark:bg-background",
  "placeholder:text-muted-foreground"
)

const LABEL = "text-[15px] font-semibold"

/** `notifications-form.tsx`' 46 x 26 switch — see `category-dialog.tsx`. */
const SWITCH = cn(
  "border-0 p-[3px] data-[size=default]:h-6.5 data-[size=default]:w-11.5",
  "data-unchecked:bg-track dark:data-unchecked:bg-track",
  "[&_[data-slot=switch-thumb]]:size-5",
  "[&_[data-slot=switch-thumb]]:data-checked:translate-x-full"
)

function TopicDialog({
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
  targetId?: string
  values: TopicDialogValues | null
  pending: boolean
  onSubmit: (input: TopicInput) => void
}) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [accent, setAccent] = React.useState<CategoryAccent>("blue")
  const [visibility, setVisibility] =
    React.useState<TopicVisibility>("EVERYONE")
  const [canStart, setCanStart] = React.useState(true)
  const [needsApproval, setNeedsApproval] = React.useState(false)

  // Seeded by **adjusting state during render**, keyed on a *string* — see
  // `category-dialog.tsx`, which records why the key cannot be the `values`
  // object (the parent rebuilds it every render, which would re-seed on every
  // keystroke and spin the render loop).
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
      setVisibility(seed.visibility)
      setCanStart(seed.learnersCanStartThreads)
      setNeedsApproval(seed.requiresModeratorApproval)
    }
  }

  const copy = topicDialogCopy
  const trimmed = name.trim()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (trimmed.length === 0 || pending) return
    onSubmit({
      name: trimmed,
      description,
      accentColor: accent,
      visibility,
      learnersCanStartThreads: canStart,
      requiresModeratorApproval: needsApproval,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* `sm:max-w-[520px]` repeats the variant on purpose: `DialogContent`
          carries `sm:max-w-sm` (384px), which a plain `max-w-*` loses to
          above the breakpoint whatever order Tailwind emits. */}
      <DialogContent className="flex max-h-[88vh] w-[520px] flex-col gap-0 p-0 sm:max-w-[520px]">
        <DialogHeader className="gap-2 px-7.5 pt-7.5">
          <DialogTitle className="text-xl font-bold">
            {mode === "create" ? copy.createTitle : copy.editTitle}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-6">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-7.5 pt-4 pb-7.5"
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="topic-name" className={LABEL}>
                {copy.nameLabel}
              </label>
              <Input
                id="topic-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={TOPIC_NAME_MAX_LENGTH}
                placeholder={copy.namePlaceholder}
                autoComplete="off"
                className={cn(FIELD, "h-11 px-3.5")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="topic-description" className={LABEL}>
                {copy.descriptionLabel}
              </label>
              <Textarea
                id="topic-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={TOPIC_DESCRIPTION_MAX_LENGTH}
                placeholder={copy.descriptionPlaceholder}
                // `field-sizing-content` on the generated component would grow
                // the box as you type and walk everything below it down the
                // dialog, so the height is pinned to the export's.
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
                        "grid size-[34px] cursor-pointer place-items-center rounded-lg border-[3px] transition-colors",
                        "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                        categoryAccentClasses[value].swatch,
                        selected ? "border-foreground" : "border-transparent"
                      )}
                    >
                      <input
                        type="radio"
                        name="topic-accent"
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

            <div className="flex flex-col gap-2">
              <p className={LABEL}>{copy.visibilityLabel}</p>
              <div
                role="radiogroup"
                aria-label={copy.visibilityLabel}
                className="flex flex-col gap-2.5"
              >
                {topicVisibilityOptions.map((option) => {
                  const selected = option.value === visibility
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3.5 rounded-xl border-2 bg-background px-4 py-3.5 transition-colors",
                        "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                        selected ? "border-foreground" : "border-transparent"
                      )}
                    >
                      <input
                        type="radio"
                        name="topic-visibility"
                        value={option.value}
                        checked={selected}
                        onChange={() => setVisibility(option.value)}
                        className="sr-only"
                      />
                      {/* The radio is drawn rather than native, so the ring
                          and dot follow `--foreground` in both themes — the
                          inverted treatment `notifications-form.tsx` uses. */}
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-[18px] shrink-0 place-items-center rounded-full border-2",
                          selected ? "border-foreground" : "border-border"
                        )}
                      >
                        {selected ? (
                          <span className="size-2 rounded-full bg-foreground" />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] leading-5 font-semibold">
                          {option.label}
                        </span>
                        <span className="block text-[13px] leading-[18px] text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* A plain `div` rather than a `Card`: `Card`'s hairline is a
                `ring`, which paints outside the layout box and would push
                these past the drawn height — the trap the wishlist rows and
                the notification toggles both record. */}
            {[
              {
                id: "topic-learners-can-start",
                title: copy.threadsTitle,
                description: copy.threadsDescription,
                checked: canStart,
                onChange: setCanStart,
              },
              {
                id: "topic-requires-approval",
                title: copy.approvalTitle,
                description: copy.approvalDescription,
                checked: needsApproval,
                onChange: setNeedsApproval,
              },
            ].map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5"
              >
                <div>
                  {/* `label htmlFor` rather than a wrapping label: Base UI's
                      `Switch` renders a `button`, and a label does not
                      forward a click to a nested button. */}
                  <Label
                    htmlFor={row.id}
                    className="cursor-pointer text-[15px] leading-5 font-semibold"
                  >
                    {row.title}
                  </Label>
                  <p className="text-[13px] leading-[18px] text-muted-foreground">
                    {row.description}
                  </p>
                </div>
                <Switch
                  id={row.id}
                  checked={row.checked}
                  onCheckedChange={row.onChange}
                  className={SWITCH}
                />
              </div>
            ))}
          </div>

          <div className="mt-6">
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

export { TopicDialog }
