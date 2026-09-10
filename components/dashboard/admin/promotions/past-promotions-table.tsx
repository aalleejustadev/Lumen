import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  compactMoney,
  discountLabel,
  formatCount,
  scopeLabel,
} from "@/components/dashboard/admin/promotions/promotions-format"
import { adminPromotionsCopy } from "@/lib/config/admin-promotions"
import type { PastPromotion } from "@/lib/admin/promotions"

/**
 * "Past promotions", the table at the foot of
 * `ui-design/light/dashboard/admin/promotions-page__admin.png`.
 *
 * A **Server Component**, handed to `promotions-board.tsx` as `children`: it
 * has no state and nothing on it is clickable, so rendering it inside the
 * client board would put a whole table's markup in the bundle for nothing —
 * the arrangement `community-stats.tsx` records, pointed at the bottom of the
 * page rather than the top.
 *
 * Measured off the export at DPR 2: full content width, a **43px** header over
 * **45px** rows on 20px cell padding, 13px muted column labels, 15px row text,
 * and column widths of 25.5 / 17.5 / 20.5 / 17.5 / 19 percent. Those rows are
 * markedly shorter than the console's other tables (Users and Moderators both
 * draw 60px) — this one is a ledger to scan rather than a list to act on, and
 * it carries no avatar, pill or control to set a taller floor.
 *
 * The widths are **set explicitly** rather than left to the table: all five
 * columns hold short strings, so sizing off content would put the export's
 * evenly spread headings wherever the longest cell happened to fall, and would
 * move them again the first time a promotion was given a longer name.
 *
 * Two things worth knowing:
 *
 *  - **Only Revenue is drawn at full strength.** The export mutes Discount,
 *    Scope and Redemptions and leaves the promotion's name and what it earned
 *    dark, which is the pair the row is read for.
 *  - **The rule under the final row is the export's**, and `TableBody`'s
 *    `[&_tr:last-child]:border-0` removes it. It is restored as a `border-b`
 *    on the `Table` rather than by re-declaring that arbitrary variant, which
 *    would only win on Tailwind's emission order — the fix
 *    `billing-transactions.tsx` documents for the same export quirk.
 */
function PastPromotionsTable({ rows }: { rows: PastPromotion[] }) {
  const columns = adminPromotionsCopy.pastColumns

  return (
    <>
      <h2 className="mt-7 text-xl font-bold">
        {adminPromotionsCopy.pastHeading}
      </h2>

      {rows.length === 0 ? (
        <Card className="mt-3 items-center gap-3 px-6 py-16 text-center ring-border">
          <p className="text-base font-bold">
            {adminPromotionsCopy.pastEmptyTitle}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {adminPromotionsCopy.pastEmptyDescription}
          </p>
        </Card>
      ) : (
        <Card className="mt-3 overflow-hidden ring-border [--card-spacing:0px]">
          <Table className="border-b">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[43px] w-[25.5%] px-5 text-[13px] font-medium text-muted-foreground">
                  {columns.promotion}
                </TableHead>
                <TableHead className="h-[43px] w-[17.5%] px-5 text-[13px] font-medium text-muted-foreground">
                  {columns.discount}
                </TableHead>
                <TableHead className="h-[43px] w-[20.5%] px-5 text-[13px] font-medium text-muted-foreground">
                  {columns.scope}
                </TableHead>
                <TableHead className="h-[43px] w-[17.5%] px-5 text-[13px] font-medium text-muted-foreground">
                  {columns.redemptions}
                </TableHead>
                <TableHead className="h-[43px] w-[19%] px-5 text-[13px] font-medium text-muted-foreground">
                  {columns.revenue}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  // `--border-subtle` because the export draws the header's
                  // rule at full strength and the row dividers a step lighter
                  // — the same pair `users-table.tsx` records.
                  className="border-border-subtle hover:bg-transparent"
                >
                  <TableCell className="h-[45px] px-5 text-[15px] font-semibold">
                    {row.name}
                  </TableCell>
                  <TableCell className="h-[45px] px-5 text-[15px] text-muted-foreground">
                    {discountLabel(row.discountType, row.value)}
                  </TableCell>
                  <TableCell className="h-[45px] px-5 text-[15px] text-muted-foreground">
                    {scopeLabel(row.scope, row.categoryNames)}
                  </TableCell>
                  <TableCell className="h-[45px] px-5 text-[15px] text-muted-foreground tabular-nums">
                    {formatCount(row.redemptionCount)}
                  </TableCell>
                  <TableCell className="h-[45px] px-5 text-[15px] font-bold tabular-nums">
                    {compactMoney(row.revenueCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  )
}

export { PastPromotionsTable }
