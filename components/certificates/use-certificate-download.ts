"use client"

import * as React from "react"

import { toast } from "@/components/ui/toast"
import {
  DOC_HEIGHT,
  DOC_WIDTH,
} from "@/components/certificates/certificate-sheet"
import {
  CERTIFICATE_GROUND,
  certificateDownload,
} from "@/lib/config/certificates"
import type { PublicCertificate } from "@/lib/certificates"

/**
 * **Download turns the certificate into a PNG and hands the file over**, at the
 * user's instruction — no print dialog, no "choose Save as PDF", no second
 * decision to make. What it saves is the element already on screen, so the file
 * cannot drift from the preview: it is the same DOM node, rasterised.
 *
 * Four things about it are decisions rather than plumbing:
 *
 *  - **It rasterises the document node, never the scaled wrapper.**
 *    `certificate-sheet.tsx` fits the sheet to its container with a
 *    `transform: scale()` on an *ancestor*, so the node's own
 *    `getBoundingClientRect()` is whatever the window happened to be — which
 *    is exactly what a downloaded credential must not depend on. `width` and
 *    `height` are therefore passed explicitly at the document's own fixed
 *    960 x 679, so a phone and a desktop save the identical file.
 *  - **`scale: 2`**, so the PNG is 1920 x 1358. A certificate is printed and
 *    zoomed into, and a 1x raster of 15px body copy does not survive either.
 *  - **The background is passed explicitly.** The sheet's ground is painted by
 *    its own element, but a rasteriser given no background composites onto
 *    transparency, and a transparent PNG dropped into a document or a PDF
 *    turns black as often as white.
 *  - **The library is `modern-screenshot`, not `html2canvas`.** The latter
 *    re-implements CSS and would have to be trusted with the frame's radius,
 *    the two clipped washes and the seal's SVG gradient; this one serialises
 *    the real node into an SVG `foreignObject` and lets the browser paint it,
 *    which is the same engine that drew what is on screen. It also embeds the
 *    web fonts, which matters here because the title and the name are set in
 *    Lora and a fallback serif would change the document's proportions.
 *
 * The node is reached by a ref rather than `querySelector`, so two of these on
 * one page could never save each other's certificate.
 */
function useCertificateDownload(row: PublicCertificate) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [pending, setPending] = React.useState(false)

  const download = React.useCallback(async () => {
    const node = ref.current
    if (!node || pending) return

    setPending(true)
    try {
      // Imported here rather than at module scope: it is only needed once
      // somebody actually asks for the file, and it is the heaviest thing on
      // either of these two surfaces.
      const { domToPng } = await import("modern-screenshot")
      const dataUrl = await domToPng(node, {
        width: DOC_WIDTH,
        height: DOC_HEIGHT,
        scale: 2,
        backgroundColor: CERTIFICATE_GROUND,
      })

      const link = document.createElement("a")
      link.href = dataUrl
      link.download = certificateDownload.fileName(row.serial)
      link.click()
    } catch {
      toast.add({ title: certificateDownload.failed, type: "error" })
    } finally {
      setPending(false)
    }
  }, [pending, row.serial])

  return { ref, pending, download }
}

export { useCertificateDownload }
