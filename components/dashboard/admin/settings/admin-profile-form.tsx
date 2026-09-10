"use client"

import * as React from "react"
import { BadgeCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import {
  SETTINGS_CONTROL,
  SETTINGS_DESCRIPTION,
  SETTINGS_LABEL,
  SETTINGS_SUBMIT,
} from "@/components/dashboard/settings/settings-controls"
import { updateAdminProfile } from "@/lib/actions/admin-settings"
import { adminProfileCopy } from "@/lib/config/admin-settings"
import { MAX_EMAIL_LENGTH, MAX_NAME_LENGTH } from "@/lib/config/settings"
import type { AdminProfile } from "@/lib/admin/settings"

/**
 * The form half of `/dashboard/admin/settings/profile`, from
 * `ui-design/light/dashboard/admin/platform-settings__profile.png`.
 *
 * Measured off that export at DPR 2 and verified against the render: a 72px
 * avatar over a 40px "Upload image", 46px text controls, a 59px role callout
 * and a 44px submit — every one of those the learner settings pages' own
 * numbers, so the whole card is drawn with `settings-controls.ts`' shared
 * vocabulary rather than a second measurement. The two exports are one design
 * at two sets of copy.
 *
 * **It is a much shorter form than the learner's profile**, and deliberately:
 * no username, no bio, no URL list. See `adminProfileCopy` for why — the
 * card's own role callout says an admin has no public profile for those to
 * appear on.
 *
 * Two readings of the export worth keeping:
 *
 *  - **Email is editable**, against the export, which draws it as a disabled
 *    `<select>` pointing at "your email settings" — a page that does not
 *    exist, so the control was a dead end. Changing it is still not a plain
 *    column write: Better Auth owns the address and `lib/email-change.ts`
 *    sends a confirmation to the address on the account today before the new
 *    one takes effect. The learner's profile form does exactly the same, from
 *    the same helper, so the two cannot answer "who is this account"
 *    differently.
 *  - **The role callout is not a form control.** It states a fact about the
 *    account — an admin cannot promote themselves from their own profile
 *    card, and the export gives it no affordance to try. It is tinted
 *    `--role-admin`, the token `userRoleBadge` already gives the Admin pill,
 *    so the console cannot say "admin" in two different colours.
 */
function AdminProfileForm({ profile }: { profile: AdminProfile }) {
  const [pending, startTransition] = React.useTransition()
  // Only the email field can fail per-field here — the name is required by
  // the input itself and the action's own check is a backstop.
  const [error, setError] = React.useState<string | null>(null)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setError(null)

    startTransition(async () => {
      const result = await updateAdminProfile(formData)
      setError(result.emailError ?? null)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
    })
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="admin-name" className={SETTINGS_LABEL}>
            {adminProfileCopy.nameLabel}
          </FieldLabel>
          <Input
            id="admin-name"
            name="name"
            defaultValue={profile.name}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="name"
            required
            className={SETTINGS_CONTROL}
          />
          <FieldDescription className={SETTINGS_DESCRIPTION}>
            {adminProfileCopy.nameDescription}
          </FieldDescription>
        </Field>

        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="admin-email" className={SETTINGS_LABEL}>
            {adminProfileCopy.emailLabel}
          </FieldLabel>
          <Input
            id="admin-email"
            name="email"
            type="email"
            inputMode="email"
            defaultValue={profile.email}
            maxLength={MAX_EMAIL_LENGTH}
            autoComplete="email"
            spellCheck={false}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby="admin-email-description"
            className={SETTINGS_CONTROL}
          />
          {error ? (
            <FieldError className={SETTINGS_DESCRIPTION}>{error}</FieldError>
          ) : (
            <FieldDescription
              id="admin-email-description"
              className={SETTINGS_DESCRIPTION}
            >
              {adminProfileCopy.emailDescription}
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      {/* A plain `div` rather than a `Card`: `Card`'s hairline is a `ring`,
          which paints outside the layout box and would push the row past the
          drawn 59px — the trap the wishlist rows and the notification toggles
          both record. */}
      <div className="mt-5 flex items-center gap-3.5 rounded-xl bg-background px-4 py-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-role-admin/10"
        >
          <BadgeCheckIcon className="size-4.5 text-role-admin" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] leading-5 font-semibold">
            {adminProfileCopy.roleTitle}
          </p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            {adminProfileCopy.roleDescription}
          </p>
        </div>
      </div>

      <Button type="submit" loading={pending} className={SETTINGS_SUBMIT}>
        {adminProfileCopy.submit}
      </Button>
    </form>
  )
}

export { AdminProfileForm }
