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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { updateProfile, type ProfileFieldErrors } from "@/lib/actions/profile"
import {
  MAX_BIO_LENGTH,
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
 * (`--card-spacing`), 46px controls (`h-11.5` — the same control height the
 * auth screens use, not the dashboard's usual 40px, because these are text
 * fields rather than buttons), 15px labels and values over 13px help text,
 * and a 78px bio box. The URL rows sit on a 10px rhythm with "Add URL" 12px
 * under them and the submit 28px under that.
 *
 * `Field` gives the label → control → description stack for free and its
 * default `gap-2` is exactly the 8px the export draws, so only the URLs block
 * — label and description pressed together *above* a list — overrides it.
 *
 * The whole form is one client component because the URL list is add/remove
 * state. Submitting posts real `FormData` to `updateProfile`, which
 * re-validates everything server-side and owns the username rules; the
 * per-field messages below are whatever it hands back, not a second copy of
 * those rules.
 */

/** 15px value + 46px box, per the export. `md:` beats `Input`'s own `md:text-sm`. */
const CONTROL = "h-11.5 bg-background px-3.5 text-[15px] md:text-[15px]"

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
        <Field data-invalid={errors.username ? true : undefined}>
          <FieldLabel htmlFor="username" className="text-[15px] font-semibold">
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
            className={CONTROL}
          />
          {errors.username ? (
            <FieldError className="text-[13px]">{errors.username}</FieldError>
          ) : (
            <FieldDescription className="text-[13px]">
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

        {/* Read-only by design: the export's own help text sends you to email
            settings to manage addresses, and the account's address is Better
            Auth's identity key — changing it is a verification flow, not a
            text field. Rendered as a disabled `<select>` (not a plain input)
            because that is what the export draws, chevron and all, and it is
            the control the future "pick one of your verified addresses"
            version will need. The wrapper's `opacity-50` is turned off so the
            border stays full strength like the export; the muted value is
            what marks it unavailable. */}
        {/* No `data-disabled` on the `Field`: that would fade the label and
            the help text through `group-data-[disabled=true]/field`, and the
            export keeps both at full strength — only the *value* is muted.
            The `<select disabled>` plus `aria-describedby` already say why it
            can't be edited. */}
        <Field>
          <FieldLabel htmlFor="email" className="text-[15px] font-semibold">
            Email
          </FieldLabel>
          {/* `NativeSelect` hands `className` to its *wrapper*, and the
              `<select>` inside carries its own hardcoded `h-8 pl-2.5
              text-sm`, so the export's 46px box has to be reached through
              descendant selectors — which win on specificity (0,1,1 against
              0,1,0) no matter what order Tailwind emits them in. The same
              goes for nudging the built-in chevron from `right-2.5` out to
              the measured 14px. */}
          <NativeSelect
            className={cn(
              "w-full has-[select:disabled]:opacity-100",
              "[&_select]:h-11.5 [&_select]:bg-background [&_select]:pl-3.5 [&_select]:text-[15px] [&_select]:text-muted-foreground",
              "[&_[data-slot=native-select-icon]]:right-3.5"
            )}
            disabled
            id="email"
            aria-describedby="email-description"
          >
            <NativeSelectOption value={profile.email}>
              {profile.email}
            </NativeSelectOption>
          </NativeSelect>
          <FieldDescription id="email-description" className="text-[13px]">
            You can manage verified email addresses in your email settings.
          </FieldDescription>
        </Field>

        <Field data-invalid={errors.bio ? true : undefined}>
          <FieldLabel htmlFor="bio" className="text-[15px] font-semibold">
            Bio
          </FieldLabel>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={profile.bio}
            maxLength={MAX_BIO_LENGTH}
            placeholder="Learning design and front-end craft, one lesson at a time."
            aria-invalid={errors.bio ? true : undefined}
            className="min-h-[78px] bg-background px-3.5 py-2.5 text-[15px] md:text-[15px]"
          />
          {errors.bio ? (
            <FieldError className="text-[13px]">{errors.bio}</FieldError>
          ) : (
            <FieldDescription className="text-[13px]">
              You can @mention other learners and instructors to link to them.
            </FieldDescription>
          )}
        </Field>

        {/* The one field whose description sits above its controls, so the
            `Field` gap is dropped and each piece carries its own margin. */}
        <Field className="gap-0">
          <FieldLabel htmlFor="url-0" className="text-[15px] font-semibold">
            URLs
          </FieldLabel>
          <FieldDescription className="mt-0.5 text-[13px]">
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
                    className={cn(CONTROL, "pr-11")}
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
                  <FieldError className="mt-1.5 text-[13px]">
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

      <Button type="submit" disabled={pending} className="mt-7 h-11 px-6">
        {pending ? <Spinner data-icon="inline-start" /> : null}
        {pending ? "Saving…" : "Update profile"}
      </Button>
    </form>
  )
}

export { ProfileForm }
