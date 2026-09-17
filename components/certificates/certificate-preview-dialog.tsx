"use client"

import * as React from "react"
import { BadgeCheckIcon, DownloadIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useCertificateDownload } from "@/components/certificates/use-certificate-download"
import { CertificateSheet } from "@/components/certificates/certificate-sheet"
import {
  certificatePreviewCopy,
  linkedInAddToProfileUrl,
} from "@/lib/config/certificates"
import type { PublicCertificate } from "@/lib/certificates"

/**
 * "Certificate preview", from
 * `ui-design/light/dashboard/student/certificate.png` — the overlay the card's
 * **PDF** button opens, and where the document is actually printed from.
 *
 * Measured off that export at DPR 2: the sheet centred on a dimmed page with
 * its own bar *above* it rather than inside it — a 15px white label on the
 * left and, on the right, a 44px white **Add to LinkedIn**, a 44px white
 * **Download PDF** and a 44px square close. The controls sit on the scrim
 * because the sheet below them is a document: nothing of the app's chrome may
 * appear on it, which is also what the print rules enforce.
 *
 * Three things about it are decisions rather than markup:
 *
 *  - **Download saves a PNG and asks nothing**, at the user's instruction —
 *    see `use-certificate-download.ts`. It called `window.print()` first,
 *    which put the browser's print dialog between somebody and their own
 *    credential and then made them pick a destination; opening the print view
 *    over a scrolling dashboard also paginated it, because Base UI's dialog is
 *    `position: fixed` and a fixed ancestor repeats on every printed page.
 *    `Certificate.pdfStorageKey` is the eventual home for a server-rendered
 *    file and nothing writes one; when it does, this button becomes a link to
 *    that object and the document beside it does not change.
 *  - **Add to LinkedIn is LinkedIn's own documented URL**, not a share
 *    dialog — `/profile/add?startTask=CERTIFICATION_NAME&…`, which drops the
 *    credential straight into somebody's Licenses & Certifications with the
 *    issuer, the dates, the ID and a link back to the verification page. It
 *    opens in a new tab, so nobody loses the dialog they were in.
 *  - **`DialogContent` is stripped back to a transparent shell.** Its default
 *    is a white card with a close button in the corner; here the sheet *is*
 *    the content and the bar sits outside it, so the panel keeps only the
 *    focus trap and the escape handling. The generated close X is replaced by
 *    the export's own, which is why the title is visually hidden rather than
 *    absent — a dialog still needs an accessible name.
 */
function CertificatePreviewDialog({
  row,
  open,
  onOpenChange,
}: {
  row: PublicCertificate
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { ref, pending, download } = useCertificateDownload(row)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(960px,94vw)] max-w-none gap-0 border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only text-black">
          {certificatePreviewCopy.title}
        </DialogTitle>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <p className="text-[15px] font-medium text-black drop-shadow-sm">
            {certificatePreviewCopy.title}
          </p>
          <div className="flex items-center gap-2.5">
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
              className="h-11 gap-2 bg-card px-4 shadow-sm"
            >
              <BadgeCheckIcon className="size-4" />
              {certificatePreviewCopy.linkedIn}
            </Button>
            {/* `loading` rather than `disabled`: rasterising the sheet takes a
                beat on a phone, and the button has to say it is working rather
                than merely look unavailable — the rule `button.tsx` records. */}
            <Button
              type="button"
              variant="outline"
              onClick={download}
              loading={pending}
              className="h-11 gap-2 bg-card px-4 shadow-sm"
            >
              <DownloadIcon className="size-4" />
              {certificatePreviewCopy.download}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label={certificatePreviewCopy.close}
              className="size-11 bg-card shadow-sm"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>

        <CertificateSheet
          row={row}
          documentRef={ref}
          className="rounded-xl shadow-2xl print:rounded-none print:shadow-none"
        />
      </DialogContent>
    </Dialog>
  )
}

export { CertificatePreviewDialog }
