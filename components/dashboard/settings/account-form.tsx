"use client"

import * as React from "react"
import { ArrowUpDownIcon, CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import {
  SETTINGS_CONTROL,
  SETTINGS_DESCRIPTION,
  SETTINGS_LABEL,
  SETTINGS_SUBMIT,
} from "@/components/dashboard/settings/settings-controls"
import { updateAccount, type AccountFieldErrors } from "@/lib/actions/account"
import type { Account } from "@/lib/account"
import { languages, type TimeZoneOption } from "@/lib/config/locale"
import { MAX_NAME_LENGTH } from "@/lib/config/settings"
import { cn } from "@/lib/utils"

/**
 * `/dashboard/settings/account`, from
 * `ui-design/light/dashboard/student/settings-account-page.png`. The card,
 * heading and sections nav come from the settings layout; this is the four
 * fields inside it.
 *
 * Geometry is byte-for-byte the profile page's — same 922px card on 30px
 * padding, same 46px controls, same field rhythm — so everything visual comes
 * from `settings-controls.ts` rather than being measured again.
 *
 * Three things the export dictates that are worth naming:
 *
 *  - Language and Time zone carry lucide's **`ArrowUpDown`** (a pair of
 *    arrows), not the `ChevronDown` that `SelectTrigger` draws for itself.
 *    The built-in icon is always the trigger's last child, so it is hidden
 *    with `[&>svg:last-child]:hidden` and redrawn as a child — the same trick
 *    `course-content-card.tsx` uses on `AccordionTrigger`'s chevron.
 *  - The Time zone placeholder really is `(GMT+00:00) London`. It is drawn
 *    *muted*, so it is a placeholder and not a selected value — filler the
 *    designer left in, kept because the brief is to match the export. The
 *    real options get their offset computed (see `lib/config/locale.ts`), so
 *    a picked London reads `(GMT+01:00) London` in summer while this frozen
 *    placeholder does not.
 *  - Date of birth is a `Popover` + `Calendar` rather than an
 *    `<input type="date">`: the export draws a bordered field with a trailing
 *    calendar glyph and no native spin controls, and a native date input
 *    can't be styled to that on every browser.
 *
 * The date crosses every boundary as `yyyy-MM-dd` — see `lib/account.ts` for
 * why — and is only turned into a `Date` for the calendar's own selection,
 * built from the parts so it lands on *local* midnight and can't display as
 * the previous day.
 */

/** `yyyy-MM-dd` → local midnight, with no zone arithmetic on the way. */
function parseDateInput(value: string | null) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function formatDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * The treatment both dropdowns share.
 *
 * `data-[size=default]:h-11.5` rather than relying on `SETTINGS_CONTROL`'s
 * plain `h-11.5`: `SelectTrigger` sizes itself with `data-[size=default]:h-8`,
 * an attribute selector that wins on specificity regardless of source order —
 * the trap `Avatar` and `PaginationLink` already sprang. Repeating the variant
 * is what lets tailwind-merge drop the generated one, so no `!` is needed.
 */
const SELECT_TRIGGER = cn(
  SETTINGS_CONTROL,
  "w-full justify-between gap-2 py-0 pr-3.5 data-[size=default]:h-11.5",
  "[&>svg:last-child]:hidden"
)

function AccountForm({
  account,
  timeZones,
}: {
  account: Account
  timeZones: TimeZoneOption[]
}) {
  const [dateOfBirth, setDateOfBirth] = React.useState<Date | undefined>(() =>
    parseDateInput(account.dateOfBirth)
  )
  const [datePickerOpen, setDatePickerOpen] = React.useState(false)
  const [errors, setErrors] = React.useState<AccountFieldErrors>({})
  const [pending, startTransition] = React.useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setErrors({})

    startTransition(async () => {
      const result = await updateAccount(formData)
      setErrors(result.errors ?? {})
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
    })
  }

  return (
    <form onSubmit={onSubmit}>
      {/* The calendar's selection is component state, so it needs a hidden
          field to reach `FormData` — the visible control is a button. */}
      <input
        type="hidden"
        name="dateOfBirth"
        value={dateOfBirth ? formatDateInput(dateOfBirth) : ""}
      />

      <FieldGroup>
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="name" className={SETTINGS_LABEL}>
            Name
          </FieldLabel>
          <Input
            id="name"
            name="name"
            defaultValue={account.name}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="name"
            required
            aria-invalid={errors.name ? true : undefined}
            className={SETTINGS_CONTROL}
          />
          {errors.name ? (
            <FieldError className={SETTINGS_DESCRIPTION}>
              {errors.name}
            </FieldError>
          ) : (
            <FieldDescription className={SETTINGS_DESCRIPTION}>
              This is the name that will be displayed on your profile and in
              emails.
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={errors.dateOfBirth ? true : undefined}>
          <FieldLabel htmlFor="date-of-birth" className={SETTINGS_LABEL}>
            Date of birth
          </FieldLabel>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger
              render={
                <Button
                  id="date-of-birth"
                  type="button"
                  variant="outline"
                  aria-invalid={errors.dateOfBirth ? true : undefined}
                  className={cn(
                    SETTINGS_CONTROL,
                    // `hover:`/`aria-expanded:` twins so tailwind-merge drops
                    // the `outline` variant's own `hover:bg-muted` and
                    // `aria-expanded:bg-muted` — the field must not change
                    // colour just because the calendar is open.
                    "w-full justify-between gap-2 pr-3.5 font-normal hover:bg-background aria-expanded:bg-background",
                    // The export's unset state is the placeholder grey.
                    !dateOfBirth && "text-muted-foreground"
                  )}
                />
              }
            >
              {dateOfBirth
                ? dateOfBirth.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Pick a date"}
              <CalendarIcon className="text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateOfBirth}
                onSelect={(date) => {
                  setDateOfBirth(date)
                  setDatePickerOpen(false)
                }}
                // A birthday is decades back, so month-by-month paging is
                // the wrong affordance — `dropdown` puts month and year in
                // selects. `endMonth` stops the year list at today.
                captionLayout="dropdown"
                startMonth={new Date(1920, 0)}
                endMonth={new Date()}
                disabled={{ after: new Date() }}
                defaultMonth={dateOfBirth ?? new Date(1995, 0)}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          {errors.dateOfBirth ? (
            <FieldError className={SETTINGS_DESCRIPTION}>
              {errors.dateOfBirth}
            </FieldError>
          ) : (
            <FieldDescription className={SETTINGS_DESCRIPTION}>
              Your date of birth is used to calculate your age.
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={errors.language ? true : undefined}>
          <FieldLabel htmlFor="language" className={SETTINGS_LABEL}>
            Language
          </FieldLabel>
          <Select name="language" defaultValue={account.language ?? undefined}>
            <SelectTrigger
              id="language"
              aria-invalid={errors.language ? true : undefined}
              className={SELECT_TRIGGER}
            >
              <SelectValue placeholder="Select language" />
              <ArrowUpDownIcon className="shrink-0 text-muted-foreground" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {languages.map((language) => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {errors.language ? (
            <FieldError className={SETTINGS_DESCRIPTION}>
              {errors.language}
            </FieldError>
          ) : (
            <FieldDescription className={SETTINGS_DESCRIPTION}>
              This is the language that will be used in the dashboard.
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={errors.timeZone ? true : undefined}>
          <FieldLabel htmlFor="time-zone" className={SETTINGS_LABEL}>
            Time zone
          </FieldLabel>
          <Select name="timeZone" defaultValue={account.timeZone ?? undefined}>
            <SelectTrigger
              id="time-zone"
              aria-invalid={errors.timeZone ? true : undefined}
              className={SELECT_TRIGGER}
            >
              <SelectValue placeholder="(GMT+00:00) London" />
              <ArrowUpDownIcon className="shrink-0 text-muted-foreground" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {timeZones.map((zone) => (
                  <SelectItem key={zone.value} value={zone.value}>
                    {zone.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {errors.timeZone ? (
            <FieldError className={SETTINGS_DESCRIPTION}>
              {errors.timeZone}
            </FieldError>
          ) : (
            <FieldDescription className={SETTINGS_DESCRIPTION}>
              Used for course deadlines and live session times.
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      <Button type="submit" loading={pending} className={SETTINGS_SUBMIT}>
        {pending ? "Saving…" : "Update account"}
      </Button>
    </form>
  )
}

export { AccountForm }
