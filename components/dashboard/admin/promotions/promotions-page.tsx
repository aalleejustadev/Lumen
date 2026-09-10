import { PastPromotionsTable } from "@/components/dashboard/admin/promotions/past-promotions-table"
import {
  PromotionsBoard,
  type ParticipationCardRow,
  type PromotionCardRow,
} from "@/components/dashboard/admin/promotions/promotions-board"
import {
  compactMoney,
  discountLabel,
  formatCount,
  formatPromotionDay,
  scopeLabel,
  toDayValue,
} from "@/components/dashboard/admin/promotions/promotions-format"
import { initialsOf } from "@/lib/config/instructor-profiles"
import {
  getActivePromotions,
  getInstructorParticipation,
  getPastPromotions,
  getPromotionCategories,
  type ActivePromotion,
  type PromotionsQuery,
} from "@/lib/admin/promotions"

/**
 * `/dashboard/admin/promotions`, from
 * `ui-design/light/dashboard/admin/promotions-page__admin.png`.
 *
 * The reads happen here and the interactive half is `promotions-board.tsx`.
 * The history table is a Server Component passed to it **as `children`**: a
 * Server Component handed to a Client Component that way stays
 * server-rendered, which is what keeps a whole table's markup out of the
 * bundle even though the board around it is client. `community-page.tsx` does
 * the same with its stats row.
 *
 * **Every string the board draws is formatted here.** The dates are the reason:
 * `endsAt` is a timestamp, and formatting it in the browser's zone and again in
 * the server's can land on different days — the hydration mismatch
 * `audit-format.ts` records — so it crosses as text. The money and the counts
 * follow it rather than being formatted on both sides of the boundary for no
 * reason, which is the arrangement `courses-page.tsx` already has with its
 * "Submitted 2 days ago".
 *
 * The role guard lives in `app/(admin)/layout.tsx`, which covers every route
 * in the group.
 */

/**
 * The card's second line: "70% off · All categories · Ends 31 Aug 2026 ·
 * 12,840 redemptions", exactly the export's four clauses.
 *
 * A **scheduled** sale swaps the third clause for when it starts and drops the
 * fourth: it has redeemed nothing, and "0 redemptions" under a heading about a
 * sale that has not opened says less than nothing.
 */
function metaFor(promotion: ActivePromotion) {
  const parts = [
    discountLabel(promotion.discountType, promotion.value),
    scopeLabel(promotion.scope, promotion.categoryNames),
  ]
  if (promotion.state === "LIVE") {
    parts.push(`Ends ${formatPromotionDay(promotion.endsAt)}`)
    parts.push(
      `${formatCount(promotion.redemptionCount)} ${
        promotion.redemptionCount === 1 ? "redemption" : "redemptions"
      }`
    )
  } else {
    parts.push(`Starts ${formatPromotionDay(promotion.startsAt)}`)
    parts.push(`ends ${formatPromotionDay(promotion.endsAt)}`)
  }
  return parts.join(" · ")
}

async function PromotionsPage({ query }: { query: PromotionsQuery }) {
  const now = new Date()
  const [active, past, participation, categories] = await Promise.all([
    getActivePromotions(now),
    getPastPromotions(now),
    getInstructorParticipation(query),
    getPromotionCategories(),
  ])

  const cards: PromotionCardRow[] = active.map((promotion) => ({
    id: promotion.id,
    name: promotion.name,
    live: promotion.state === "LIVE",
    meta: metaFor(promotion),
    redemptions: formatCount(promotion.redemptionCount),
    revenue: compactMoney(promotion.revenueCents),
    coursesIncluded: formatCount(promotion.coursesIncluded),
    coursesOptedOut: formatCount(promotion.coursesOptedOut),
    form: {
      name: promotion.name,
      discountType: promotion.discountType,
      value: promotion.value,
      scope: promotion.scope,
      categoryIds: promotion.categoryIds,
      // A sale already under way has a real start date, so Edit shows it
      // rather than the "Immediately" placeholder — that word only ever means
      // "no start date has been chosen yet".
      startsOn: toDayValue(promotion.startsAt),
      endsOn: toDayValue(promotion.endsAt),
      forceOnAllCourses: promotion.forceOnAllCourses,
    },
  }))

  const rows: ParticipationCardRow[] = participation.rows.map((row) => ({
    ...row,
    initials: initialsOf(row.name),
  }))

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <PromotionsBoard
        active={cards}
        participation={rows}
        categories={categories}
        page={participation.page}
        pageCount={participation.pageCount}
        total={participation.total}
      >
        <PastPromotionsTable rows={past} />
      </PromotionsBoard>
    </main>
  )
}

export { PromotionsPage }
