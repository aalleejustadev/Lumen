import { CouponsBoard } from "@/components/dashboard/instructor/coupons/coupons-board"
import { CouponsStats } from "@/components/dashboard/instructor/coupons/coupons-stats"
import type { CouponsPage as CouponsPageData } from "@/lib/instructor-coupons"

/**
 * `/dashboard/instructor/coupons`, from
 * `ui-design/light/dashboard/instructor/coupons-page__main.png`.
 *
 * Thin on purpose: the export puts **New coupon** in the title's row and that
 * button opens a dialog, so the header is client either way — the reason
 * `categories-list.tsx` is shaped like this. All this file does is keep the
 * four stat cards on the server and hand them down.
 *
 * The role guard lives in `app/(instructor)/layout.tsx`, which covers every
 * route in the group. Who may edit *which* coupon is a narrower question, and
 * `lib/actions/instructor-coupons.ts` answers it per write.
 */
function CouponsPage({
  page,
  revenueShareBps,
}: {
  page: CouponsPageData
  revenueShareBps: number
}) {
  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <CouponsBoard page={page} revenueShareBps={revenueShareBps}>
        <CouponsStats stats={page.stats} />
      </CouponsBoard>
    </main>
  )
}

export { CouponsPage }
