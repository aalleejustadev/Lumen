import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { instructorOverviewCards as copy } from "@/lib/config/instructor-overview"

/**
 * "Hi, Ada 👋" — the instructor Overview's hero, from
 * `instructor-dashboard.png`.
 *
 * It is the student `welcome-card.tsx`'s sibling and reuses its illustration
 * (`academy-dashboard-{light,dark}.svg`, supplied assets drawn as-is) with the
 * same both-render/`dark:` toggle `theme-toggle.tsx` uses rather than a client
 * `resolvedTheme` check — a Server Component cannot read the theme, and
 * swapping on a class avoids a flash.
 *
 * **The headline states a real figure or says nothing.** The export draws
 * "taught 1,500 learners this month"; an instructor whose courses enrolled
 * nobody this month gets a different sentence rather than a proud "0", which
 * is the call `attention-list.tsx` makes about an empty queue.
 */
function WelcomeCard({
  firstName,
  learners,
}: {
  firstName: string
  learners: number
}) {
  return (
    <Card className="gap-0 overflow-hidden p-7.5 ring-border">
      {/* **Two columns, not an absolutely-positioned illustration.** Floating
          it over the card let the headline run underneath the artwork at some
          widths; a flex row cannot overlap, and the text column keeps its own
          measure so the sentence breaks where the export breaks it. */}
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-[30px] leading-none font-extrabold tracking-[-0.02em]">
            {copy.welcome.greeting(firstName)} <span aria-hidden>👋</span>
          </p>
          <h2 className="mt-4 max-w-[420px] text-[22px] leading-[1.3] font-bold">
            {learners > 0
              ? copy.welcome.headline(learners)
              : copy.welcome.headlineEmpty}
          </h2>
          <p className="mt-3 max-w-[420px] text-[15px] leading-[1.55] text-muted-foreground">
            {copy.welcome.lead}
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/instructor/courses/new" />}
            className="mt-6 h-11 px-5 font-semibold"
          >
            {copy.welcome.cta}
          </Button>
        </div>

        {/* Hidden below `lg`, where the copy needs the whole card. */}
        <div className="hidden w-[220px] shrink-0 lg:block">
          {/* Plain `<img>`, matching the student welcome card and every
              other local SVG here — `next/image` re-encodes an SVG it cannot
              optimise and the export's artwork is already the right size. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/academy-dashboard-light.svg"
            alt=""
            aria-hidden
            className="w-full dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/academy-dashboard-dark.svg"
            alt=""
            aria-hidden
            className="hidden w-full dark:block"
          />
        </div>
      </div>
    </Card>
  )
}

export { WelcomeCard }
