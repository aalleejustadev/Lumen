"use client"

import * as React from "react"
import { CircleUserRoundIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { uploadAvatar } from "@/lib/actions/profile"
import { AVATAR_MIME_TYPES } from "@/lib/config/settings"

/**
 * The avatar row at the top of the profile card — a 72px circle beside the
 * "Upload image" button, measured off
 * `ui-design/light/dashboard/student/setting-profile-page.png` at DPR 2.
 *
 * The button drives a hidden `<input type="file">` rather than being a file
 * input styled to look like a button: a bare file input can't be given the
 * export's shape, and the label-wrapping trick loses the disabled/pending
 * state while an upload is in flight.
 *
 * Picking a file uploads immediately, outside the form's own submit — which
 * is what the export's layout implies and also what stops an image from
 * being stored and then orphaned when someone leaves without pressing
 * "Update profile". The new URL arrives back through the server action's
 * `revalidatePath`, so there is no local preview state to reconcile.
 *
 * The empty state draws the export's generic user glyph rather than the
 * initials fallback used elsewhere in the app: this circle is the *subject*
 * of an upload control, and initials would read as a picture that is already
 * set.
 */
function AvatarUpload({ image, name }: { image: string | null; name: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pending, startTransition] = React.useTransition()

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Let the same file be picked again after a failure.
    event.target.value = ""
    if (!file) return

    const formData = new FormData()
    formData.set("image", file)

    startTransition(async () => {
      const result = await uploadAvatar(formData)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
    })
  }

  return (
    <div className="flex items-center gap-5">
      <Avatar className="size-18">
        {image ? <AvatarImage src={image} alt={name} /> : null}
        <AvatarFallback>
          <CircleUserRoundIcon
            className="size-8 text-subtle-foreground"
            aria-hidden="true"
          />
        </AvatarFallback>
        {/* An overlay rather than swapping the fallback: Base UI only renders
            `AvatarFallback` when there is no image, so a spinner placed there
            would never show for someone who already has a picture. */}
        {pending ? (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-card/70">
            <Spinner className="size-5" />
          </span>
        ) : null}
      </Avatar>

      <input
        ref={inputRef}
        type="file"
        name="image"
        accept={AVATAR_MIME_TYPES.join(",")}
        onChange={onPick}
        className="sr-only"
        aria-label="Profile picture"
      />
      <Button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="h-10 px-5"
      >
        {pending ? <Spinner data-icon="inline-start" /> : null}
        {pending ? "Uploading…" : "Upload image"}
      </Button>
    </div>
  )
}

export { AvatarUpload }
