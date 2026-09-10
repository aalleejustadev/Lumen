"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import {
  SETTINGS_CONTROL,
  SETTINGS_DESCRIPTION,
  SETTINGS_LABEL,
  SETTINGS_SUBMIT,
} from "@/components/dashboard/settings/settings-controls"
import { updateProfile, type ProfileFieldErrors } from "@/lib/actions/profile"
import {
  MAX_BIO_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PROFILE_URLS,
  USERNAME_CHANGE_DAYS,
  USERNAME_MAX_LENGTH,
} from "@/lib/config/settings"
import type { Profile } from "@/lib/profile"
import { cn } from "@/lib/utils"

/**
 * The form half of `/dashboard/settings/profile`, from
 * `ui-design/light/dashboard/student/setting-profile-page.png`.
 *
 * Measured off that export at DPR 2: a 922px card on 30px padding
 * (`--card-spacing`) and a 78px bio box; the URL rows sit on a 10px rhythm
 * with "Add URL" 12px under them. Everything else is the shared settings
 * vocabulary — see `settings-controls.ts`.
 *
 * `Field` gives the label → control → description stack for free and its
 * default `gap-2` is exactly the 8px the export draws, so only the URLs block
 * — label and description pressed together *above* a list — overrides it.
 * The control/label/description classes come from `settings-controls.ts`,
 * shared with the account form because both exports draw the same geometry.
 *
 * The whole form is one client component because the URL list is add/remove
 * state. Submitting posts real `FormData` to `updateProfile`, which
 * re-validates everything server-side and owns the username rules; the
 * per-field messages below are whatever it hands back, not a second copy of
 * those rules.
 */

function ProfileForm({ profile }: { profile: Profile }) {
  // Controlled, and lowercased as it is typed. The action stores the handle
  // lowercased either way, so an uncontrolled field would keep showing
  // "AdaLovelace" after saving "adalovelace" — `defaultValue` does not
  // re-apply to a mounted input when the server sends fresh props.
  const [username, setUsername] = React.useState(profile.username)
  const [urls, setUrls] = React.useState<string[]>(
    profile.urls.length > 0 ? profile.urls : [""]
  )
  const [errors, setErrors] = React.useState<ProfileFieldErrors>({})
  const [pending, startTransition] = React.useTransition()

  const locked = profile.usernameLockedUntil

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setErrors({})

    startTransition(async () => {
      const result = await updateProfile(formData)
      setErrors(result.errors ?? {})
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
    })
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        {/* Full name leads the form: it moved here from the account page,
            where it used to sit beside date of birth and the locale
            preferences. Profile is the identity page — see
            `MAX_NAME_LENGTH`. */}
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="name" className={SETTINGS_LABEL}>
            Full name
          </FieldLabel>
          <Input
            id="name"
            name="name"
            defaultValue={profile.name}
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
              The name shown on your profile, in discussions and on
              certificates.
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={errors.username ? true : undefined}>
          <FieldLabel htmlFor="username" className={SETTINGS_LABEL}>
            Username
          </FieldLabel>
          <Input
            id="username"
            name="username"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value.trimStart().toLowerCase())
            }
            maxLength={USERNAME_MAX_LENGTH}
            autoComplete="username"
            spellCheck={false}
            aria-invalid={errors.username ? true : undefined}
            className={SETTINGS_CONTROL}
          />
          {errors.username ? (
            <FieldError className={SETTINGS_DESCRIPTION}>
              {errors.username}
            </FieldError>
          ) : (
            <FieldDescription className={SETTINGS_DESCRIPTION}>
              This is your public display name. It can be your real name or a
              pseudonym. You can only change this once every{" "}
              {USERNAME_CHANGE_DAYS} days.
              {locked
                ? ` Next change available ${locked.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}.`
                : ""}
            </FieldDescription>
          )}
        </Field>

        {/* **Editable, and a plain input.** The export draws a disabled
            `<select>` whose help text points at "your email settings" — a
            page that does not exist, so the control was a dead end. It is a
            real field now, per the user's instruction, in every mode.
            Changing it is still not a plain column write: Better Auth owns
            this address, and `lib/email-change.ts` sends a confirmation link
            to the address on the account *today* before the new one takes
            effect. The help text below says so, because a field that looks
            like it saved when it has only sent a mail is worse than one that
            explains itself. */}
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="email" className={SETTINGS_LABEL}>
            Email
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            defaultValue={profile.email}
            maxLength={MAX_EMAIL_LENGTH}
            autoComplete="email"
            spellCheck={false}
            required
            aria-invalid={errors.email ? true : undefined}
            aria-describedby="email-description"
            className={SETTINGS_CONTROL}
          />
          {errors.email ? (
            <FieldError className={SETTINGS_DESCRIPTION}>
              {errors.email}
            </FieldError>
          ) : (
            <FieldDescription
              id="email-description"
              className={SETTINGS_DESCRIPTION}
            >
              Used to sign in. Changing it sends a confirmation link to your
              current address — the new one takes effect once you follow it.
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={errors.bio ? true : undefined}>
          <FieldLabel htmlFor="bio" className={SETTINGS_LABEL}>
            Bio
          </FieldLabel>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={profile.bio}
            maxLength={MAX_BIO_LENGTH}
            placeholder="Learning design and front-end craft, one lesson at a time."
            aria-invalid={errors.bio ? true : undefined}
            className="min-h-[78px] bg-background px-3.5 py-2.5 text-[15px] md:text-[15px] dark:bg-background"
          />
          {errors.bio ? (
            <FieldError className={SETTINGS_DESCRIPTION}>
              {errors.bio}
            </FieldError>
          ) : (
            <FieldDescription className={SETTINGS_DESCRIPTION}>
              You can @mention other learners and instructors to link to them.
            </FieldDescription>
          )}
        </Field>

        {/* The one field whose description sits above its controls, so the
            `Field` gap is dropped and each piece carries its own margin. */}
        <Field className="gap-0">
          <FieldLabel htmlFor="url-0" className={SETTINGS_LABEL}>
            URLs
          </FieldLabel>
          <FieldDescription className={cn("mt-0.5", SETTINGS_DESCRIPTION)}>
            Add links to your website, blog, or social media profiles.
          </FieldDescription>

          <div className="mt-2.5 flex flex-col gap-2.5">
            {urls.map((url, index) => (
              <div key={index}>
                <div className="relative">
                  <Input
                    id={`url-${index}`}
                    name="url"
                    // Deliberately not `type="url"`: that would make the
                    // browser refuse to submit a bare `example.com`, which
                    // `normalizeUrl` in the action is written to accept and
                    // upgrade to `https://`. Validation stays server-side,
                    // where it can't be skipped.
                    type="text"
                    inputMode="url"
                    value={url}
                    onChange={(event) =>
                      setUrls((current) =>
                        current.map((entry, position) =>
                          position === index ? event.target.value : entry
                        )
                      )
                    }
                    placeholder="https://example.com"
                    spellCheck={false}
                    aria-invalid={errors.urls?.[index] ? true : undefined}
                    className={cn(SETTINGS_CONTROL, "pr-11")}
                  />
                  {/* The export puts a control in this slot at the trailing
                      edge of every URL row; a removal is the one a
                      grow-by-hand list actually needs, so that is what it
                      is. Kept out of the row's own tab order dance by being
                      a real button rather than an icon on the input. */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove URL ${index + 1}`}
                    onClick={() =>
                      setUrls((current) => {
                        const next = current.filter(
                          (_, position) => position !== index
                        )
                        return next.length > 0 ? next : [""]
                      })
                    }
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
                  >
                    <XIcon />
                  </Button>
                </div>
                {errors.urls?.[index] ? (
                  <FieldError className={cn("mt-1.5", SETTINGS_DESCRIPTION)}>
                    {errors.urls[index]}
                  </FieldError>
                ) : null}
              </div>
            ))}
          </div>

          {/* Wrapped so `Field`'s `*:w-full` stretches the wrapper and not
              the button — the export draws it at its content width. */}
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              disabled={urls.length >= MAX_PROFILE_URLS}
              onClick={() => setUrls((current) => [...current, ""])}
              className="h-10 bg-card px-5"
            >
              Add URL
            </Button>
          </div>
        </Field>
      </FieldGroup>

      <Button type="submit" loading={pending} className={SETTINGS_SUBMIT}>
        {pending ? "Saving…" : "Update profile"}
      </Button>
    </form>
  )
}

export { ProfileForm }
