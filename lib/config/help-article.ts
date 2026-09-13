/**
 * The shape of a help-centre article, and the one place the "On this page"
 * rail is derived.
 *
 * **This module is audience-agnostic on purpose.** The student and instructor
 * help centres are the same page over different words — `HelpAudience` is a
 * *column* in `prisma/schema.prisma`, not two tables, and the note on
 * `HelpCategory` says so ("the student and instructor help centres draw six
 * topics each, and they are different six"). So the template in
 * `components/dashboard/help/` renders a `HelpArticleView` and knows nothing
 * about who is reading; each mode supplies its own content and its own hrefs.
 *
 * Sections are **structured rather than a Markdown string**, which is what
 * `HelpArticle.body` will eventually hold. Two reasons, and both survive the
 * move to the database: the rail is derived from the section list rather than
 * stored, exactly as that model's docstring requires ("derived from the
 * headings in here rather than stored, so the two can't disagree"), and a
 * structured section can carry the export's tip callout, which Markdown has no
 * syntax for. When the table is populated, parse `body` into these sections
 * once, in the route — the template does not change.
 */

/** A callout — the bordered `TIP` block the export draws mid-article. */
export type HelpCallout = {
  /** Uppercase label. The export draws "TIP"; anything short works. */
  label: string
  body: string
}

export type HelpArticleSection = {
  /**
   * Numbered in the export ("1. Set up your profile"), and the numbering is
   * written into the title rather than generated: not every article is a
   * sequence, and a rail that counted steps an article does not have would be
   * worse than one that repeats the heading.
   */
  title: string
  paragraphs: string[]
  callout?: HelpCallout
}

export type HelpArticleLink = {
  slug: string
  title: string
  readMinutes: number
}

/** One article, as the content files author it. */
export type HelpArticle = {
  slug: string
  /** The topic it files under — `HelpTopic.slug` in each mode's config. */
  categorySlug: string
  title: string
  lead: string
  readMinutes: number
  /** ISO date. The route formats it, so the two modes cannot format it twice. */
  updatedAt: string
  sections: HelpArticleSection[]
  /**
   * Slugs of related articles, in the order the rail should list them. Left
   * empty, the route falls back to the rest of the same category — which is
   * what `HelpArticle.related`'s self-many-to-many will do once it is real.
   */
  related?: string[]
}

/**
 * Everything the template renders, resolved. The route builds this so the
 * component needs neither a database nor a mode: it is handed the article, the
 * links around it, and where "Help Center" points in *this* shell.
 */
export type HelpArticleView = {
  article: HelpArticle
  categoryTitle: string
  /** Already formatted — "12 Aug 2026" — see `formatArticleDate`. */
  updatedLabel: string
  related: HelpArticleLink[]
  /** This mode's help centre index, for the breadcrumb and the rail. */
  homeHref: string
  /** Builds a link to a sibling article in the same mode. */
  articleHref: (slug: string) => string
  supportEmail: string
}

/**
 * A section's anchor. Derived from the title rather than authored so a section
 * cannot be renamed without its rail link following — the same reason the rail
 * itself is derived.
 */
export function sectionId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** "12 Aug 2026", the export's own format. */
export function formatArticleDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

export const helpArticleCopy = {
  breadcrumbHome: "Help Center",
  onThisPage: "On this page",
  relatedArticles: "Related articles",
  readTime: (minutes: number) => `${minutes} min read`,
  updated: (label: string) => `Updated ${label}`,
  feedback: {
    title: "Was this article helpful?",
    description: "Your feedback helps us write better guides.",
    yes: "Yes",
    no: "No",
    /** Replaces the row once an answer is given — see the component's note. */
    thanks: "Thanks — that helps.",
  },
  support: {
    title: "Still need a hand?",
    description: "Support replies within one business day.",
    action: "Contact support",
    subject: "Help with a Lumen guide",
  },
} as const
