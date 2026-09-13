import Link from "next/link"

import {
  helpArticleCopy,
  sectionId,
  type HelpArticleLink,
  type HelpArticleSection,
} from "@/lib/config/help-article"

/**
 * The article's right rail — "On this page" over "Related articles" — from
 * `ui-design/light/dashboard/student/help-center-article-sidebar.png`.
 *
 * Measured off that export and the full page at DPR 2: a **220px** column, an
 * 8.5px-cap uppercase heading in `--subtle-foreground`, then the contents
 * list — a 1px `--border` rule down its left edge with the rows indented
 * **13px** from it, 14px labels on a **33px** pitch. "Related articles" sits
 * 33px below, over 220px cards on a **12px** gap, each `p-4` with a 14px/700
 * title on a 20px line and a 12px `--subtle-foreground` read time.
 *
 * **It is sticky, which is the point of the second export.** `lg:sticky
 * lg:top-[86px] lg:self-start` — 70px of app bar plus a 16px breathing gap,
 * the offset `course-purchase-card.tsx` already uses. `self-start` is
 * load-bearing and not decoration: CSS Grid's default `align-items: stretch`
 * would stretch this column to the article's full height, and an element as
 * tall as its scroll container can never stick. `max-h`/`overflow-y-auto` are
 * there for the case the rail itself is taller than the viewport — a long
 * contents list would otherwise have its last items permanently below the
 * fold.
 *
 * The rail sits **38px lower than the article column** (`lg:mt-9.5`): the
 * export aligns its first heading with the `h1`, not with the breadcrumb above
 * it, and without the offset the rail rides up level with the breadcrumb.
 *
 * The contents list is derived from the section titles it is handed rather
 * than authored beside them, so a renamed section cannot leave a stale rail
 * entry behind — the requirement `HelpArticle.body`'s own docstring states.
 */
function HelpArticleRail({
  sections,
  related,
  articleHref,
}: {
  sections: HelpArticleSection[]
  related: HelpArticleLink[]
  articleHref: (slug: string) => string
}) {
  return (
    <aside className="lg:sticky lg:top-[86px] lg:mt-9.5 lg:max-h-[calc(100vh-102px)] lg:self-start lg:overflow-y-auto">
      {sections.length > 0 ? (
        <>
          <p className="text-xs font-semibold tracking-[0.08em] text-subtle-foreground uppercase">
            {helpArticleCopy.onThisPage}
          </p>
          <nav
            aria-label={helpArticleCopy.onThisPage}
            className="mt-2.5 border-l"
          >
            {sections.map((section) => (
              <Link
                key={section.title}
                href={`#${sectionId(section.title)}`}
                className="block py-1.5 pl-3.5 text-sm leading-[21px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {section.title}
              </Link>
            ))}
          </nav>
        </>
      ) : null}

      {related.length > 0 ? (
        <>
          <p className="mt-5.5 text-xs font-semibold tracking-[0.08em] text-subtle-foreground uppercase">
            {helpArticleCopy.relatedArticles}
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {related.map((entry) => (
              <Link
                key={entry.slug}
                href={articleHref(entry.slug)}
                className="rounded-xl border bg-card p-3 transition-colors hover:bg-hover"
              >
                <span className="block text-sm leading-[19px] font-bold">
                  {entry.title}
                </span>
                <span className="mt-1.5 block text-xs leading-none text-subtle-foreground">
                  {helpArticleCopy.readTime(entry.readMinutes)}
                </span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </aside>
  )
}

export { HelpArticleRail }
