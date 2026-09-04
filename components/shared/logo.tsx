import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/config/site"

/**
 * The Lumen glyph: a gradient tile holding a rounded diamond with a circular
 * cut-out, so the gradient reads through the middle. The cut-out is a mask
 * rather than a filled circle to keep it in step with `--gradient-logo`.
 */
function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-logo inline-flex size-9 shrink-0 items-center justify-center rounded-lg shadow-logo",
        className
      )}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 text-white">
        <mask id="lumen-logo-cutout">
          <rect width="16" height="16" fill="black" />
          <rect
            x="2.34"
            y="2.34"
            width="11.31"
            height="11.31"
            rx="3.2"
            transform="rotate(45 8 8)"
            fill="white"
          />
          <circle cx="8" cy="8" r="3" fill="black" />
        </mask>
        <rect
          width="16"
          height="16"
          fill="currentColor"
          mask="url(#lumen-logo-cutout)"
        />
      </svg>
    </span>
  )
}

/**
 * `markClassName` exists because the tile is not one size everywhere: the
 * header runs it at 36px, the footer at 32px.
 */
function Logo({
  className,
  markClassName,
  labelClassName,
}: {
  className?: string
  markClassName?: string
  /** The collapsed sidebar keeps the mark and drops the wordmark. */
  labelClassName?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span
        className={cn(
          "text-xl font-extrabold tracking-[-0.03em]",
          labelClassName
        )}
      >
        {siteConfig.name}
      </span>
    </span>
  )
}

export { Logo, LogoMark }
