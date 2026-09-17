import { StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The five-star row, drawn three times on `reviews-page.png` at two sizes: 14px
 * under the summary card's figure and 12px beside a reviewer's name.
 *
 * Filled stars are `--star` and the rest `--track`, which is the treatment
 * `course-sale/reviews-card.tsx` already uses — the tokens rather than the
 * export's literal `#f5b40a` / `#e6e6e3`, so dark mode follows. Sampled, the
 * export's own fill is `#f5b409` against the token's `#f5b40a`.
 *
 * It is one component rather than a fourth local copy because both cards on
 * this page draw it and they must not drift; it stays inside this directory
 * because nothing outside the page asks for it yet.
 */
function Stars({
  rating,
  className,
  gapClassName = "gap-[3px]",
}: {
  /** **Floored**, not rounded, to a whole star. The export draws 4.7 as four
   *  gold stars and one grey one, which rounding would make five — and the
   *  exact figure is printed beside the row anyway, so the stars are the
   *  coarse read and the number is the precise one. A review's own rating is
   *  an integer, so this only ever matters for the summary average. */
  rating: number
  /** The glyph size, e.g. `size-3.5`. */
  className?: string
  gapClassName?: string
}) {
  const filled = Math.floor(rating)

  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center", gapClassName)}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon
          key={index}
          className={cn(
            "size-3",
            index < filled ? "fill-star text-star" : "fill-track text-track",
            className
          )}
        />
      ))}
    </span>
  )
}

export { Stars }
