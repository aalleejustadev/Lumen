import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { QuizPage } from "@/components/dashboard/learning/quiz/quiz-page"
import { getEnrolledCourseQuiz } from "@/lib/course-player"
import { learningCourseHref } from "@/lib/course-return"
import { siteConfig } from "@/lib/config/site"

type QuizParams = Promise<{ slug: string; quizSlug: string }>

export async function generateMetadata({
  params,
}: {
  params: QuizParams
}): Promise<Metadata> {
  const { slug, quizSlug } = await params
  const found = await getEnrolledCourseQuiz(slug, quizSlug)
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
 * `lib/course-player.ts` like the course page above it, so a quiz row on a
 * database-only course opens instead of being a chevron onto a 404.
 *
 * No enrolment check yet, for the same reason the course page has none — the
 * gate lands with the `Enrollment` model.
 */
export default async function CourseQuizPage({
  params,
  searchParams,
}: {
  params: QuizParams
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug, quizSlug } = await params
  const found = await getEnrolledCourseQuiz(slug, quizSlug)
  if (!found) notFound()

  // A quiz is never a free preview, so on a database course only a viewer with
  // full access may take it — the page ships every question and its answer to
  // the browser. Anyone else goes to the course's sale page if it has one.
  if (found.course.access === "preview") {
    if (found.course.published) redirect(`/dashboard/courses/${slug}`)
    notFound()
  }

  // "Back to course" keeps whatever brought the visitor here, so an instructor
  // who opened a quiz from a preview lands back in the preview rather than in
  // the student shell. `lib/course-return.ts` owns the spelling, and nothing is
  // trusted from the URL: it only survives as a value that module recognises.
  const { via } = await searchParams
  const courseHref = learningCourseHref(
    slug,
    typeof via === "string" ? via : undefined
  )

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <QuizPage quiz={found.quiz} courseHref={courseHref} />
    </main>
  )
}
