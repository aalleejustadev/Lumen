import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { HelpArticlePage } from "@/components/dashboard/help/help-article-page"
import { getPlatformSettings } from "@/lib/admin/settings"
import {
  formatArticleDate,
  type HelpArticleLink,
  type HelpArticleView,
} from "@/lib/config/help-article"
import {
  instructorHelpArticle,
  instructorHelpArticles,
} from "@/lib/config/instructor-help-articles"
import { helpTopics } from "@/lib/config/instructor-help"
import { siteConfig } from "@/lib/config/site"

/** Four, which is what the export's rail draws. */
const RELATED_LIMIT = 4

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const article = instructorHelpArticle((await params).slug)
  return {
    title: article
      ? `${article.title} · ${siteConfig.name}`
      : `Help Center · ${siteConfig.name}`,
  }
}

/**
 * `/dashboard/instructor/help/[slug]` — an instructor help article.
 *
 * The page is `components/dashboard/help/`, which is **shared with the student
 * help centre** and audience-agnostic; this route's whole job is to resolve
 * one `HelpArticleView` — the article, the words around it, and how links are
 * addressed *in this shell*. A student route is the same twenty lines over
 * `studentHelpArticles` and `/dashboard/help`, which is the point of building
 * it this way.
 *
 * `related` prefers the slugs the article names and falls back to the rest of
 * its own category, so an article can never render a rail with nothing in it.
 * That fallback is also what `HelpArticle.related` — a self-many-to-many —
 * will do once the table is real.
 *
 * `supportEmail` is the platform's configured address rather than a string in
 * the copy, the same reading the help centre index settled.
 *
 * The role guard lives in `app/(instructor)/layout.tsx`.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = instructorHelpArticle(slug)
  if (!article) notFound()

  const settings = await getPlatformSettings()
  const topic = helpTopics.find((entry) => entry.slug === article.categorySlug)

  const toLink = (entry: (typeof instructorHelpArticles)[number]) =>
    ({
      slug: entry.slug,
      title: entry.title,
      readMinutes: entry.readMinutes,
    }) satisfies HelpArticleLink

  const named = (article.related ?? [])
    .map((s) => instructorHelpArticles.find((entry) => entry.slug === s))
    .filter((entry) => entry !== undefined)
  const sameCategory = instructorHelpArticles.filter(
    (entry) =>
      entry.categorySlug === article.categorySlug && entry.slug !== article.slug
  )
  const related = [...named, ...sameCategory]
    .filter(
      (entry, index, all) =>
        entry.slug !== article.slug &&
        all.findIndex((other) => other.slug === entry.slug) === index
    )
    .slice(0, RELATED_LIMIT)
    .map(toLink)

  const view: HelpArticleView = {
    article,
    categoryTitle: topic?.title ?? "Help Center",
    updatedLabel: formatArticleDate(article.updatedAt),
    related,
    homeHref: "/dashboard/instructor/help",
    articleHref: (target) => `/dashboard/instructor/help/${target}`,
    supportEmail: settings.supportEmail,
  }

  return <HelpArticlePage view={view} />
}
