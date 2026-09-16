import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { QuizEditor } from "@/components/dashboard/instructor/courses/edit/quiz-editor"
import { quizEditorCopy } from "@/lib/config/course-editor"
import { siteConfig } from "@/lib/config/site"
import { getQuizForEditor } from "@/lib/instructor-course-edit"

type QuizParams = Promise<{ slug: string; lessonId: string }>

export async function generateMetadata({
  params,
}: {
  params: QuizParams
}): Promise<Metadata> {
  const { slug, lessonId } = await params
  const lesson = await getQuizForEditor(slug, lessonId)
  return {
    title: lesson
      ? `${quizEditorCopy.title(lesson.title)} · ${lesson.courseTitle} · ${siteConfig.name}`
      : siteConfig.name,
  }
}

/**
 * `/dashboard/instructor/courses/[slug]/edit/quiz/[lessonId]` — where the
 * curriculum's **Edit quiz** goes. Drawn with the student quiz page's parts
 * (`quiz-page.png`); see `quiz-editor.tsx`.
 *
 * Scoped like the article editor beside it: a lesson from another instructor's
 * course, or one that is not a quiz, is simply not found.
 */
export default async function Page({ params }: { params: QuizParams }) {
  const { slug, lessonId } = await params
  const lesson = await getQuizForEditor(slug, lessonId)
  if (!lesson) notFound()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <QuizEditor lesson={lesson} />
    </main>
  )
}
