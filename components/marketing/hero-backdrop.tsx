import { cn } from "@/lib/utils"

/**
 * The hero's background layers, measured off the design exports:
 *
 *   1. a 58px rule grid (`.bg-hero-grid`, --grid-line)
 *   2. three blurred ambient orbs, drifting on the keyframes in globals.css
 *   3. a wash returning the bottom edge to --background
 *
 * Centres and diameters come from the alpha profile of the dark export:
 * violet peaks at (510, 150) and reads ~520px across before the 110px blur,
 * blue at (1235, 115), cyan low and centred at (885, 495). Horizontal
 * positions are percentages so they track the headline at any width; the
 * vertical ones are fixed because they key off the top of the section.
 *
 * Decorative only — hidden from assistive tech, and the global
 * prefers-reduced-motion rule already parks the drift.
 */
function HeroBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div className="bg-hero-grid absolute inset-0" />

      <div className="orb top-[150px] left-[28.3%] size-[520px] -translate-x-1/2 -translate-y-1/2 animate-drift-1 bg-accent-1 opacity-[var(--orb-strong)]" />
      <div className="orb top-[115px] left-[68.6%] size-[480px] -translate-x-1/2 -translate-y-1/2 animate-drift-2 bg-accent-2 opacity-[var(--orb-soft)]" />
      <div className="orb top-[495px] left-[49.2%] size-[560px] -translate-x-1/2 -translate-y-1/2 animate-drift-3 bg-accent-3 opacity-[var(--ambient)]" />

      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-background" />
    </div>
  )
}

export { HeroBackdrop }
