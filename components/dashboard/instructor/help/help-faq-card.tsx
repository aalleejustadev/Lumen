"use client"

import { ChevronRightIcon } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { type HelpFaq } from "@/lib/config/instructor-help"

/**
 * "Frequently asked" — one card holding flush rows divided by hairlines, the
 * first of them open.
 *
 * Measured off `instructor-help-center-page.png` at DPR 2: **54px** closed
 * rows on 22px side padding, divided by 1px `--border-subtle` rules (lighter
 * than the card's own `--border` edge, which is what the token is for), a
 * 16px/600 question and a 15px/24 muted answer with 20px under it. The open
 * row measures 122px, which is exactly 54 + two 24px answer lines + 20.
 *
 * Three things the generated `Accordion` does that this export does not, each
 * corrected by repeating the variant rather than reaching for `!`:
 *
 *  - **Its chevron points down when closed and up when open**, where the
 *    export points *right* when closed and down when open. Both built-in
 *    glyphs are hidden and one `ChevronRight` is redrawn, rotated 90° on
 *    expand — the same swap `course-content-card.tsx` makes, reusing
 *    `AccordionTrigger`'s own `group-aria-expanded/accordion-trigger:` hook.
 *  - **Its trigger underlines on hover**, which is right for a body-copy
 *    accordion and wrong for a row that fills the card's whole width.
 *  - **Its item border is the default `--border`**, so the internal dividers
 *    would be as dark as the card's edge.
 *
 * The question is 600, not the 700 a card title takes: measured at 0.125em,
 * and the design note already places a row label inside a card a step below a
 * card title.
 *
 * **The answer carries an explicit `max-w-[640px]` measure.** The export wraps
 * the one answer it draws after "your changes are", which the full 952px
 * content box does not do — at 15px Figtree that line advances 626px and the
 * next word would take it to 674, so the measure sits between them. Padding
 * alone will not reproduce it, the point `course-feedback-dialog.tsx` already
 * records about its own lead. It is also simply the right measure: the full
 * box runs to ~127 characters a line, where this is ~85.
 */
function HelpFaqCard({ faqs }: { faqs: HelpFaq[] }) {
  return (
    <Accordion
      // The export draws the first row open. Base UI's own prop is `multiple`
      // (not `openMultiple`), and false keeps it one-at-a-time, which is what
      // a FAQ list wants.
      defaultValue={[faqs[0]?.question ?? ""]}
      multiple={false}
      className="overflow-hidden rounded-xl border bg-card"
    >
      {faqs.map((faq) => (
        <AccordionItem
          key={faq.question}
          value={faq.question}
          className="not-last:border-b-border-subtle"
        >
          <AccordionTrigger className="h-13.5 items-center rounded-none border-0 px-5.5 py-0 text-base font-semibold hover:no-underline **:data-[slot=accordion-trigger-icon]:hidden">
            {faq.question}
            <ChevronRightIcon className="ml-auto size-4.5 shrink-0 text-muted-foreground transition-transform group-aria-expanded/accordion-trigger:rotate-90" />
          </AccordionTrigger>
          <AccordionContent className="px-5.5 pt-0 pb-5">
            {/* The measure goes on the paragraph, not on `AccordionContent`:
                `box-sizing: border-box` is global, so a max-width on the
                padded box would be 44px of padding plus a 596px measure and
                would break the line a word early. */}
            <p className="max-w-[640px] text-[15px] leading-6 text-muted-foreground">
              {faq.answer}
            </p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export { HelpFaqCard }
