import { AwardIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { CertificateActions } from "@/components/dashboard/certificates/certificate-actions"
import { CourseArt } from "@/components/dashboard/course-art"
import { CERTIFICATE_ISSUER, certificatesCopy } from "@/lib/config/certificates"
import type { CertificateRow } from "@/lib/certificates"

/**
 * One credential from
 * `ui-design/light/dashboard/student/certificates-page.png`: a coloured banner
 * over a white body carrying the instructor, the issue date, the printed ID
 * and the two controls.
 *
 * Measured off that export at DPR 2: a **730px** card, a **149px** banner on
 * 26px padding — a 28px translucent tile beside 13px letterspaced
 * `LUMEN ACADEMY`, a 36px translucent grade circle at the trailing edge, and
 * at the foot a 13px letterspaced `CERTIFICATE OF COMPLETION` over a 24px/700
 * title — then a body on 26px padding: 12px uppercase muted labels over 16px
 * values, a hairline, and a 38px footer row.
 *
 * Four things about it are decisions rather than markup:
 *
 *  - **The banner is the per-category gradient**, not the export's
 *    photographs — `lumen-course-card-art`, through the shared `CourseArt` so
 *    a course cannot wear two tiles on two screens. It sits behind the content
 *    rather than beside it, which is the one place in the app `CourseArt` is
 *    used as a *backdrop*; its centred glyph reads as the certificate's seal,
 *    which is why it is given a large `iconClassName` and left where it is.
 *    `Course.thumbnailUrl` is still honoured, and the `from-black/15` wash over
 *    it is what keeps white type legible on a photograph an instructor chose.
 *  - **`INSTRUCTOR` and `ISSUED` are a two-column row, not a stack.** The
 *    export right-aligns the second pair against the card's edge, which is
 *    what makes the date scannable down a column of cards.
 *  - **The grade pill is dropped when there is none.** `Certificate.grade` is
 *    nullable and a certificate is valid without one — an empty circle would
 *    read as a missing value rather than as an absent grade.
 *  - **The serial is set in the mono face.** It is an identifier somebody
 *    copies or reads aloud, and the export draws it that way; `--font-geist-mono`
 *    is already loaded by the root layout.
 */
function CertificateCard({ row }: { row: CertificateRow }) {
  return (
    <Card className="gap-0 overflow-hidden p-0 ring-border [--card-spacing:0px]">
      <div className="relative h-[149px] overflow-hidden">
        <CourseArt
          thumbnailUrl={row.thumbnailUrl}
          categorySlug={row.categorySlug}
          categoryAccent={row.categoryAccent}
          className="absolute inset-0 h-full w-full"
          iconClassName="size-28 justify-self-end pr-7"
        />
        {/* A wash rather than a flat tint: the gradients are mid-tone and a
            photograph is anything at all, so the type needs a floor under it
            without the artwork going grey. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/25 to-black/5"
        />

        <div className="relative flex h-full flex-col p-6.5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/20">
                <AwardIcon className="size-4 text-white" />
              </span>
              <span className="text-[13px] font-bold tracking-[0.14em] text-white uppercase">
                {CERTIFICATE_ISSUER}
              </span>
            </div>
            {row.grade ? (
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 text-[14px] font-semibold text-white">
                {row.grade}
              </span>
            ) : null}
          </div>

          <div className="mt-auto">
            <p className="text-[13px] font-semibold tracking-[0.12em] text-white/80 uppercase">
              {certificatesCopy.ofCompletion}
            </p>
            <h3 className="mt-1.5 line-clamp-1 text-2xl font-bold text-white">
              {row.courseTitle}
            </h3>
          </div>
        </div>
      </div>

      <div className="p-6.5">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[12px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {certificatesCopy.instructor}
            </p>
            <p className="mt-1.5 truncate text-base font-semibold">
              {row.instructorName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[12px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {certificatesCopy.issued}
            </p>
            <p className="mt-1.5 text-base font-semibold">{row.issuedOn}</p>
          </div>
        </div>

        <div className="mt-5 border-t border-border-subtle pt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="min-w-0 text-[15px]">
              <span className="text-muted-foreground">
                {certificatesCopy.idLabel}{" "}
              </span>
              <span className="font-mono tracking-tight">{row.serial}</span>
            </p>
            <CertificateActions
              publicSlug={row.publicSlug}
              courseTitle={row.courseTitle}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

export { CertificateCard }
