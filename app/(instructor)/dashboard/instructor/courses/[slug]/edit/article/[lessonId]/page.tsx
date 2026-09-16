import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ArticleEditor } from "@/components/dashboard/instructor/courses/edit/article-editor"
import { siteConfig } from "@/lib/config/site"
import { getArticleForEditor } from "@/lib/instructor-course-edit"

type ArticleParams = Promise<{ slug: string; lessonId: string }>

export async function generateMetadata({
  params,
}: {
  params: ArticleParams
}): Promise<Metadata> {
  const { slug, lessonId } = await params
  const lesson = await getArticleForEditor(slug, lessonId)
  return {
    title: lesson
      ? `${lesson.title} · ${lesson.courseTitle} · ${siteConfig.name}`
      : siteConfig.name,
  }
}

/**
 * `/dashboard/instructor/courses/[slug]/edit/article/[lessonId]` — where the
 * curriculum's **Edit article** goes.
 *
 * A static `article` segment beside `edit/[step]`, which the App Router matches
 * first. `notFound()` covers "not your course", "no such lesson" and "not an
 * article" together, because the read scopes the lesson through a course this
 * instructor owns — the reasoning `edit/[step]/page.tsx` records.
 */
export default async function Page({ params }: { params: ArticleParams }) {
  const { slug, lessonId } = await params
  const lesson = await getArticleForEditor(slug, lessonId)
  if (!lesson) notFound()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <ArticleEditor lesson={lesson} />
    </main>
  )
}
