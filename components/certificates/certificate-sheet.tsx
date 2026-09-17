"use client"

import * as React from "react"

import { CertificateDocument } from "@/components/certificates/certificate-document"
import type { PublicCertificate } from "@/lib/certificates"
import { cn } from "@/lib/utils"

/** The document's own, fixed dimensions — see `certificate-document.tsx`. */
const DOC_WIDTH = 960
const DOC_HEIGHT = 679

/**
 * The certificate scaled to whatever width it is given, and the element the
 * print rules in `globals.css` look for.
 *
 * **A certificate is a document, so it is scaled rather than reflowed.**
 * `CertificateDocument` is laid out at a fixed 960 x 679 and this measures its
 * container and applies one `transform: scale()`, which is what makes a phone,
 * a desktop and a sheet of A4 produce the *same* artefact rather than three
 * arrangements of the same words. Reflowing it would mean a printed
 * certificate whose line breaks depended on the window that produced it.
 *
 * **The scale is capped at 1, so the box the caller styles is the document's
 * own size rather than the space it was offered.** That is two elements — an
 * unstyled `w-full` box that is measured, and the sized box that carries the
 * caller's `className` — and it is not tidiness: with one box, a container
 * wider than 960 left the rounded, ringed card standing 32px proud of the
 * sheet inside it on the verification page and 80px on the dialog, which draws
 * a sliver of page colour inside the frame. Measured, then fixed. Nothing is
 * *enlarged* past 1 because this is a raster-free document whose type is
 * measured in pixels; the two callers size themselves to it instead.
 *
 * The `ResizeObserver` is the only reason this is a Client Component; nothing
 * else here is interactive, and the data arrives as props from the server. It
 * renders at scale 1 before measuring, which the sized box's `overflow-hidden`
 * keeps from flashing.
 *
 * In print the transform is replaced outright by the rules in `globals.css` —
 * the sheet is pinned to the page origin at a fixed 1.16929 — so nothing here
 * has to know about paper.
 */
function CertificateSheet({
  row,
  className,
  documentRef,
}: {
  row: PublicCertificate
  className?: string
  /** Handed straight to the document, so the Download button rasterises the
   *  unscaled node rather than this wrapper — see
   *  `use-certificate-download.ts`. */
  documentRef?: React.Ref<HTMLDivElement>
}) {
  const host = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(1)

  React.useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? DOC_WIDTH
      setScale(Math.min(1, width / DOC_WIDTH))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    // **`min-w-0` on the measured box is load-bearing.** In a grid or flex
    // parent — which `DialogContent` is — an item's automatic minimum size is
    // its *content*, so before the first measurement the 960px-wide sheet
    // inside pushed this box out to 960px, `w-full` resolved against that, and
    // the scale settled at 1 and never came down: the certificate overflowed
    // the dialog at phone width. A block parent (the verification page's
    // `main`) never showed it, which is why it survived the first pass.
    // **`overflow-hidden` fixes it too and must not be used** — the callers
    // paint a `ring` and a `shadow-2xl`, which sit outside the layout box and
    // would be clipped away.
    <div ref={host} data-certificate-print-host className="w-full min-w-0">
      {/* **Every wrapper is marked as a print host.** A transformed ancestor
          becomes the containing block for an absolutely-positioned descendant,
          so with the scaler's `scale()` left standing the print rules pinned
          the certificate to *that* box rather than to the page — it printed
          50pt in from the corner with the rest clipped off. An identity
          `matrix(1,0,0,1,0,0)` does it just as well as a real scale, which is
          why the rules reset the transform to `none` rather than trusting
          `scale(1)` to be inert. */}
      <div
        data-certificate-print-host
        className={cn("overflow-hidden", className)}
        style={{ width: DOC_WIDTH * scale, height: DOC_HEIGHT * scale }}
      >
        <div
          data-certificate-print-host
          className="origin-top-left"
          style={{ transform: `scale(${scale})` }}
        >
          <CertificateDocument row={row} ref={documentRef} />
        </div>
      </div>
    </div>
  )
}

export { CertificateSheet, DOC_HEIGHT, DOC_WIDTH }
