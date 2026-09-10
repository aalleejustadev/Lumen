"use client"

import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { LogoMark } from "@/components/shared/logo"
import { uploadBrandingAsset } from "@/lib/actions/admin-settings"
import {
  BRANDING_MIME_TYPES,
  platformControlsCopy,
  type BrandingAssetKind,
} from "@/lib/config/admin-settings"

/**
 * The branding row on `/dashboard/admin/settings/platform` — the 56px mark
 * beside "Upload logo" and "Upload favicon", measured off
 * `ui-design/light/dashboard/admin/platform-settings.png` at DPR 2 (the two
 * buttons are 40px, the console's control baseline).
 *
 * Both buttons drive a hidden `<input type="file">` rather than being file
 * inputs styled to look like buttons, and picking a file uploads straight
 * away — the arrangement `avatar-upload.tsx` records, and on this page it is
 * not optional: the export has no submit button anywhere, so an upload that
 * waited for one would never be applied.
 *
 * The tile shows the uploaded logo once there is one and the app's own
 * `LogoMark` until then. That is the honest empty state: Lumen *has* a logo,
 * it simply is not a stored object yet, so a grey placeholder would suggest
 * the site is running without one.
 *
 * **The preview is an `Avatar`, not `next/image`.** These URLs point at the
 * Neon storage endpoint, which is *branch-scoped* — it changes with the
 * database branch — so it cannot be pinned in `next.config.ts`'
 * `remotePatterns`, and an unconfigured host makes `next/image` throw at
 * request time. `AvatarImage` renders a plain `<img>` with a fallback, which
 * is exactly what is wanted here and is already how every avatar in the app
 * is drawn.
 *
 * **No favicon preview.** The export draws none, and a 16px asset scaled to
 * anything useful is a blur; the toast confirms the upload instead.
 */
function BrandingUpload({ logoUrl }: { logoUrl: string | null }) {
  const logoInput = React.useRef<HTMLInputElement>(null)
  const faviconInput = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState<BrandingAssetKind | null>(null)
  const [, startUploading] = React.useTransition()

  function onPick(kind: BrandingAssetKind) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      // Let the same file be picked again after a failure.
      event.target.value = ""
      if (!file) return

      const formData = new FormData()
      formData.set("kind", kind)
      formData.set("file", file)

      setBusy(kind)
      startUploading(async () => {
        const result = await uploadBrandingAsset(formData)
        toast.add({
          title: result.message,
          type: result.ok ? "success" : "error",
        })
        setBusy(null)
      })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3.5">
      <Avatar className="size-14 shrink-0 rounded-xl">
        {logoUrl ? (
          <AvatarImage
            src={logoUrl}
            alt="Platform logo"
            className="object-contain"
          />
        ) : null}
        <AvatarFallback className="rounded-xl bg-transparent">
          {/* `LogoMark` hardcodes a 16px glyph inside its own 36px tile, so
              scaling the tile alone leaves the mark stranded in the middle of
              a 56px square. The descendant selector is (0,1,1) against the
              component's own (0,1,0) `size-4`, so it wins whatever order
              Tailwind emits — the specificity lever `NativeSelect` needs too. */}
          <LogoMark className="size-14 rounded-xl [&>svg]:size-6" />
        </AvatarFallback>
        {busy === "logo" ? (
          <span className="absolute inset-0 grid place-items-center rounded-xl bg-card/70">
            <Spinner className="size-5" />
          </span>
        ) : null}
      </Avatar>

      <input
        ref={logoInput}
        type="file"
        accept={BRANDING_MIME_TYPES.join(",")}
        onChange={onPick("logo")}
        className="sr-only"
        aria-label={platformControlsCopy.uploadLogo}
      />
      <Button
        type="button"
        loading={busy === "logo"}
        onClick={() => logoInput.current?.click()}
        className="h-10 px-5"
      >
        {platformControlsCopy.uploadLogo}
      </Button>

      <input
        ref={faviconInput}
        type="file"
        accept={BRANDING_MIME_TYPES.join(",")}
        onChange={onPick("favicon")}
        className="sr-only"
        aria-label={platformControlsCopy.uploadFavicon}
      />
      <Button
        type="button"
        variant="outline"
        loading={busy === "favicon"}
        onClick={() => faviconInput.current?.click()}
        className="h-10 bg-card px-5 shadow-sm"
      >
        {platformControlsCopy.uploadFavicon}
      </Button>
    </div>
  )
}

export { BrandingUpload }
