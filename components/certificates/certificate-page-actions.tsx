"use client"

import { BadgeCheckIcon, DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  certificatePreviewCopy,
  linkedInAddToProfileUrl,
} from "@/lib/config/certificates"
import type { PublicCertificate } from "@/lib/certificates"

/**
 * The two actions under the certificate on the public verification page.
 *
 * They are the preview dialog's own pair, minus its close: somebody who
 * followed a shared link wants the same two things the holder does — file it
 * on LinkedIn, or keep a copy. **Download runs the same hook the dialog does**,
 * so the file a stranger saves off a public URL is the identical PNG the
 * holder gets — which is the point of a verification page, and the reason this
 * is a shared hook rather than two buttons that happen to agree today.
 *
 * **It replaced a `?print=1` auto-print.** That flag existed so the card's PDF
 * button could jump straight to the browser dialog, and it is gone with the
 * button that set it — the card opens the preview now. Auto-printing a page
 * somebody arrived at from a link was the wrong behaviour anyway: they came to
 * *read* the credential.
 *
 * The sheet itself is rendered by `certificate-verification.tsx` rather than
 * here, so the ref is handed *up* to it — these buttons sit below the
 * certificate they save.
 */
function CertificatePageActions({
  row,
  onDownload,
  pending,
}: {
  row: PublicCertificate
  onDownload: () => void
  pending: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 print:hidden">
      <Button
        type="button"
        onClick={onDownload}
        loading={pending}
        className="h-11 gap-2 px-5"
      >
        <DownloadIcon className="size-4" />
        {certificatePreviewCopy.download}
      </Button>
      {/* `nativeButton={false}` because Base UI asserts that a component acting
          as a button really is one — the console error `CLAUDE.md` records two
          of shipping. */}
      <Button
        nativeButton={false}
        variant="outline"
        render={
          <a
            href={linkedInAddToProfileUrl(row)}
            target="_blank"
            rel="noopener noreferrer"
          />
        }
        className="h-11 gap-2 bg-card px-5 shadow-sm"
      >
        <BadgeCheckIcon className="size-4" />
        {certificatePreviewCopy.linkedIn}
      </Button>
    </div>
  )
}

export { CertificatePageActions }
