import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { QaBoard } from "@/components/dashboard/instructor/qa/qa-board"
import { getQuestionsPage, parseQuestionsQuery } from "@/lib/qa"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Q&A · ${siteConfig.name}`,
}

/**
 * `/dashboard/instructor/qa`, from
 * `ui-design/light/dashboard/instructor/Q&A-page.png`. The sidebar has pointed
 * here since the shell was built; this is the route it was pointing at.
 *
 * **Q&A is not Discussions.** `CourseQuestion` is anchored to a *lesson* and
 * carries an answered state; `Discussion` is a community thread with neither.
 * The schema keeps them apart on purpose and so do these pages — the sidebar
 * has always listed both.
 *
 * The role guard lives in `app/(instructor)/layout.tsx`. Which questions are
 * *theirs* is narrower, and `lib/qa.ts` answers it with a `where` on
 * `Course.instructorId`.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = await getQuestionsPage(parseQuestionsQuery(params))
  if (!page) notFound()

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <QaBoard page={page} />
    </main>
  )
}
