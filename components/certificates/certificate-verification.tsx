import { BadgeCheckIcon } from "lucide-react"

import { CertificatePanel } from "@/components/certificates/certificate-panel"
import { verificationCopy } from "@/lib/config/certificates"
import type { PublicCertificate } from "@/lib/certificates"

/**
 * The public verification page at `/certificates/[slug]`.
 *
 * **It has no export**, and exists because `Certificate.publicSlug`'s own
 * docstring calls for it — "the Share button's destination, a public
 * verification page" — and because a Share button with nowhere to send
 * somebody is the dead affordance this codebase refuses everywhere else. So
 * everything above and below the certificate is built in the app's own
 * vocabulary; the certificate itself is `certificate.png`'s design, shared
 * with the preview dialog so the two can never drift.
 *
 * Three things about it:
 *
 *  - **It reads no session and states one fact about a person: their name.**
 *    That is what a verification page is for — an employer following the link
 *    has no Lumen account — and it is why the slug is separate from the
 *    printed serial, so quoting an ID on a CV does not hand over a working
 *    link to it. Nothing else about the holder crosses, and there is no way to
 *    walk from one credential to another.
 *  - **Everything but the certificate is `print:hidden`**, and the rules in
 *    `globals.css` hide the marketing shell around it, so somebody who reaches
 *    for Cmd+P on this URL still gets a single A4 landscape sheet. The
 *    *button* no longer prints — it saves a PNG — but this page is a public
 *    link, and printing it is a thing people do.
 *  - **The heading and the lead are above the sheet, not on it.** A
 *    certificate carries no chrome; "Verified credential" is this page talking
 *    about the document, which is exactly why it must not print.
 */
function CertificateVerification({ row }: { row: PublicCertificate }) {
  return (
    <main className="mx-auto w-full max-w-[1008px] px-6 py-12 md:py-16">
      <div className="flex flex-wrap items-center gap-2.5 print:hidden">
        <BadgeCheckIcon className="size-5 text-success" />
        <h1 className="text-2xl font-bold">{verificationCopy.heading}</h1>
      </div>
      <p className="mt-2 text-[15px] text-muted-foreground print:hidden">
        {verificationCopy.lead}
      </p>

      <CertificatePanel row={row} />
    </main>
  )
}

export { CertificateVerification }
