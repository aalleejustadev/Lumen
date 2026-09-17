import { AwardIcon, BadgeCheckIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CourseArt } from "@/components/dashboard/course-art"
import { PrintOnArrival } from "@/components/certificates/print-on-arrival"
import {
  CERTIFICATE_ISSUER,
  certificatesCopy,
  verificationCopy,
} from "@/lib/config/certificates"
import type { PublicCertificate } from "@/lib/certificates"

/**
 * The public verification page at `/certificates/[slug]`.
 *
 * **It has no export**, and exists because `Certificate.publicSlug`'s own
 * docstring calls for it — "the Share button's destination, a public
 * verification page" — and because a Share button with nowhere to send
 * somebody is the dead affordance this codebase refuses everywhere else. It is
 * therefore built in the app's own vocabulary rather than invented, the way
 * `new-course-form.tsx` was: the card's banner enlarged, the marketing shell's
 * content width, and the dashboard's own type scale.
 *
 * Three things about it:
 *
 *  - **It reads no session and states one fact about a person: their name.**
 *    That is what a verification page is for — an employer following the link
 *    has no Lumen account — and it is why the slug is separate from the
 *    printed serial, so quoting an ID on a CV does not hand over a working
 *    link to it. Nothing else about the holder crosses, and there is no way to
 *    walk from one credential to another.
 *  - **It prints.** The one control is the browser's print dialog, which is
 *    where "Save as PDF" lives; `print:` variants drop the shell's furniture
 *    so what comes out is the credential rather than a screenshot of a web
 *    page.
 *  - **The grade and score are drawn only when stored.** Both are nullable on
 *    `Certificate`, and a credential is valid without either — an empty row
 *    reading "Grade —" would look like a mark somebody failed to record.
 */
function CertificateVerification({ row }: { row: PublicCertificate }) {
  return (
    <main className="mx-auto w-full max-w-[880px] px-6 py-12 md:py-16">
      <div className="flex flex-wrap items-center gap-2.5 print:hidden">
        <BadgeCheckIcon className="size-5 text-success" />
        <h1 className="text-2xl font-bold">{verificationCopy.heading}</h1>
      </div>
      <p className="mt-2 text-[15px] text-muted-foreground print:hidden">
        {verificationCopy.lead}
      </p>

      <Card className="mt-6 gap-0 overflow-hidden p-0 ring-border [--card-spacing:0px] print:ring-0">
        <div className="relative h-[210px] overflow-hidden">
          <CourseArt
            thumbnailUrl={row.thumbnailUrl}
            categorySlug={row.categorySlug}
            categoryAccent={row.categoryAccent}
            className="absolute inset-0 h-full w-full"
            iconClassName="size-36 justify-self-end pr-10"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/25 to-black/5"
          />
          <div className="relative flex h-full flex-col p-8">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/20">
                <AwardIcon className="size-4.5 text-white" />
              </span>
              <span className="text-[13px] font-bold tracking-[0.14em] text-white uppercase">
                {CERTIFICATE_ISSUER}
              </span>
            </div>
            <div className="mt-auto">
              <p className="text-[13px] font-semibold tracking-[0.12em] text-white/80 uppercase">
                {certificatesCopy.ofCompletion}
              </p>
              <h2 className="mt-2 text-[30px] leading-tight font-bold text-white">
                {row.courseTitle}
              </h2>
            </div>
          </div>
        </div>

        <div className="p-8">
          <p className="text-[12px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {verificationCopy.awardedTo}
          </p>
          <p className="mt-1.5 text-2xl font-bold">{row.holderName}</p>

          <Separator className="my-7" />

          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label={certificatesCopy.instructor}
              value={row.instructorName}
            />
            <Field label={verificationCopy.completed} value={row.issuedOn} />
            <Field label={verificationCopy.serial} value={row.serial} mono />
            {row.grade === null && row.scorePercent === null ? null : (
              <Field
                label={
                  row.grade === null
                    ? verificationCopy.score
                    : verificationCopy.grade
                }
                value={
                  row.grade ??
                  (row.scorePercent === null ? "" : `${row.scorePercent}%`)
                }
              />
            )}
          </dl>
        </div>
      </Card>

      <div className="mt-7">
        <PrintOnArrival />
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "mt-1.5 truncate font-mono text-[15px] tracking-tight"
            : "mt-1.5 truncate text-[15px] font-semibold"
        }
      >
        {value}
      </dd>
    </div>
  )
}

export { CertificateVerification }
