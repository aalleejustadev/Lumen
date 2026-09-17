import { siteConfig } from "@/lib/config/site"

/**
 * Everything `/dashboard/certificates` and the public verification page
 * *say*, and nothing they count — the split every surface in this codebase
 * makes: the figures come out of `lib/certificates.ts`, the phrasing around
 * them lives here.
 *
 * It holds **data, never components** — the trap `lib/config/messages.ts`
 * paid for — and imports nothing but the site's own strings, so both the
 * dashboard page and the public route can reach it freely.
 */

/** Four a page, two across: the export's own footer reads "Showing 1–4 of 6
 *  certificates" over a two-page pager. */
export const CERTIFICATES_PAGE_SIZE = 4

/** The banner's fixed line, which is what makes the card read as a credential
 *  rather than as another course tile. */
export const CERTIFICATE_ISSUER = "Lumen Academy"

export const certificatesCopy = {
  title: "Certificates",
  description:
    "Your verified credentials. Share them or download a PDF anytime.",
  ofCompletion: "Certificate of completion",
  instructor: "Instructor",
  issued: "Issued",
  /** The muted label before the serial. Two elements rather than one string so
   *  the serial can be set in the mono face the export draws it in. */
  idLabel: "ID",
  share: "Share",
  /** What the Share button does — see `certificate-actions.tsx` for why it is
   *  a copy rather than a navigation. */
  shareCopied: "Verification link copied.",
  shareFailed: "Could not copy the link.",
  pdf: "PDF",
  showing: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total} ${
      total === 1 ? "certificate" : "certificates"
    }`,
  empty: {
    title: "No certificates yet",
    description:
      "Finish a course and its certificate appears here, ready to share or print.",
  },
} as const

export const certificateStats = {
  earned: "Certificates Earned",
  hours: "Hours Completed",
  streak: "Longest Streak",
} as const

/**
 * The platform's own signatory, and the second signature on every certificate.
 *
 * A fixed string rather than a row: the export draws a Director beside the
 * instructor, and the thing it attests to is that **Lumen** issued the
 * credential — which is a property of the platform, not of a course. It lives
 * here beside the issuer name for the day somebody wants it configurable, at
 * which point it becomes a `PlatformSetting` column and nothing above it
 * changes.
 */
export const CERTIFICATE_DIRECTOR = "Toby Belhome"

/** The host printed in the certificate's footer. It is the *brand* of the
 *  verification page rather than its live origin, which is why it is a string
 *  and not `location.host`: a printed document has to say the same thing from
 *  a laptop, a phone and a PDF opened in five years. */
export const VERIFY_HOST = "verify.lumen.co"

/**
 * Every word printed **on** the certificate, from
 * `ui-design/light/dashboard/student/certificate.png`.
 *
 * Separate from `certificatesCopy` because these are the words of a document
 * rather than of a page: they are set in a serif, they are printed, and
 * changing them changes an artefact somebody may already have filed.
 */
export const certificateDocumentCopy = {
  title: "Certificate of Completion",
  presentedTo: "This is proudly presented to",
  /** Split around the two values the sentence names, so the course title can
   *  be set in semibold the way the export draws it. */
  body: {
    before: "for successfully completing the course ",
    middle:
      ", demonstrating dedication and mastery of the material under the guidance of ",
    after: ".",
  },
  instructor: "Instructor",
  director: "Director",
  grade: (grade: string) => `Grade ${grade}`,
  id: "ID",
  issued: "ISSUED",
} as const

/**
 * The certificate's own ground, as a value rather than only as the
 * `bg-[#fbfaf7]` on the document.
 *
 * **It must stay in step with `certificate-document.tsx`' own class**, which
 * cannot read it — Tailwind resolves arbitrary values at build time, so a
 * variable there would emit nothing. It is here because the PNG rasteriser
 * has to be handed a background explicitly: given none it composites onto
 * transparency, and a transparent certificate dropped into a document turns
 * black as often as white.
 */
export const CERTIFICATE_GROUND = "#fbfaf7"

/** What the Download button saves, and what it says when it cannot. */
export const certificateDownload = {
  /** The serial is in the name because a learner downloading three
   *  credentials should not end up with `certificate (2).png`. */
  fileName: (serial: string) => `lumen-certificate-${serial}.png`,
  failed: "Could not build the image. Try again.",
} as const

/** The preview overlay's own bar, from `certificate.png`.
 *
 *  **`download` says PNG where the export draws "Download PDF"**, at the
 *  user's instruction: the button hands over a file directly instead of
 *  opening the browser's print dialog, and a label naming a format it does not
 *  produce is the kind of lie the billing page's plan line already refuses. */
export const certificatePreviewCopy = {
  title: "Certificate preview",
  linkedIn: "Add to LinkedIn",
  download: "Download PNG",
  close: "Close preview",
} as const

/**
 * LinkedIn's **documented** "Add to profile" URL, which drops a credential
 * into somebody's Licenses & Certifications with the fields already filled.
 *
 * It is a plain link rather than a share dialog or an API call: there is no
 * LinkedIn integration here and none is needed, because this is a public
 * endpoint LinkedIn maintains for exactly this. `certUrl` points at the
 * verification page, which is what makes the entry checkable by whoever reads
 * the profile — and the reason that page had to exist at all.
 *
 * `issueYear`/`issueMonth` come off the stored date rather than out of a
 * formatted string, so a locale can never shift the month — see
 * `PublicCertificate`.
 *
 * `certUrl` is built from **`siteConfig.url`, not `location.origin`**: the
 * link is filed on somebody's LinkedIn profile for years, and a credential
 * pointing at whatever host happened to render the page — a preview
 * deployment, or `localhost` — would rot the moment they left it.
 */
export function linkedInAddToProfileUrl(row: {
  courseTitle: string
  serial: string
  publicSlug: string
  issuedYear: number
  issuedMonth: number
}): string {
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: row.courseTitle,
    organizationName: CERTIFICATE_ISSUER,
    issueYear: String(row.issuedYear),
    issueMonth: String(row.issuedMonth),
    certUrl: `${siteConfig.url}/certificates/${row.publicSlug}`,
    certId: row.serial,
  })
  return `https://www.linkedin.com/profile/add?${params.toString()}`
}

/**
 * Everything the public verification page at `/certificates/[slug]` says.
 *
 * That route exists because `Certificate.publicSlug`'s own docstring calls for
 * it — "the Share button's destination, a public verification page" — and
 * because a Share button with nowhere to send somebody is the dead affordance
 * this codebase refuses. It has no export of its own, so it is built in the
 * app's own vocabulary, the way `new-course-form.tsx` was.
 */
export const verificationCopy = {
  heading: "Verified credential",
  lead: "This certificate was issued by Lumen and has not been altered.",
  awardedTo: "Awarded to",
  completed: "Completed",
  serial: "Certificate ID",
  grade: "Grade",
  score: "Score",
  print: "Download PNG",
  /** Sits under the download button. It names the size because this is a
   *  credential somebody attaches to an application, and "will this print
   *  sharply" is the question they have. */
  printHint: "Saves a 1920 × 1358 PNG — print it or attach it anywhere.",
  notFoundTitle: "No such certificate",
  notFoundDescription:
    "That link does not match a credential we issued. Check the address and try again.",
  browse: "Browse courses",
} as const
