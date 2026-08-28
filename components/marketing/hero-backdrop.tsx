import { cn } from "@/lib/utils"

/**
 * The hero's background layers, measured off the design exports:
 *
 *   1. a 58px rule grid (`.bg-hero-grid`, --grid-line)
 *   2. three blurred ambient orbs, drifting on the keyframes in globals.css
 *   3. a wash returning the bottom edge to --background
 *
 * Centres and diameters were fitted to the alpha profile of the light
 * export: violet peaks at (522, 156), blue at (1283, 165), and cyan sits
 * low at (975, 560) — its vertical centre is extrapolated because the app
 * preview covers it. Horizontal positions are percentages so they track
 * the headline at any width; the vertical ones are fixed because they key
 * off the top of the section.
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

      <div className="orb top-[179px] left-[29.2%] size-[520px] -translate-x-1/2 -translate-y-1/2 animate-drift-1 bg-accent-1 opacity-[var(--orb-strong)]" />
      <div className="orb top-[155px] left-[66%] size-[480px] -translate-x-1/2 -translate-y-1/2 animate-drift-2 bg-accent-2 opacity-[var(--orb-soft)]" />
      <div className="orb top-[591px] left-[50.3%] size-[560px] -translate-x-1/2 -translate-y-1/2 animate-drift-3 bg-accent-3 opacity-[var(--ambient)]" />

      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-background" />
    </div>
  )
}

export { HeroBackdrop }
