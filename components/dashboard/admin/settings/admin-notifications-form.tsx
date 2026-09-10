"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { SETTINGS_SUBMIT } from "@/components/dashboard/settings/settings-controls"
import { updateAdminNotifications } from "@/lib/actions/admin-notifications"
import {
  adminEmailNotifications,
  adminNotificationsCopy,
  adminNotificationsHeadings,
  adminNotifyAboutOptions,
  type AdminNotifyAboutValue,
} from "@/lib/config/admin-notifications"
import type { AdminNotificationSettings } from "@/lib/admin/notifications"
import { cn } from "@/lib/utils"

/**
 * `/dashboard/admin/settings/notifications`.
 *
 * **The learner's layout, the admin's options.** Every measurement below is
 * `notifications-form.tsx`', reused rather than re-derived — the same 18px/700
 * headings, the same 33px radio pitch, the same 77px toggle rows on a 12px
 * gap, the same inverted radio and 46 x 26 switch. That is the point: one
 * notification layout across the student, instructor and admin modes.
 *
 * What differs is what the controls *say*. The learner's four rows are about
 * their courses, marketing and discussions; these are the console's own work
 * queues — the four `attentionQueues` draws on Platform Overview — plus the
 * shared `securityEmails`, which is about the account rather than the role.
 * See `lib/config/admin-notifications.ts` for why that list rather than an
 * invented one.
 *
 * This is a second component rather than a prop on the learner's because the
 * two forms write different columns through different actions (this one
 * re-checks the admin role); sharing one component would mean threading the
 * option list, the value type and the action through it, which is more
 * coupling than the ~80 lines it would save.
 *
 * Every control is **controlled**, seeded once from the server's row and
 * never re-synced — the reasoning `notifications-form.tsx` spells out about
 * uncontrolled defaults moving under Base UI after a Server Action
 * re-renders the route.
 */

/**
 * The row card. A plain `div` rather than a `Card`: `Card`'s hairline is a
 * `ring`, which paints outside the layout box and would make the 12px gap
 * read as 10.
 */
const TOGGLE_ROW =
  "flex items-center justify-between gap-4 rounded-xl border px-5 py-4"

/** The export's inverted radio — a white face with a `--primary` ring and dot,
 *  not a `--primary` face with a white dot. See `notifications-form.tsx`. */
const RADIO_ITEM = cn(
  "size-5 border-[1.5px] data-checked:border-primary",
  "data-checked:bg-transparent dark:data-checked:bg-transparent",
  "[&_[data-slot=radio-group-indicator]>span]:size-[9px]",
  "[&_[data-slot=radio-group-indicator]>span]:bg-primary"
)

/** 46 x 26 track, 20px thumb, 3px inset. See `notifications-form.tsx`. */
const SWITCH = cn(
  "border-0 p-[3px] data-[size=default]:h-6.5 data-[size=default]:w-11.5",
  "data-unchecked:bg-track dark:data-unchecked:bg-track",
  "[&_[data-slot=switch-thumb]]:size-5",
  "[&_[data-slot=switch-thumb]]:data-checked:translate-x-full"
)

const HEADING = "text-lg font-bold"

function AdminNotificationsForm({
  settings,
}: {
  settings: AdminNotificationSettings
}) {
  const [values, setValues] =
    React.useState<AdminNotificationSettings>(settings)
  const [pending, startTransition] = React.useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await updateAdminNotifications(values)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
    })
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 id="admin-notify-about-heading" className={HEADING}>
        {adminNotificationsHeadings.notifyAbout}
      </h2>
      <RadioGroup
        name="adminNotifyAbout"
        value={values.adminNotifyAbout}
        onValueChange={(value: AdminNotifyAboutValue) =>
          setValues((current) => ({ ...current, adminNotifyAbout: value }))
        }
        // The heading *is* the group's label, so point at it rather than
        // repeating the string in an `aria-label`.
        aria-labelledby="admin-notify-about-heading"
        // 13px between rows, not `gap-3`: the row's height is set by the 20px
        // circle, and 20 + 13 is the export's 33px pitch.
        className="mt-1.75 gap-[13px]"
      >
        {adminNotifyAboutOptions.map((option) => (
          <div key={option.value} className="flex items-center gap-3">
            <RadioGroupItem
              id={`admin-notify-${option.value}`}
              value={option.value}
              className={RADIO_ITEM}
            />
            <Label
              htmlFor={`admin-notify-${option.value}`}
              className="cursor-pointer text-[15px] font-normal"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>

      <h2 className={cn(HEADING, "mt-8")}>
        {adminNotificationsHeadings.emails}
      </h2>
      <div className="mt-1.75 flex flex-col gap-3">
        {adminEmailNotifications.map((item) => (
          <div key={item.name} className={TOGGLE_ROW}>
            <div>
              <Label
                htmlFor={`admin-email-${item.name}`}
                className="cursor-pointer text-base leading-6 font-semibold"
              >
                {item.title}
              </Label>
              <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">
                {item.description}
              </p>
            </div>
            <Switch
              id={`admin-email-${item.name}`}
              checked={values[item.name]}
              onCheckedChange={(checked) =>
                setValues((current) => ({ ...current, [item.name]: checked }))
              }
              className={SWITCH}
            />
          </div>
        ))}
      </div>

      <Button type="submit" loading={pending} className={SETTINGS_SUBMIT}>
        {pending ? "Saving…" : adminNotificationsCopy.submit}
      </Button>
    </form>
  )
}

export { AdminNotificationsForm }
