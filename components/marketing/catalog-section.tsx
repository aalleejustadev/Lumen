import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CatalogBrowser } from "@/components/marketing/catalog-browser"
import { cn } from "@/lib/utils"

function CatalogSection({ className }: { className?: string }) {
  return (
    <section className={cn("w-full", className)}>
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12 md:py-20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-subtle-foreground uppercase">
              The catalog
            </p>
            {/* 44px display type, matching the platform section */}
            <h2 className="mt-2.5 text-4xl leading-[1.1] lg:text-[44px]">
              12,000 courses. No filler.
            </h2>
          </div>
          <Button
            variant="outline"
            nativeButton={false}
            className="h-11 gap-2 bg-card px-4.5! font-semibold"
            render={<Link href="/courses" />}
          >
            Explore all
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>

        <CatalogBrowser />
      </div>
    </section>
  )
}

export { CatalogSection }
