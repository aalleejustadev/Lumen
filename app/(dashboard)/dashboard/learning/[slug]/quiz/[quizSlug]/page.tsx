import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { QuizPage } from "@/components/dashboard/learning/quiz/quiz-page"
import { getCourseQuiz } from "@/lib/config/course-player"
import { siteConfig } from "@/lib/config/site"

type QuizParams = Promise<{ slug: string; quizSlug: string }>

export async function generateMetadata({
  params,
}: {
  params: QuizParams
}): Promise<Metadata> {
  const { slug, quizSlug } = await params
  const found = getCourseQuiz(slug, quizSlug)
  return {
    title: found
      ? `${found.quiz.title} · ${found.course.title} · ${siteConfig.name}`
      : siteConfig.name,
  }
}

/**
 * A course quiz, built against
 * `ui-design/light/dashboard/student/quiz-page.png`. Reached from the quiz
 * rows in the enrolled course page's "Course Completion" accordion; reads
 * `lib/config/course-player.ts` like the rest of that surface.
 *
 * No enrolment check yet, for the same reason the course page has none — the
 * gate lands with the `Enrollment` model.
 */
export default async function CourseQuizPage({ params }: { params: QuizParams }) {
  const { slug, quizSlug } = await params
  const found = getCourseQuiz(slug, quizSlug)
  if (!found) notFound()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <QuizPage quiz={found.quiz} courseSlug={slug} />
    </main>
  )
}
