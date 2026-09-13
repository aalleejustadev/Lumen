import Link from "next/link"
import {
  ChevronRightIcon,
  ClockIcon,
  SendIcon,
  SparklesIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HelpArticleFeedback } from "@/components/dashboard/help/help-article-feedback"
import { HelpArticleRail } from "@/components/dashboard/help/help-article-rail"
import {
  helpArticleCopy,
  sectionId,
  type HelpArticleView,
} from "@/lib/config/help-article"

/**
 * The help-centre article page, built to
 * `ui-design/light/dashboard/student/help-center-article-page.png` and its
 * companion `help-center-article-sidebar.png`.
 *
 * **It is shared by both modes and knows about neither.** The student and
 * instructor help centres are one design over different words — `HelpAudience`
 * is a column in the schema rather than two tables — so this component renders
 * a resolved `HelpArticleView` and every mode-specific thing in it (the words,
 * the breadcrumb target, how a sibling article is addressed) arrives as data
 * from the route. Adding the student side is a second route and a second
 * content file; nothing here changes. The instructor content lives in
 * `lib/config/instructor-help-articles.ts`.
 *
 * Measured off those exports at DPR 2: a **1000px content column, centred**,
 * the same cap the help-centre index uses, split into a **748px** article and
 * a **220px** rail with a 32px gutter. Inside the article, prose is held to a
 * **696px measure** — the export's own, and the width its tip callout is drawn
 * at — while the two cards at the foot run the full 748. That is not an
 * inconsistency in the drawing: body copy at the full column width would run
 * to ~115 characters a line, and the cards are furniture rather than prose.
 *
 * Type, measured glyph by glyph against the export: a 14px breadcrumb, a
 * **30px** `h1` (cap height 22px, matching a 30px render exactly — not the
 * 32px the other dashboard titles use), a 13px meta row, a 17px/28 lead, 20px
 * section headings and 16px/28 body. The export's text shapes about 1.5%
 * tighter than the browser's, so lines wrap a word earlier here; the type is
 * left at the system scale, per the standing note about not shrinking it to
 * close an export gap.
 *
 * The rail is sticky — see `HelpArticleRail`, which is what the second export
 * exists to specify.
 */
function HelpArticlePage({ view }: { view: HelpArticleView }) {
  const { article, categoryTitle, updatedLabel, related, homeHref } = view
  const mailto = `mailto:${view.supportEmail}?subject=${encodeURIComponent(
    `${helpArticleCopy.support.subject}: ${article.title}`
  )}`

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-[1000px]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
          {/* Article ---------------------------------------------------- */}
          <article className="min-w-0">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Link
                href={homeHref}
                className="transition-colors hover:text-foreground"
              >
                {helpArticleCopy.breadcrumbHome}
              </Link>
              <ChevronRightIcon className="size-4 shrink-0 text-subtle-foreground" />
              <span>{categoryTitle}</span>
            </nav>

            {/* `text-3xl` is 30px, which is what the export measures — the
                base `h1` rule already supplies the 800 and the -0.03em. */}
            <h1 className="mt-3.5 text-3xl">{article.title}</h1>

            <div className="mt-3 flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <ClockIcon className="size-4 shrink-0" />
              <span>{helpArticleCopy.readTime(article.readMinutes)}</span>
              <span aria-hidden className="text-subtle-foreground">
                •
              </span>
              <span>{helpArticleCopy.updated(updatedLabel)}</span>
            </div>

            {/* The prose measure. The cards below sit outside it. */}
            <div className="max-w-[696px]">
              <p className="mt-5 text-[17px] leading-7">{article.lead}</p>

              {article.sections.map((section) => (
                <section
                  key={section.title}
                  id={sectionId(section.title)}
                  // Anchored headings land under the 70px sticky app bar
                  // without this; `scroll-mt` is the whole fix.
                  className="scroll-mt-[86px]"
                >
                  <h2 className="mt-8 text-xl font-bold">{section.title}</h2>
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={paragraph}
                      className={cn(
                        // 16px on a **27px** line, measured: the lead runs on
                        // 28 and the body on 27, consistently across all four
                        // of the export's sections.
                        "text-base leading-[27px] text-muted-foreground",
                        // The export sets the first paragraph tight under its
                        // heading and opens the gap between paragraphs.
                        index === 0 ? "mt-2" : "mt-4"
                      )}
                    >
                      {paragraph}
                    </p>
                  ))}
                  {section.callout ? (
                    <div className="mt-4 flex gap-3 rounded-lg rounded-l-none border border-l-[3px] border-l-foreground bg-hover px-5 py-4.5">
                      <SparklesIcon className="mt-0.5 size-4.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                          {section.callout.label}
                        </p>
                        <p className="mt-2 text-[15px] leading-6">
                          {section.callout.body}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </section>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-4">
              <HelpArticleFeedback />

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5.5">
                <div>
                  <p className="text-[15px] leading-none font-bold">
                    {helpArticleCopy.support.title}
                  </p>
                  <p className="mt-2.5 text-[13px] leading-none text-muted-foreground">
                    {helpArticleCopy.support.description}
                  </p>
                </div>
                {/* A `mailto:` at the platform's configured address, for the
                    reason `user-row-actions.tsx` records — and it names the
                    article, so a reply thread starts with the page it came
                    from. */}
                <Button
                  nativeButton={false}
                  className="h-10 gap-2 px-4.5 text-sm font-semibold"
                  render={<a href={mailto} />}
                >
                  <SendIcon className="size-4.5" />
                  {helpArticleCopy.support.action}
                </Button>
              </div>
            </div>
          </article>

          <HelpArticleRail
            sections={article.sections}
            related={related}
            articleHref={view.articleHref}
          />
        </div>
      </div>
    </main>
  )
}

export { HelpArticlePage }
