import { StarIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { CourseArt } from "@/components/dashboard/course-art"
import { reviewsCopy } from "@/lib/config/instructor-reviews"
import type { RatingByCourseRow } from "@/lib/instructor-reviews"

/**
 * The right half of the two-up row on `reviews-page.png` — the instructor's
 * five most-reviewed courses, each with how many reviews it holds and what it
 * averages.
 *
 * Measured off that export at DPR 2: a 738px card on **24px** padding, an
 * 18px/700 heading, then rows on a **56px** pitch inset a further 10px, each a
 * **54 x 30** `rounded-md` thumbnail 14px from a 15px/600 title over a 13px
 * muted count, with the star and the figure right-aligned at the row's
 * trailing edge.
 *
 * Three things about it are decisions rather than markup:
 *
 *  - **A row is not a link.** The export draws no chevron and no other
 *    affordance on one, so it renders as the flat informational block it is —
 *    the rule `help-topic-card.tsx` states, read from the other side. The
 *    course filter sitting directly beneath it is how you narrow the list to
 *    one course, so nothing is missing; a row that navigated would also be the
 *    second way to do a thing the filter already does.
 *  - **Row art is the per-category gradient + icon**, not the export's
 *    photographs — `lumen-course-card-art`, and the shared `CourseArt` so a
 *    course cannot wear two tiles on two screens. `Course.thumbnailUrl` is
 *    honoured when the instructor has uploaded a cover, which the editor's
 *    Course landing page step now writes.
 *  - **Ordering is by review count**, which is the export's own sequence
 *    (1,204 · 892 · 741 · 284 · 163) and *not* by rating — its last three run
 *    4.7, 4.7, 4.6, so rating cannot be what produced it. It is also the
 *    honest order for a card whose subject is where the feedback is. Ties are
 *    broken in `lib/instructor-reviews.ts`, for the reason recorded there.
 */
function RatingByCourseCard({ rows }: { rows: RatingByCourseRow[] }) {
  return (
    <Card className="p-6 ring-border [--card-spacing:0px]">
      <h2 className="text-lg leading-none font-bold">{reviewsCopy.byCourse}</h2>

      {rows.length === 0 ? (
        <p className="mt-5 text-[15px] text-muted-foreground">
          {reviewsCopy.noCourses}
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-[18px]">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3.5 px-2.5">
              <CourseArt
                thumbnailUrl={row.thumbnailUrl}
                categorySlug={row.categorySlug}
                categoryAccent={row.categoryAccent}
                className="h-[30px] w-[54px] rounded-md"
                iconClassName="size-3.5"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] leading-5 font-semibold">
                  {row.title}
                </p>
                <p className="truncate text-[13px] leading-[18px] text-muted-foreground">
                  {reviewsCopy.reviewsOn(row.reviews)}
                </p>
              </div>

              <span className="flex shrink-0 items-center gap-1.5 text-[15px] font-semibold">
                <StarIcon className="size-3.5 fill-star text-star" />
                {row.rating.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export { RatingByCourseCard }
