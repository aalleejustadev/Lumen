import { redirect } from "next/navigation"

import { editorStepHref, FIRST_STEP } from "@/lib/config/course-editor"

/**
 * `/edit` on its own goes to the first step, the way `/dashboard/settings`
 * redirects to `/profile` — the editor has no landing screen of its own and
 * both exports open on Intended learners.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(editorStepHref(slug, FIRST_STEP))
}
