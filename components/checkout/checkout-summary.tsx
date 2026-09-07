import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { LogoMark } from "@/components/shared/logo"
import { siteConfig } from "@/lib/config/site"
import type { CartSummary } from "@/lib/cart"
import { cn } from "@/lib/utils"

/**
 * The left half of `checkout-page.png` — everything up to the divider on
 * x=944. Every number below was measured off that export at DPR 2 and is
 * quoted panel-relative (the panel's own top edge sits at page y=18):
 *
 *   column         448px wide, 37px side padding, 38px top
 *                  (rendered 493px — the panel runs 10% wider than the
 *                  export by request; the vertical rhythm below is unchanged,
 *                  since the padding is an inset and doesn't scale)
 *   Back to cart   cap band 44-54  -> 14px/700, 20px line
 *   logo row       83-108          -> a 26px mark
 *   "Pay <name>"   134-148         -> 15px muted, 22px line
 *   amount         162-194         -> 32.5px of cap height, so 46px/800
 *   line row       230.5-274.5     -> a 44px thumbnail, title at x=150
 *   rule           294.5
 *   Subtotal/Tax   318 and 344     -> a 26px pitch
 *   rule           371.5
 *   Total due      389             -> 15px/700
 *
 * Line heights are pinned explicitly rather than left to Tailwind's defaults,
 * because the margins above were derived from where the *cap tops* land — a
 * different line box silently moves all of them.
 *
 * Amounts come from our own cart rather than the Stripe session, because the
 * thumbnails do: art is per-category (`lumen-course-card-art`) and keyed by
 * the catalog row, which Stripe knows nothing about. The two agree because
 * `lib/actions/checkout.ts` builds the session's `line_items` from these exact
 * rows. **Tax is $0.00 because there is no tax**, not because it's hard-coded
 * to match the export: `automatic_tax` is off, so Stripe charges none. Turn
 * that on and this row has to start reading `checkout.total.taxInclusive`.
 */
function CheckoutSummary({ summary }: { summary: CartSummary }) {
  const rows = [
    { label: "Subtotal", value: summary.subtotal },
    { label: "Tax", value: 0 },
  ]

  return (
    <div className="flex h-full flex-col bg-background px-[37px] pt-[38px] pb-10">
      <Link
        href="/dashboard/cart"
        className="inline-flex items-center gap-2.5 self-start text-sm leading-[20px] font-bold transition-opacity hover:opacity-70"
      >
        <ArrowLeftIcon className="size-[18px]" strokeWidth={2.25} />
        Back to cart
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <LogoMark tone="solid" className="size-[26px] rounded-[7px]" />
        <span className="text-[15px] font-bold">{siteConfig.legalName}</span>
      </div>

      <p className="mt-5 text-[15px] leading-[22px] text-muted-foreground">
        Pay {siteConfig.legalName}
      </p>
      {/* `font-extrabold` explicitly: the global rule only takes h1/h2 to 800
          and this is a plain <p>. */}
      <p className="mt-1 text-[46px] leading-none font-extrabold tracking-[-0.02em]">
        ${summary.total.toFixed(2)}
      </p>

      <ul className="mt-7.5 flex flex-col gap-4">
        {summary.lines.map((line) => (
          <li key={line.id} className="flex items-center gap-[45px]">
            <div className="relative shrink-0">
              <div
                className={cn(
                  "grid size-11 place-items-center rounded-[6px] bg-gradient-to-br",
                  line.course.art
                )}
              >
                <line.course.icon className="size-5 text-white/30" />
              </div>
              {/* The quantity pill on the thumbnail's top-right corner. A
                  course is bought once, so it is always 1 — kept because the
                  export draws it, and because it is where a quantity goes. */}
              <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-muted-foreground/80 text-[10px] leading-none font-semibold text-background">
                1
              </span>
            </div>
            <span className="min-w-0 flex-1 text-[15px] leading-[22px]">
              {line.course.title}
            </span>
            <span className="text-[15px] leading-[22px] tabular-nums">
              ${line.course.price.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t" />

      <dl className="mt-3.5 flex flex-col">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between leading-[26px]">
            <dt className="text-[15px] text-muted-foreground">{row.label}</dt>
            <dd className="text-[15px] text-muted-foreground tabular-nums">
              ${row.value.toFixed(2)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-2.5 border-t" />

      <div className="mt-2 flex justify-between leading-[26px]">
        <span className="text-[15px] font-bold">Total due</span>
        <span className="text-[15px] font-bold tabular-nums">
          ${summary.total.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

export { CheckoutSummary }
