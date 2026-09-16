"use client"

import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  EDITOR_CARD,
  EDITOR_FIELD as FIELD,
  EDITOR_HEADING,
} from "@/components/dashboard/instructor/courses/edit/editor-controls"
import { intendedLearnersCopy } from "@/lib/config/course-editor"
import { cn } from "@/lib/utils"

/**
 * The Intended learners step, from `create-course-page.png`.
 *
 * Measured off that export at DPR 2: a card on **28px** padding, a 20px/700
 * heading over a 15px lead, then a 16px/700 label with a 13px muted help line,
 * and **44px** fields filled with `--background` on a 10px gap — the page
 * colour separating a control from the white card it sits on, the trick
 * `settings-controls.ts` records. The audience box is a 77px `textarea`, and
 * the submit is the app's 40px control baseline over the export's 41.
 *
 * **The list grows by itself.** The export draws two filled outcome rows and
 * an empty "Add another outcome" below them, which is the whole interaction:
 * there is one blank row at the end at all times, and typing in it adds
 * another. No "＋ Add" button is drawn and none is added — the blank row *is*
 * the affordance, and `saveIntendedLearners` drops whatever is still blank, so
 * submitting with an untouched row is the ordinary case rather than an error.
 *
 * Each filled row carries a remove button. The export draws none, but a list
 * that can only grow is the gap the profile page's URL rows already document,
 * and this one is worse: an outcome typed by mistake would otherwise reach the
 * course landing page permanently.
 *
 * **It is controlled from `course-editor-page.tsx`**, not from here, because
 * the header's *Save draft* writes the same values as the card's own *Save
 * changes* — two buttons over one form, which is what the export draws. One
 * owner means they cannot disagree about what is pending or what is unsaved.
 */
function IntendedLearnersForm({
  values,
  onChange,
  onSubmit,
  pending,
}: {
  values: {
    learningOutcomes: string[]
    requirements: string[]
    intendedAudience: string
  }
  onChange: (next: Partial<typeof values>) => void
  onSubmit: () => void
  pending: boolean
}) {
  return (
    <Card className={EDITOR_CARD}>
      <h2 className={EDITOR_HEADING}>{intendedLearnersCopy.heading}</h2>
      <p className="mt-3 max-w-[560px] text-[15px] leading-6 text-muted-foreground">
        {intendedLearnersCopy.lead}
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <GrowList
          label={intendedLearnersCopy.outcomes.label}
          help={intendedLearnersCopy.outcomes.help}
          placeholder={intendedLearnersCopy.outcomes.placeholder}
          rows={values.learningOutcomes}
          disabled={pending}
          onChange={(learningOutcomes) => onChange({ learningOutcomes })}
        />

        <GrowList
          label={intendedLearnersCopy.requirements.label}
          placeholder={intendedLearnersCopy.requirements.placeholder}
          rows={values.requirements}
          disabled={pending}
          onChange={(requirements) => onChange({ requirements })}
        />

        <div className="mt-7">
          <label
            htmlFor="intended-audience"
            className="block text-[16px] font-bold"
          >
            {intendedLearnersCopy.audience.label}
          </label>
          <textarea
            id="intended-audience"
            value={values.intendedAudience}
            disabled={pending}
            rows={3}
            placeholder={intendedLearnersCopy.audience.placeholder}
            onChange={(event) =>
              onChange({ intendedAudience: event.target.value })
            }
            className={cn(FIELD, "mt-2.5 h-[77px] resize-y py-2.5")}
          />
        </div>

        <Button type="submit" loading={pending} className="mt-7 h-10 px-5">
          {intendedLearnersCopy.save}
        </Button>
      </form>
    </Card>
  )
}

/**
 * A list that always ends in one empty row. Typing in the last row appends
 * another, so the "Add another outcome" box the export draws is never used up.
 */
function GrowList({
  label,
  help,
  placeholder,
  rows,
  disabled,
  onChange,
}: {
  label: string
  help?: string
  placeholder: string
  rows: string[]
  disabled: boolean
  onChange: (rows: string[]) => void
}) {
  // Rendered with a trailing blank rather than stored with one, so what the
  // form holds is exactly what gets written.
  const shown =
    rows.length === 0 || rows[rows.length - 1] !== "" ? [...rows, ""] : rows

  return (
    <div className="mt-7">
      <p className="text-[16px] font-bold">{label}</p>
      {help ? (
        <p className="mt-1 text-[13px] text-muted-foreground">{help}</p>
      ) : null}

      <div className="mt-2.5 flex flex-col gap-2.5">
        {shown.map((row, index) => (
          <div key={index} className="relative">
            <input
              value={row}
              disabled={disabled}
              placeholder={index === shown.length - 1 ? placeholder : undefined}
              aria-label={`${label} ${index + 1}`}
              onChange={(event) => {
                const next = shown.slice()
                next[index] = event.target.value
                onChange(
                  next.filter((value, i) => value !== "" || i < next.length - 1)
                )
              }}
              className={cn(FIELD, "h-11 pr-11")}
            />
            {row !== "" ? (
              <button
                type="button"
                disabled={disabled}
                aria-label={`${intendedLearnersCopy.remove} — ${row}`}
                title={intendedLearnersCopy.remove}
                onClick={() =>
                  onChange(
                    shown
                      .filter((_, i) => i !== index)
                      .filter(
                        (value, i, all) => value !== "" || i < all.length - 1
                      )
                  )
                }
                className="absolute top-1/2 right-3 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-subtle-foreground transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
              >
                <XIcon className="size-4" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export { IntendedLearnersForm }
