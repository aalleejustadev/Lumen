import {
  categoryGradients,
  categoryIcons,
  FALLBACK_CATEGORY_GRADIENT,
  FALLBACK_CATEGORY_ICON,
} from "@/lib/config/admin-overview"
import { cn } from "@/lib/utils"

/**
 * A course's artwork, for the review queue's 120 x 74 thumbnail and the course
 * view's 4:1 banner.
 *
 * `Course.thumbnailUrl` is honoured when it is set, and it will be once
 * instructor image upload exists. Until then every course falls back to the
 * per-category gradient + icon the rest of the app uses — the two exports draw
 * photographs, and `lumen-course-card-art` is the standing decision not to
 * wire a stock-photo integration behind them. The gradient is keyed off
 * `Category.accentColor` and the icon off the category slug, so a category
 * added later gets a sensible tile rather than a blank one, exactly as
 * `top-courses-card.tsx` does it.
 *
 * The icon scales with the tile rather than being fixed: at 74px it is a small
 * mark in the corner of a thumbnail, at 220px it is the banner's subject.
 */
function CourseArt({
  thumbnailUrl,
  categorySlug,
  categoryAccent,
  className,
  iconClassName,
}: {
  thumbnailUrl: string | null
  categorySlug: string
  categoryAccent: string
  className?: string
  iconClassName?: string
}) {
  if (thumbnailUrl) {
    // A plain `<img>`, not `next/image`: an instructor upload lives on
    // whatever host the storage bucket is on, and `next/image` would need
    // every one of them declared in `remotePatterns` before it would render.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbnailUrl}
        alt=""
        className={cn("object-cover", className)}
        referrerPolicy="no-referrer"
      />
    )
  }

  const Icon = categoryIcons[categorySlug] ?? FALLBACK_CATEGORY_ICON
  const gradient =
    categoryGradients[categoryAccent] ?? FALLBACK_CATEGORY_GRADIENT

  return (
    <div
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center bg-gradient-to-br",
        gradient,
        className
      )}
    >
      <Icon className={cn("text-white/30", iconClassName)} />
    </div>
  )
}

export { CourseArt }
