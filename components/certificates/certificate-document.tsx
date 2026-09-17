import type * as React from "react"
import { AwardIcon } from "lucide-react"

import {
  CERTIFICATE_DIRECTOR,
  CERTIFICATE_ISSUER,
  certificateDocumentCopy,
  VERIFY_HOST,
} from "@/lib/config/certificates"
import type { PublicCertificate } from "@/lib/certificates"
import { cn } from "@/lib/utils"

/**
 * The certificate itself, from
 * `ui-design/light/dashboard/student/certificate.png` — the document the
 * preview dialog shows and the print dialog produces.
 *
 * **It is drawn at a fixed 960 × 679 and scaled**, never reflowed. Measured off
 * that export at DPR 2, the sheet is 960 x 679 — A4 landscape to within half a
 * pixel (1.414) — and every element on it is positioned against that canvas:
 * a 2px `#845EEE` frame inset 18px, a 30px logo mark over a 47px serif title,
 * a 64 x 3 violet rule, the holder's name at 48px serif italic, three lines of
 * body copy on a 25.5px rhythm, then the signature row and the footer line.
 * A certificate is a *document*: it has one layout, and the same layout has to
 * come out of a phone, a desktop and a printer. So the caller scales this
 * whole block with a transform rather than letting it respond — see
 * `certificate-sheet.tsx`.
 *
 * Four things about it are decisions rather than markup:
 *
 *  - **The serif is `--font-serif` (Lora), added for this one surface.** The
 *    export sets the title and the name in a display serif with a true cursive
 *    italic, which Figtree has none of; the CSS generic would render Times, and
 *    a credential set in Times reads as a word-processor document rather than
 *    as a document. It is a match on proportion rather than a confirmed
 *    identification: Source Serif 4 was tried first and drew the title at a
 *    width-to-ink ratio of 12.3 against the export's 13.7, where Lora lands on
 *    it. **So the sizes are the drawn *widths*, not the drawn point sizes** —
 *    47px is what makes the title span the export's own 626px. The title's ink
 *    runs 48px tall against the drawn 41, which is Lora's descender depth and
 *    the limit of identifying a font from a raster.
 *  - **The two decorative washes are `absolute` circles clipped by the sheet**,
 *    top-left pink and bottom-right peach. Both were *solved* rather than
 *    eyeballed: their edges were traced across the export at four heights each
 *    and fitted, which gives a 320px circle centred at (40, 40) and a 362px one
 *    centred at (920, 639). Their fills are sampled — `#f0e6e9` and `#f4e9e5`,
 *    flat rather than an opacity over the ground, so print cannot composite
 *    them differently. They are
 *    `print-color-adjust: exact` along with the ground and the frame: browsers
 *    strip backgrounds when printing by default, which would produce a white
 *    page with a missing border — the whole reason the old print view looked
 *    like a text document.
 *  - **The signature rule hugs its name.** Measured, the export's two rules
 *    are 177px and 149.5px wide against signatures of different lengths, so
 *    they are the text's own width and not a column's.
 *  - **The grade pill is dropped when there is none**, like the card's, and
 *    the seal stays: `Certificate.grade` is nullable and a credential is valid
 *    without one.
 */
function CertificateDocument({
  row,
  className,
  ref,
}: {
  row: PublicCertificate
  className?: string
  /** The node the PNG is rasterised from — see `use-certificate-download.ts`.
   *  It is *this* element rather than the scaling wrapper around it, so the
   *  saved file is the document's own fixed 960 x 679 whatever the window is
   *  doing. React 19 takes `ref` as an ordinary prop, so there is no
   *  `forwardRef` here. */
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      data-certificate-print
      className={cn(
        // `text-[#1a1712]` and the ground are literal rather than themed on
        // purpose: this is a printed artefact, not a surface. It must look the
        // same in dark mode, on paper and in a PNG somebody opens in five
        // years — the one place in this app where a token would be wrong. The
        // ground is also `CERTIFICATE_GROUND`, which the rasteriser needs as a
        // value rather than a class; keep the two in step.
        "relative h-[679px] w-[960px] shrink-0 overflow-hidden bg-[#fbfaf7] font-sans text-[#1a1712] [print-color-adjust:exact]",
        className
      )}
    >
      <div
        aria-hidden
        className="absolute -top-[120px] -left-[120px] size-[320px] rounded-full bg-[#f0e6e9] [print-color-adjust:exact]"
      />
      <div
        aria-hidden
        className="absolute -right-[141px] -bottom-[141px] size-[362px] rounded-full bg-[#f4e9e5] [print-color-adjust:exact]"
      />

      {/* The frame: 2px, inset 18px — measured. */}
      <div
        aria-hidden
        className="absolute inset-[18px] rounded-[4px] border-2 border-[#845eee] [print-color-adjust:exact]"
      />

      <div className="relative flex h-full flex-col items-center px-[115px] text-center">
        <div className="mt-[77px] flex items-center gap-3">
          <span className="relative grid size-[30px] shrink-0 place-items-center">
            <GradientShape rounded />
            <AwardIcon className="relative size-4 text-white" />
          </span>
          <span className="text-[15px] font-bold tracking-[0.16em] uppercase">
            {CERTIFICATE_ISSUER}
          </span>
        </div>

        <h1 className="mt-[46px] font-serif text-[47px] leading-none font-bold tracking-[-0.005em]">
          {certificateDocumentCopy.title}
        </h1>
        <span
          aria-hidden
          className="mt-[12px] block h-[3px] w-16 rounded-full bg-[#845eee] [print-color-adjust:exact]"
        />

        <p className="mt-[42px] text-[13px] font-medium tracking-[0.22em] text-[#5d574c] uppercase">
          {certificateDocumentCopy.presentedTo}
        </p>
        <p className="mt-4 font-serif text-[48px] leading-none font-bold italic">
          {row.holderName}
        </p>

        <p className="mt-10 max-w-[500px] text-[15px] leading-[25.5px] text-[#3b362d]">
          {certificateDocumentCopy.body.before}
          <span className="font-semibold">{row.courseTitle}</span>
          {certificateDocumentCopy.body.middle}
          {row.instructorName}
          {certificateDocumentCopy.body.after}
        </p>

        <div className="mt-auto mb-[54px] w-full">
          {/* **`justify-between`, not `grid-cols-3`.** Measured, the export's
              seal sits at x=493 where the sheet's centre is 480 — because the
              two signatures are different widths (177px and 149.5px) and the
              seal takes the middle of what is left between them, which is
              exactly 493.75. An equal three-column grid would centre it and
              lose that. The footer line below is the same layout for the same
              reason: its "ISSUED" cell starts at 415 in the export, which is
              where `justify-between` puts it and not where a third column
              would. */}
          <div className="flex items-end justify-between">
            <Signature
              name={row.instructorName}
              role={certificateDocumentCopy.instructor}
            />

            {/* **The seal hangs below the row rather than sitting in it.**
                Measured, the export's circle spans 511–585 against signatures
                whose ink ends at 579.5 — it overhangs by 10px. A `translate`
                rather than a margin, so the row's height is still the
                signatures' and the two stay aligned with each other. */}
            <div className="flex translate-y-[10px] flex-col items-center">
              <span className="relative grid size-[74px] place-items-center">
                <GradientShape />
                <AwardIcon className="relative size-8 text-white" />
              </span>
              {row.grade ? (
                <span className="-mt-1 rounded-full bg-[#1a1712] px-2 py-0.5 text-[11px] leading-3 font-bold tracking-[0.08em] text-white uppercase [print-color-adjust:exact]">
                  {certificateDocumentCopy.grade(row.grade)}
                </span>
              ) : null}
            </div>

            <Signature
              name={CERTIFICATE_DIRECTOR}
              role={certificateDocumentCopy.director}
            />
          </div>

          <div className="mt-3 flex items-center justify-between font-mono text-[13px] tracking-tight text-[#5d574c]">
            <span>
              {certificateDocumentCopy.id} {row.serial}
            </span>
            <span>
              {certificateDocumentCopy.issued} {row.issuedOn}
            </span>
            <span>{VERIFY_HOST}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The brand gradient behind the logo mark and the seal, as **inline SVG rather
 * than a CSS `linear-gradient`**.
 *
 * Chrome writes a CSS gradient into a PDF correctly, but not every renderer
 * reads it back: macOS' own (`sips`, and Preview behind it) flattened the seal
 * to a solid `#d87958` where Chrome painted `#d36e7a → #b467b2`. An SVG
 * `<linearGradient>` is a real PDF shading and comes through everywhere. A
 * certificate is filed, re-opened and printed by strangers on software nobody
 * here chose, so it is worth the two extra elements. Everything else on the
 * sheet is a flat fill, which survives with `print-color-adjust: exact`.
 *
 * One fixed id is enough: `url(#…)` resolves to the first match, and every
 * instance of this defines the identical stops.
 */
function GradientShape({ rounded = false }: { rounded?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full [print-color-adjust:exact]"
    >
      <defs>
        <linearGradient id="lumen-cert-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e7734f" />
          <stop offset="50%" stopColor="#c0679f" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {rounded ? (
        <rect
          width="100"
          height="100"
          rx="27"
          fill="url(#lumen-cert-gradient)"
        />
      ) : (
        <circle cx="50" cy="50" r="50" fill="url(#lumen-cert-gradient)" />
      )}
    </svg>
  )
}

/**
 * A signature block: the name in serif italic over a rule, over its role.
 *
 * **The rule is exactly the name's width, and it is a warm grey rather than
 * the ink colour.** Measured, the export's left name runs 116→292 and its rule
 * runs with it at `#acaba7`, twenty pixels under the baseline — far enough
 * that a descender crosses it, which is what makes it read as a signature line
 * rather than as an underline. No horizontal padding, because the footer row
 * is `justify-between` and any here would move the seal off the position the
 * export draws it at.
 */
function Signature({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="border-b border-[#acaba7] pb-5 font-serif text-[20px] leading-none font-semibold italic">
        {name}
      </span>
      <span className="mt-0.5 text-[12px] font-medium tracking-[0.18em] text-[#5d574c] uppercase">
        {role}
      </span>
    </div>
  )
}

export { CertificateDocument }
