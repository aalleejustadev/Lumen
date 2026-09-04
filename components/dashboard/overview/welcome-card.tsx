import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

/**
 * The "Hi, {name}" hero card. The scattered sparkles and the illustration are
 * the export's own decoration — `academy-dashboard-*.svg` ships as-is (not
 * ours to redraw), swapped by theme the same way `theme-toggle.tsx` swaps its
 * two icons: both images render, `dark:` picks which one is visible.
 */
function WelcomeCard({ firstName }: { firstName: string }) {
  return (
    <Card className="relative gap-0 overflow-hidden p-8 ring-border">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-lg text-accent-2/70 dark:text-accent-3/60 [&>span]:absolute [&>span]:animate-pulse"
      >
        <span className="top-[18%] left-[10%]">✦</span>
        <span className="top-[10%] left-[44%] text-star">✦</span>
        <span className="top-[32%] left-[60%] text-success">✦</span>
        <span className="top-[48%] left-[78%]">✦</span>
        <span className="top-[76%] left-[6%] text-accent-1">✦</span>
        <span className="top-[86%] left-[24%]">✦</span>
        <span className="top-[90%] left-[52%] text-star">✦</span>
        <span className="top-[80%] left-[92%]">✦</span>
      </span>

      <h2 className="text-[28px] leading-tight">Hi, {firstName} 👋</h2>
      <p className="mt-3 max-w-[360px] text-xl font-bold text-foreground">
        What do you want to learn today?
      </p>
      <p className="mt-3 max-w-[360px] text-sm leading-relaxed text-muted-foreground">
        Discover courses, track progress, and achieve your learning goals
        seamlessly.
      </p>

      <Button
        nativeButton={false}
        className="mt-6 h-11 w-fit gap-2 px-5! font-semibold"
        render={<Link href="/dashboard/courses" />}
      >
        Explore Courses
        <ArrowRightIcon data-icon="inline-end" />
      </Button>

      {/* Measured off the export: vertically centered (near-equal top/bottom
          margins), ~52% of the card's height, right edge inset ~8% of the
          card's width rather than flush — not bottom-anchored, which is what
          made it look wrong. Plain `<img>`, matching every other image in the
          app (no `next/image` usage exists yet), and a decorative local SVG
          gains nothing from the optimizer anyway. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/illustrations/academy-dashboard-light.svg"
        alt=""
        className="pointer-events-none absolute top-1/2 right-[8%] h-[48%] max-h-[260px] w-auto -translate-y-1/2 dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/illustrations/academy-dashboard-dark.svg"
        alt=""
        className="pointer-events-none absolute top-1/2 right-[8%] hidden h-[48%] max-h-[260px] w-auto -translate-y-1/2 dark:block"
      />
    </Card>
  )
}

export { WelcomeCard }
