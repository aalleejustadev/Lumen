"use client"

import { CertificatePageActions } from "@/components/certificates/certificate-page-actions"
import { CertificateSheet } from "@/components/certificates/certificate-sheet"
import { useCertificateDownload } from "@/components/certificates/use-certificate-download"
import { verificationCopy } from "@/lib/config/certificates"
import type { PublicCertificate } from "@/lib/certificates"

/**
 * The interactive half of the public verification page: the certificate, the
 * two buttons under it and their hint.
 *
 * **It exists because the ref and the button are siblings.** The Download
 * button rasterises the sheet, so one component has to hold both — and
 * `certificate-verification.tsx` is a Server Component whose heading and lead
 * have no reason to reach the browser. So the client boundary is drawn here,
 * around exactly the three elements that need it, rather than by marking the
 * whole page `"use client"`.
 */
function CertificatePanel({ row }: { row: PublicCertificate }) {
  const { ref, pending, download } = useCertificateDownload(row)

  return (
    <>
      <CertificateSheet
        row={row}
        documentRef={ref}
        className="mt-6 rounded-xl ring-1 ring-border print:mt-0 print:rounded-none print:ring-0"
      />

      <div className="mt-7">
        <CertificatePageActions
          row={row}
          onDownload={download}
          pending={pending}
        />
        <p className="mt-2.5 text-[13px] text-muted-foreground print:hidden">
          {verificationCopy.printHint}
        </p>
      </div>
    </>
  )
}

export { CertificatePanel }
