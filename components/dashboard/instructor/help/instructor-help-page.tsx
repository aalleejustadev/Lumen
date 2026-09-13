"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { HelpContactCards } from "@/components/dashboard/instructor/help/help-contact-cards"
import { HelpFaqCard } from "@/components/dashboard/instructor/help/help-faq-card"
import { HelpTopicCard } from "@/components/dashboard/instructor/help/help-topic-card"
import {
  helpTopics,
  instructorFaqs,
  instructorHelpCopy,
  type HelpFacts,
} from "@/lib/config/instructor-help"

/**
 * `/dashboard/instructor/help`, built to
 * `ui-design/light/dashboard/instructor/instructor-help-center-page.png`.
 *
 * Measured off that export at DPR 2: a **1000px content column, centred** —
 * capped like the settings and notification pages rather than running the
 * console's full width — a 224px hero card on **40px** padding with a 30px/800
 * title, a 15px lead and a 518 x 50 search field, then 20px/700 section
 * headings, a three-up topic grid on a 16px gap, the FAQ card, and the two
 * contact cards 24px below it.
 *
 * Every colour in the export lands on an existing token exactly, sampled:
 * cards `--card` inside a `--border` hairline, the icon tiles `--hover`
 * (#efefec), the FAQ dividers `--border-subtle` (#f0f0ee), the search field
 * filled with `--background` (#f4f4f3) so the page colour is what separates it
 * from the white card it sits on — the trick `settings-controls.ts` documents
 * — and the three text tints `--foreground` / `--muted-foreground` /
 * `--subtle-foreground`.
 *
 * The hero's `h1` is the one heading on the page that keeps its base weight.
 * Its stem measures 0.167em, which is the 800 `globals.css` already applies —
 * the standing correction to 700 is for *page titles*, and this is a display
 * heading. The two section headings measure ~0.15em and so do take the
 * explicit `font-bold`.
 *
 * **The search field filters, rather than sitting there.** A field that
 * advertised search and did nothing on Enter would be the promise
 * `dashboard-search.tsx` refuses to make. The content is static config, so the
 * filtering is a client-side match over the topics and the questions *and
 * their answers* — searching "payout" should find the question that only says
 * "payout" in its answer. `useDeferredValue` keeps typing smooth without a
 * debounce timer, and nothing is written to the URL: unlike the tables in the
 * console this changes no rows, so there is no query to share and no server
 * round trip to make.
 *
 * The contact cards are deliberately outside the filter — "Still stuck?" is
 * most useful exactly when a search has found nothing.
 */
function InstructorHelpPage({ facts }: { facts: HelpFacts }) {
  const [query, setQuery] = React.useState("")
  const deferred = React.useDeferredValue(query)
  const faqs = React.useMemo(() => instructorFaqs(facts), [facts])

  const needle = deferred.trim().toLowerCase()
  const topics = needle
    ? helpTopics.filter((topic) =>
        `${topic.title} ${topic.description}`.toLowerCase().includes(needle)
      )
    : helpTopics
  const questions = needle
    ? faqs.filter((faq) =>
        `${faq.question} ${faq.answer}`.toLowerCase().includes(needle)
      )
    : faqs
  const empty = topics.length === 0 && questions.length === 0

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-[1000px]">
        {/* Hero ---------------------------------------------------------- */}
        <div className="rounded-2xl border bg-card p-10 text-center">
          <h1 className="text-3xl">{instructorHelpCopy.title}</h1>
          <p className="mt-2.5 text-[15px] leading-6 text-muted-foreground">
            {instructorHelpCopy.lead}
          </p>
          <div className="relative mx-auto mt-5.5 max-w-[518px]">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-[18px] size-4.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={instructorHelpCopy.searchPlaceholder}
              aria-label={instructorHelpCopy.searchPlaceholder}
              // `md:text-[15px]` and `dark:bg-background` repeat the variants
              // `Input` itself carries (`md:text-sm`, `dark:bg-input/30`),
              // which is what lets tailwind-merge drop the generated class —
              // a plain override loses to both on specificity. Same fix, and
              // same reason, as `settings-controls.ts`.
              className="h-12.5 rounded-lg border-transparent bg-background pr-4.5 pl-[50px] text-[15px] md:text-[15px] dark:bg-background"
            />
          </div>
        </div>

        {empty ? (
          <div className="mt-9 rounded-xl border bg-card px-6 py-16 text-center">
            <p className="text-[15px] font-semibold">
              {instructorHelpCopy.noResults}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {instructorHelpCopy.noResultsHint}
            </p>
          </div>
        ) : null}

        {/* Browse by topic ------------------------------------------------ */}
        {topics.length > 0 ? (
          <>
            <h2 className="mt-9 mb-4.5 text-xl leading-none font-bold">
              {instructorHelpCopy.topicsHeading}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => (
                <HelpTopicCard key={topic.title} topic={topic} />
              ))}
            </div>
          </>
        ) : null}

        {/* Frequently asked ----------------------------------------------- */}
        {questions.length > 0 ? (
          <>
            <h2 className="mt-9 mb-4.5 text-xl leading-none font-bold">
              {instructorHelpCopy.faqHeading}
            </h2>
            {/* Keyed on the result set so a filtered list opens its own first
                row rather than keeping an index from the previous one. */}
            <HelpFaqCard
              key={questions.map((faq) => faq.question).join("|")}
              faqs={questions}
            />
          </>
        ) : null}

        <div className="mt-6">
          <HelpContactCards supportEmail={facts.supportEmail} />
        </div>
      </div>
    </main>
  )
}

export { InstructorHelpPage }
