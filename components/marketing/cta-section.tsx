import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The gradient panel renders identically in both themes — only the heading
 * flips, which the export confirms (#18181b in light, #fafafa in dark). The
 * lead and the button are fixed light-on-gradient, so they don't use the
 * theme tokens that would invert them.
 */
function CtaSection({ className }: { className?: string }) {
  return (
    <section className={cn("w-full", className)}>
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12 md:py-20">
        <div className="relative isolate overflow-hidden rounded-2xl bg-[image:var(--gradient-cta)] px-6 pt-14 pb-12 text-center lg:pt-20 lg:pb-[60px]">
          {/* soft highlight over the violet end, and the dot texture */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_120%_at_18%_45%,rgba(255,255,255,0.12),transparent_70%)]"
          />
          <div
            aria-hidden="true"
            className="bg-dots fade-center pointer-events-none absolute inset-0 -z-10 [--dot-color:rgba(255,255,255,0.16)]"
          />

          <h2 className="text-[22px] leading-[1.16] sm:text-[25px] sm:leading-[1.14]">
            Start learning today.
            <br />
            Start teaching this week.
          </h2>
          <p className="mt-6 text-base text-white/90">
            Free to join, free to publish. Your first course is closer than you
            think.
          </p>
          <Button
            nativeButton={false}
            className="mt-8 h-12 gap-2 bg-white px-6! font-semibold text-neutral-950 hover:bg-white/90"
            render={<Link href="/register" />}
          >
            Create free account
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  )
}

export { CtaSection }
