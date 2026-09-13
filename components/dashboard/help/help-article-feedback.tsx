"use client"

import * as React from "react"
import { HeartIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { helpArticleCopy } from "@/lib/config/help-article"

/**
 * "Was this article helpful?" — the first of the two cards under the article.
 *
 * Measured off the export at DPR 2: a 748px card, 84px tall on 24px padding, a
 * 15px/700 title over a 13px muted line, and two 40px outline buttons at the
 * trailing edge on a 10px gap.
 *
 * **Nothing is recorded yet.** There is no table for article feedback —
 * `HelpArticle` carries no counters and there is no `HelpArticleVote` model —
 * so the honest version answers the reader rather than pretending to file
 * something. It swaps the pair for a thank-you on click, which is also what
 * stops a second click double-counting a vote that was never counted once.
 * When the column lands, make this a Server Action and keep the same swap.
 *
 * The state is deliberately not persisted per reader: `localStorage` would
 * remember a vote across reloads, but it is per-browser and invisible to us,
 * which is exactly the illusion of recording something that this note is
 * trying to avoid.
 */
function HelpArticleFeedback() {
  const [answered, setAnswered] = React.useState(false)
  const { feedback } = helpArticleCopy

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5.5">
      <div>
        <p className="text-[15px] leading-none font-bold">{feedback.title}</p>
        <p className="mt-2.5 text-[13px] leading-none text-muted-foreground">
          {feedback.description}
        </p>
      </div>
      {answered ? (
        <p aria-live="polite" className="text-sm font-medium">
          {feedback.thanks}
        </p>
      ) : (
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setAnswered(true)}
            className="h-10 gap-2 px-4.5 text-sm font-medium"
          >
            <HeartIcon className="size-4.5" />
            {feedback.yes}
          </Button>
          <Button
            variant="outline"
            onClick={() => setAnswered(true)}
            className="h-10 gap-2 px-4.5 text-sm font-medium"
          >
            <XIcon className="size-4.5" />
            {feedback.no}
          </Button>
        </div>
      )}
    </div>
  )
}

export { HelpArticleFeedback }
