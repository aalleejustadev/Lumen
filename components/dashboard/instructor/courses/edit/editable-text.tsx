"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A borderless input that reads as text until you touch it — how a section or
 * lesson is renamed, and how a lesson's length is set.
 *
 * **Both exports draw these as plain text**, with no field, no pencil and no
 * dialog, and they draw no other way to name a lesson either. A curriculum
 * builder whose rows cannot be named is not a builder, so the resolution is
 * the one that keeps the drawing: the value *is* an input, styled to disappear
 * until it is hovered or focused. Nothing is added to the layout — the ring
 * lands on hover and focus only — so the row measures the same as the export
 * at rest.
 *
 * **It commits on blur and on Enter, and reverts on Escape.** Saving per
 * keystroke would be a write per character, the race
 * `platform-controls-form.tsx` records about its own text fields; and a value
 * that only committed on Enter would silently lose an edit the moment somebody
 * clicked away, which is the commoner gesture.
 *
 * It reports **only real changes** (`value !== committed`), so tabbing across a
 * row writes nothing, and it puts the previous value back when the action
 * refuses — a field must never advertise a state the database is not in, which
 * is the same rule that page's own note states.
 */
function EditableText({
  value,
  onCommit,
  placeholder,
  ariaLabel,
  className,
  inputMode,
  disabled,
}: {
  value: string
  /** Returns false to reject the edit, which puts the old value back. */
  onCommit: (next: string) => Promise<boolean> | boolean
  placeholder?: string
  ariaLabel: string
  className?: string
  inputMode?: "text" | "numeric"
  disabled?: boolean
}) {
  const [draft, setDraft] = React.useState(value)
  // Re-seed when the row underneath changes identity — React's own "a prop
  // changed, reset some state" pattern, adjusted during render rather than in
  // an effect, which is what the hooks lint rule accepts. Keyed on the string
  // so a re-render that did not change the value cannot clobber typing.
  const [committed, setCommitted] = React.useState(value)
  if (value !== committed) {
    setCommitted(value)
    setDraft(value)
  }

  async function commit() {
    const next = draft.trim()
    if (next === committed) {
      setDraft(committed)
      return
    }
    const ok = await onCommit(next)
    if (ok) setCommitted(next)
    else setDraft(committed)
  }

  return (
    <input
      value={draft}
      disabled={disabled}
      aria-label={ariaLabel}
      placeholder={placeholder}
      inputMode={inputMode}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === "Escape") {
          setDraft(committed)
          event.currentTarget.blur()
        }
      }}
      className={cn(
        "w-full min-w-0 truncate rounded-md bg-transparent px-1.5 py-1 outline-none",
        "ring-1 ring-transparent transition-[background-color,box-shadow]",
        "hover:ring-border focus:bg-card focus:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "placeholder:text-subtle-foreground",
        className
      )}
    />
  )
}

export { EditableText }
