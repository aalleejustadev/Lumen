import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CertificatesPage } from "@/components/dashboard/certificates/certificates-page"
import { getCertificatesPage } from "@/lib/certificates"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Certificates · ${siteConfig.name}`,
}

/**
 * `/dashboard/certificates` — the signed-in learner's credentials.
 *
 * `notFound()` only when there is no session, which the group's own layout
 * already guards; a learner with no certificates gets the page and its empty
 * state, because "you have not finished a course yet" is a real answer rather
 * than a missing page.
 *
 * A hand-edited `?page=99` is clamped against the real page count in
 * `getCertificatesPage` rather than left to draw "Showing 393–392 of 6".
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.page) ? params.page[0] : params.page
  const parsed = Number(raw)
  const page = await getCertificatesPage(
    Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1
  )
  if (!page) notFound()

  return <CertificatesPage page={page} />
}
