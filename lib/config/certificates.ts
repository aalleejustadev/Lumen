/**
 * Everything `/dashboard/certificates` and the public verification page
 * *say*, and nothing they count — the split every surface in this codebase
 * makes: the figures come out of `lib/certificates.ts`, the phrasing around
 * them lives here.
 *
 * It holds **data, never components** — the trap `lib/config/messages.ts`
 * paid for — and imports nothing, so both the dashboard page and the public
 * route can reach it freely.
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
  print: "Download PDF",
  /** Sits under the print button. The button opens the browser's print dialog,
   *  which is where "Save as PDF" lives — saying so beats a button that looks
   *  like it will hand over a file. */
  printHint: "Opens your browser's print dialog — choose “Save as PDF”.",
  notFoundTitle: "No such certificate",
  notFoundDescription:
    "That link does not match a credential we issued. Check the address and try again.",
  browse: "Browse courses",
} as const

/**
 * The query flag the card's **PDF** button appends, which makes the
 * verification page open the print dialog once on arrival.
 *
 * It is a flag rather than the page's default behaviour because the same URL
 * is what **Share** copies: somebody following a shared link wants to read the
 * credential, not to be ambushed by a print dialog.
 */
export const PRINT_PARAM = "print"
