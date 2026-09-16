import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { QuestionThread } from "@/components/dashboard/instructor/qa/question-thread"
import { getQuestionDetail } from "@/lib/qa"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Question · ${siteConfig.name}`,
}

/**
 * One question, from
 * `ui-design/light/dashboard/instructor/Q&A-page__individual.png`.
 *
 * `getQuestionDetail` scopes the lookup by the reader's own courses, so a
 * question id from another instructor's cohort answers `notFound()` rather
 * than opening — the guard, not a check on a value from the client.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getQuestionDetail(id)
  if (!detail) notFound()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <QuestionThread detail={detail} />
    </main>
  )
}
