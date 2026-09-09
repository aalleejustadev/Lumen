"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import {
  SETTINGS_CONTROL,
  SETTINGS_LABEL,
} from "@/components/dashboard/settings/settings-controls"
import { createUser } from "@/lib/actions/admin-users"
import {
  newUserCopy,
  newUserPlans,
  newUserRoles,
} from "@/lib/config/admin-users"
import type { CountryOption } from "@/lib/config/countries"
import type { UserPlan } from "@/lib/admin/users"
import { cn } from "@/lib/utils"

/**
 * 46 x 26 track, 20px thumb, 3px inset — the switch this app draws, where the
 * generated one is 32 x 18.4 with a 16px thumb. Measured once on
 * `settings-notifications-page.png` and drawn again here; `p-[3px] border-0`
 * leaves a 40 x 20 content box so the thumb fills it exactly and a checked
 * `translate-x-full` is precisely the 20px it needs. The height and the thumb
 * repeat their generated variant because `data-[size=default]:` is an
 * attribute selector that outranks a plain `h-6.5` — the trap `Avatar` and
 * `PaginationLink` sprang. See `notifications-form.tsx` for the full note.
 */
const SWITCH = cn(
  "border-0 p-[3px] data-[size=default]:h-6.5 data-[size=default]:w-11.5",
  "data-unchecked:bg-track dark:data-unchecked:bg-track",
  "[&_[data-slot=switch-thumb]]:size-5",
  "[&_[data-slot=switch-thumb]]:data-checked:translate-x-full"
)

/**
 * The form on `ui-design/light/dashboard/admin/add-new-user__admin.png`.
 *
 * Measured off that export at DPR 2: a 720px card — the one console surface
 * that is *not* full width, since a six-field form has no use for 1490px —
 * on 30px padding, a two-column field grid with a 16px gutter and 44px
 * controls, three 212px role cards on a 12px gap, a 70px invitation row, and
 * 44px buttons.
 *
 * The text-field vocabulary is the settings pages' (`SETTINGS_CONTROL` /
 * `SETTINGS_LABEL`): the geometry is the same measured control, and its
 * `dark:bg-background` in particular is not decoration — `Input` carries
 * `dark:bg-input/30`, a `:is(.dark *)`-wrapped selector that would otherwise
 * fill the field *lighter* than the card it sits on and invert the export.
 *
 * **The role cards are native radios**, `sr-only` inside their labels rather
 * than replaced, so arrow-key selection and screen-reader grouping come from
 * the platform — the same call `components/dashboard/learning/quiz` makes
 * about its option rows.
 *
 * Everything is controlled state and the action takes a **typed payload
 * rather than `FormData`**: three of the six values (role, plan, the toggle)
 * already live in React state, so reading them back off the DOM would only
 * add a way for the two to disagree. It is still validated server-side — a
 * Server Action is a public endpoint — which is the same reasoning
 * `notifications-form.tsx` records.
 */
function NewUserForm({ countries }: { countries: CountryOption[] }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [country, setCountry] = React.useState(
    countries.find((entry) => entry.code === "GB")?.code ?? countries[0]!.code
  )
  const [plan, setPlan] = React.useState<UserPlan>("free")
  const [role, setRole] =
    React.useState<(typeof newUserRoles)[number]["value"]>("user")
  const [sendEmail, setSendEmail] = React.useState(true)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await createUser({
        name,
        email,
        country,
        plan,
        role,
        sendEmail,
      })
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      // Back to the table on success, where the new account is now the first
      // row: the list is newest-first and this one was made a second ago.
      if (result.ok) router.push("/dashboard/admin/users")
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7">
      <div>
        <h2 className="text-base font-bold">{newUserCopy.accountHeading}</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="new-user-name" className={SETTINGS_LABEL}>
              {newUserCopy.nameLabel}
            </label>
            <Input
              id="new-user-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={newUserCopy.namePlaceholder}
              autoComplete="off"
              required
              className={cn(SETTINGS_CONTROL, "h-11")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="new-user-email" className={SETTINGS_LABEL}>
              {newUserCopy.emailLabel}
            </label>
            <Input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={newUserCopy.emailPlaceholder}
              autoComplete="off"
              required
              className={cn(SETTINGS_CONTROL, "h-11")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="new-user-country" className={SETTINGS_LABEL}>
              {newUserCopy.countryLabel}
            </label>
            {/* `NativeSelect` hands `className` to its *wrapper* and hardcodes
                `h-8 pl-2.5 text-sm` on the inner `<select>`, so the box is
                reached with `[&_select]:` descendant selectors — (0,1,1) beats
                (0,1,0) whatever order Tailwind emits. The settings profile
                page documents the same workaround. */}
            <NativeSelect
              className="w-full [&_select]:h-11 [&_select]:bg-background [&_select]:pl-3.5 [&_select]:text-[15px] dark:[&_select]:bg-background"
              id="new-user-country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              {countries.map((entry) => (
                <NativeSelectOption key={entry.code} value={entry.code}>
                  {entry.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="new-user-plan" className={SETTINGS_LABEL}>
              {newUserCopy.planLabel}
            </label>
            <NativeSelect
              className="w-full [&_select]:h-11 [&_select]:bg-background [&_select]:pl-3.5 [&_select]:text-[15px] dark:[&_select]:bg-background"
              id="new-user-plan"
              value={plan}
              onChange={(event) => setPlan(event.target.value as UserPlan)}
            >
              {newUserPlans.map((entry) => (
                <NativeSelectOption key={entry.value} value={entry.value}>
                  {entry.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>
      </div>

      <fieldset>
        <legend className="text-base font-bold">
          {newUserCopy.roleHeading}
        </legend>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {newUserCopy.roleDescription}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {newUserRoles.map((entry) => {
            const active = role === entry.value
            return (
              <label
                key={entry.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-3 rounded-xl border p-5 transition-colors",
                  active
                    ? "border-[1.5px] border-primary bg-hover"
                    : "border-border bg-card hover:bg-soft"
                )}
              >
                <input
                  type="radio"
                  name="new-user-role"
                  value={entry.value}
                  checked={active}
                  onChange={() => setRole(entry.value)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-lg transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-hover text-foreground"
                  )}
                >
                  <entry.icon className="size-4.5" aria-hidden />
                </span>
                <span className="text-[15px] font-bold">{entry.label}</span>
                <span className="text-sm text-muted-foreground">
                  {entry.description}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* A plain bordered box, not a `Card`: `Card`'s hairline is a `ring`,
          which paints outside the layout box and would put this row a
          fractionally different distance from the cards above it than the
          export draws — the trap the wishlist rows and the notification
          toggles both document. */}
      <div className="flex items-center justify-between gap-6 rounded-xl border border-border px-5 py-4">
        <div>
          <p className="text-base font-semibold">{newUserCopy.inviteTitle}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {newUserCopy.inviteDescription}
          </p>
        </div>
        <Switch
          checked={sendEmail}
          onCheckedChange={setSendEmail}
          aria-label={newUserCopy.inviteTitle}
          className={SWITCH}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending} className="h-11 gap-2 px-6">
          <CheckIcon className="size-4" />
          {newUserCopy.submit}
        </Button>
        <Button
          type="button"
          variant="outline"
          loading={pending}
          onClick={() => router.push("/dashboard/admin/users")}
          className="h-11 bg-card px-6 shadow-sm"
        >
          {newUserCopy.cancel}
        </Button>
      </div>
    </form>
  )
}

export { NewUserForm }
