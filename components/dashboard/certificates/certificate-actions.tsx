"use client"

import * as React from "react"
import { DownloadIcon, Share2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { CertificatePreviewDialog } from "@/components/certificates/certificate-preview-dialog"
import { certificatesCopy } from "@/lib/config/certificates"
import type { CertificateRow } from "@/lib/certificates"

/**
 * The two controls in a certificate card's footer, from
 * `ui-design/light/dashboard/student/certificates-page.png` — a 38px square
 * white **Share** beside a 38px dark **PDF**.
 *
 * **PDF opens the preview overlay**, which is the surface
 * `certificate.png` draws: the certificate itself on a dimmed page with its
 * own Add to LinkedIn / Download PDF / close bar. It used to open the
 * verification page with `?print=1`, and that was wrong in the way the user
 * found it — printing a *web page* produced two portrait sheets with the site
 * header, the footer and a URL stamped across them. The document is now a
 * document, and the print rules in `globals.css` reduce the page to it.
 *
 * **Share still copies the verification link rather than navigating.** What a
 * learner wants from a Share button on their own credential is the URL;
 * `navigator.share` is used where the browser has it — a phone offering its
 * own sheet beats a toast — and the clipboard is the fallback. A share the
 * person dismissed is not an error, so `AbortError` is swallowed.
 */
function CertificateActions({ row }: { row: CertificateRow }) {
  const [sharing, setSharing] = React.useState(false)
  const [preview, setPreview] = React.useState(false)

  async function share() {
    // Built from `location` rather than `siteConfig.url`: a link somebody
    // pastes into a chat should open the app they are actually using. The
    // LinkedIn link takes the canonical host instead, for the opposite reason
    // — see `linkedInAddToProfileUrl`.
    const url = new URL(
      `/certificates/${row.publicSlug}`,
      window.location.origin
    ).toString()
    setSharing(true)
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: row.courseTitle, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.add({ title: certificatesCopy.shareCopied, type: "success" })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      toast.add({ title: certificatesCopy.shareFailed, type: "error" })
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        loading={sharing}
        onClick={share}
        aria-label={certificatesCopy.share}
        title={certificatesCopy.share}
        className="size-[38px] bg-card shadow-sm"
      >
        <Share2Icon className="size-4" />
      </Button>
      <Button
        type="button"
        onClick={() => setPreview(true)}
        className="h-[38px] gap-2 px-4"
      >
        <DownloadIcon className="size-4" />
        {certificatesCopy.pdf}
      </Button>

      <CertificatePreviewDialog
        row={row}
        open={preview}
        onOpenChange={setPreview}
      />
    </div>
  )
}

export { CertificateActions }
