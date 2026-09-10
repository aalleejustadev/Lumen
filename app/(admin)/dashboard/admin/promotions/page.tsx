import type { Metadata } from "next"

import { PromotionsPage } from "@/components/dashboard/admin/promotions/promotions-page"
import { parsePromotionsQuery } from "@/lib/admin/promotions"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Promotions · ${siteConfig.name}`,
}

/**
 * The console's platform-wide sales. The role guard lives in
 * `app/(admin)/layout.tsx`, which covers every route in this group.
 *
 * The instructor participation list's page number is read from the URL — see
 * `lib/admin/promotions.ts` — so this page re-renders on the server for each
 * one, and `parsePromotionsQuery` is what stops a hand-edited query string
 * reaching Prisma.
 */
export default async function AdminPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <PromotionsPage query={parsePromotionsQuery(params)} />
}
