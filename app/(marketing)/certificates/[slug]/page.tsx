import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { CertificateVerification } from "@/components/certificates/certificate-verification"
import { getPublicCertificate } from "@/lib/certificates"
import { verificationCopy } from "@/lib/config/certificates"
import { siteConfig } from "@/lib/config/site"
import { AwardIcon } from "lucide-react"

/**
 * `/certificates/[slug]` — the public verification page a shared certificate
 * link opens, and the destination `Certificate.publicSlug` was added for.
 *
 * It sits in `app/(marketing)/` rather than the dashboard's group **because it
 * must work signed out**: an employer following the link has no Lumen account,
 * and a credential only its holder can check verifies nothing. That group's
 * layout also gives it the site header and footer, which is the right chrome
 * for a public brand surface. A route group contributes nothing to the path,
 * so the URL is the plain `/certificates/<slug>` the Share button copies.
 *
 * **A bad slug renders a page rather than a 404.** Somebody arriving here has
 * been handed a link by a candidate, and "that link does not match a
 * credential we issued" is the answer they need — a blank 404 leaves them
 * unsure whether the certificate is fake or the site is broken. The two cases
 * are indistinguishable from outside either way, which is the point.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const row = await getPublicCertificate(slug)
  if (!row) return { title: `Certificate · ${siteConfig.name}` }
  return {
    title: `${row.courseTitle} · ${row.holderName} · ${siteConfig.name}`,
    description: `${row.holderName} completed ${row.courseTitle} on ${row.issuedOn}.`,
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const row = await getPublicCertificate(slug)

  if (!row) {
    return (
      <main className="mx-auto w-full max-w-[880px] px-6 py-20">
        <Empty className="rounded-xl bg-card py-16 ring-1 ring-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AwardIcon />
            </EmptyMedia>
            <EmptyTitle>{verificationCopy.notFoundTitle}</EmptyTitle>
            <EmptyDescription>
              {verificationCopy.notFoundDescription}
            </EmptyDescription>
          </EmptyHeader>
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/courses" />}
            className="h-10 px-5"
          >
            {verificationCopy.browse}
          </Button>
        </Empty>
      </main>
    )
  }

  return <CertificateVerification row={row} />
}
