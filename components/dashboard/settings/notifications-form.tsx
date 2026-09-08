"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { SETTINGS_SUBMIT } from "@/components/dashboard/settings/settings-controls"
import { updateNotifications } from "@/lib/actions/notifications"
import {
  emailNotifications,
  notificationsHeadings,
  notifyAboutOptions,
  type NotifyAboutValue,
} from "@/lib/config/notifications"
import type { NotificationSettings } from "@/lib/notifications"
import { cn } from "@/lib/utils"

/**
 * `/dashboard/settings/notifications`, from
 * `ui-design/light/dashboard/student/settings-notifications-page.png`. The
 * card, heading and sections nav come from the settings layout; this is
 * everything inside the card.
 *
 * Unlike the profile and account forms this page has no text fields, so it
 * borrows only `SETTINGS_SUBMIT` from `settings-controls.ts` — the control
 * vocabulary there is measured for 46px inputs and none of it applies to a
 * radio, a switch or a bordered row.
 *
 * Measured off that export at DPR 2 (the card itself is the same 922px on
 * 30px padding as the other two sections, so nothing about the shell is
 * re-measured):
 *
 *  - the two section headings are **18px/700**. `globals.css` sets every `h2`
 *    to 800, so they carry an explicit `font-bold` to come *down* to 700 —
 *    the dashboard-heading correction `CLAUDE.md` describes, the same way the
 *    layout's own `h1` does it.
 *  - radio rows sit on a **33px pitch** with 15px/400 labels and a 19px
 *    circle. `size-5` rounds that to 20 — a design-tool half-pixel is not
 *    worth an odd size — but the *inside* of the circle is not the generated
 *    one: the export draws a **white** circle with a 1.5px `--primary` ring
 *    and a 9px `--primary` dot, where shadcn fills the whole circle dark and
 *    punches a white dot out of it. See `RADIO_ITEM`.
 *  - toggle rows are 77px, full content width, on a 12px gap, `rounded-xl`
 *    with a plain `--border` hairline (a `border`, not `Card`'s `ring`, so
 *    that 12px reads as 12 — see the note on the wishlist rows). 20px side
 *    padding; the vertical padding is `py-4` rather than matching it because
 *    a CSS line box is taller than the hugged text box Figma measures, and
 *    16px is what lands the row on 77px with the type at the drawn size.
 *  - row titles are 16px/600 over a 13px `--muted-foreground` line, which is
 *    the same pairing `SETTINGS_LABEL`/`SETTINGS_DESCRIPTION` use one step up.
 *  - the switch is **46 x 26** with a 20px thumb inset 3px — visibly larger
 *    than the generated 32 x 18.4. See `SWITCH`.
 *
 * Every control is **controlled**, held in one state object seeded from the
 * server's row. Uncontrolled `defaultValue`/`defaultChecked` looked simpler
 * and was wrong: a Server Action re-renders the route it was called from and
 * streams fresh props back, so `settings` changes identity after a save and
 * Base UI (rightly) warns that an uncontrolled component's default moved
 * under it. Seeding state once and never syncing it back from props is the
 * point — after a save the values we just wrote *are* the truth, and an
 * effect that copied props over state would also stamp on an edit made while
 * the write was in flight.
 *
 * The export also draws a "Use different settings for my mobile devices"
 * checkbox between the last toggle and the button. It is deliberately not
 * built: there is no mobile app and so no mobile settings page for its help
 * text to point at, and the row was dropped per the brief rather than
 * shipped as a control that does nothing.
 */

/**
 * The row card. A plain `div` rather than a `Card`: `Card`'s hairline is a
 * `ring`, which paints outside the layout box and would make the export's
 * 12px gap read as 10.
 */
const TOGGLE_ROW =
  "flex items-center justify-between gap-4 rounded-xl border px-5 py-4"

/**
 * The export's radio is the inverse of the generated one — a white face with
 * a `--primary` ring and a `--primary` dot, not a `--primary` face with a
 * white dot.
 *
 * Every override repeats the variant of the class it has to replace
 * (`data-checked:`, `dark:data-checked:`) so `cn()`'s tailwind-merge can drop
 * the generated one; that is the fix, not `!`. The dot is reached through a
 * descendant selector because it is drawn *inside* the component — (0,2,0)
 * against the generated `size-2`/`bg-primary-foreground` at (0,1,0), so it
 * wins on specificity whatever order Tailwind emits them in.
 */
const RADIO_ITEM = cn(
  "size-5 border-[1.5px] data-checked:border-primary",
  "data-checked:bg-transparent dark:data-checked:bg-transparent",
  "[&_[data-slot=radio-group-indicator]>span]:size-[9px]",
  "[&_[data-slot=radio-group-indicator]>span]:bg-primary"
)

/**
 * 46 x 26 track, 20px thumb, 3px inset — where the generated switch is
 * 32 x 18.4 with a 16px thumb.
 *
 * `p-[3px] border-0` is what does the inset: it leaves a 40 x 20 content box,
 * so the thumb fills it exactly, `items-center` centres it, and a checked
 * `translate-x-full` moves it the 20px to the far side. (The generated
 * `calc(100% - 2px)` travel is tuned for the transparent 1px border this
 * replaces.) The track height and the thumb both have to repeat their
 * generated variant — `data-[size=default]:` is an attribute selector that
 * outranks a plain `h-6.5` — the trap `Avatar` and `PaginationLink` sprang.
 */
const SWITCH = cn(
  "border-0 p-[3px] data-[size=default]:h-6.5 data-[size=default]:w-11.5",
  "data-unchecked:bg-track dark:data-unchecked:bg-track",
  "[&_[data-slot=switch-thumb]]:size-5",
  "[&_[data-slot=switch-thumb]]:data-checked:translate-x-full"
)

const HEADING = "text-lg font-bold"

function NotificationsForm({ settings }: { settings: NotificationSettings }) {
  const [values, setValues] = React.useState<NotificationSettings>(settings)
  const [pending, startTransition] = React.useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await updateNotifications(values)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
    })
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 id="notify-about-heading" className={HEADING}>
        {notificationsHeadings.notifyAbout}
      </h2>
      <RadioGroup
        name="notifyAbout"
        value={values.notifyAbout}
        onValueChange={(value: NotifyAboutValue) =>
          setValues((current) => ({ ...current, notifyAbout: value }))
        }
        // The heading *is* the group's label, so point at it rather than
        // repeating the string in an `aria-label`.
        aria-labelledby="notify-about-heading"
        // 13px between rows, not `gap-3`: the row's height is set by the
        // 20px circle (`Label`'s own `leading-none` line box is shorter), and
        // 20 + 13 is the export's 33px pitch.
        className="mt-1.75 gap-[13px]"
      >
        {notifyAboutOptions.map((option) => (
          <div key={option.value} className="flex items-center gap-3">
            <RadioGroupItem
              id={`notify-${option.value}`}
              value={option.value}
              className={RADIO_ITEM}
            />
            <Label
              htmlFor={`notify-${option.value}`}
              className="cursor-pointer text-[15px] font-normal"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>

      <h2 className={cn(HEADING, "mt-8")}>{notificationsHeadings.emails}</h2>
      <div className="mt-1.75 flex flex-col gap-3">
        {emailNotifications.map((item) => (
          <div key={item.name} className={TOGGLE_ROW}>
            <div>
              <Label
                htmlFor={`email-${item.name}`}
                className="cursor-pointer text-base leading-6 font-semibold"
              >
                {item.title}
              </Label>
              <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">
                {item.description}
              </p>
            </div>
            <Switch
              id={`email-${item.name}`}
              checked={values[item.name]}
              onCheckedChange={(checked) =>
                setValues((current) => ({ ...current, [item.name]: checked }))
              }
              className={SWITCH}
            />
          </div>
        ))}
      </div>

      <Button type="submit" disabled={pending} className={SETTINGS_SUBMIT}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        {pending ? "Saving…" : "Update notifications"}
      </Button>
    </form>
  )
}

export { NotificationsForm }
