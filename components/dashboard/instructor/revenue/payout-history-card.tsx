import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMoneyExact } from "@/components/dashboard/instructor/revenue/revenue-format"
import { payoutStatusBadge, revenueCopy } from "@/lib/config/instructor-revenue"
import type { PayoutRow } from "@/lib/instructor-revenue"
import { cn } from "@/lib/utils"

/**
 * "Payout history", from
 * `ui-design/light/dashboard/instructor/revenue-page.png` — every transfer
 * this instructor has been sent.
 *
 * Measured off that export at DPR 2: a **26px**-inset card, a 20px/700 title,
 * a 14px muted header row closed by a `--border` hairline, then **47.5px**
 * rows divided by `--border-subtle`, with the five columns at 0%, 18%, 38%,
 * 66% and 85% of the content width and a 45.5 x 20 status pill.
 *
 * Four things about it are decisions rather than markup:
 *
 *  - **The amounts always carry cents** ("$16,120.00") where every other
 *    figure on the page drops them when there are none. That is the export's
 *    own split and the right one: a headline is read at a glance, a
 *    disbursement is reconciled against a bank statement.
 *  - **A failed row says why, as the row's `title`.** `Payout.failureReason`
 *    is stored and is the only thing that turns "Failed" into something an
 *    instructor can act on; the export has no room to draw it, so it is a
 *    tooltip rather than a sixth column.
 *  - **The last row keeps its hairline**, which `TableBody`'s
 *    `[&_tr:last-child]:border-0` would remove and the export draws — put back
 *    on the `Table` rather than by re-declaring the arbitrary variant, which
 *    would only win on Tailwind's emission order. The trick
 *    `settings-billing.tsx` records.
 *  - **The method can be blank.** `Payout.payoutMethod` is `SetNull`, so a
 *    destination removed after the money went out leaves a real payout with no
 *    method to name; the cell draws an em dash rather than inventing one.
 */
function PayoutHistoryCard({ rows }: { rows: PayoutRow[] }) {
  return (
    <Card className="gap-0 overflow-hidden p-6.5 ring-border [--card-spacing:0px]">
      {/* `font-bold` explicitly, for the reason `CLAUDE.md` gives. */}
      <h2 className="text-xl leading-none font-bold">
        {revenueCopy.historyHeading}
      </h2>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {revenueCopy.historyEmpty}
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          {/* The repo's own `Table`, not a hand-rolled one: its container is
              what clips a wide table to the card. Rolled by hand the coupons
              table escaped its wrapper and gave the *page* a horizontal
              scrollbar at phone width — that file's note. */}
          <Table className="min-w-[760px] border-b border-border-subtle">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="h-[38px] w-[18%] px-0 text-[14px] font-normal text-muted-foreground">
                  {revenueCopy.columns.reference}
                </TableHead>
                <TableHead className="h-[38px] w-[20%] px-0 text-[14px] font-normal text-muted-foreground">
                  {revenueCopy.columns.date}
                </TableHead>
                <TableHead className="h-[38px] w-[28%] px-0 text-[14px] font-normal text-muted-foreground">
                  {revenueCopy.columns.method}
                </TableHead>
                <TableHead className="h-[38px] w-[19%] px-0 text-[14px] font-normal text-muted-foreground">
                  {revenueCopy.columns.amount}
                </TableHead>
                <TableHead className="h-[38px] px-0 text-[14px] font-normal text-muted-foreground">
                  {revenueCopy.columns.status}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const badge = payoutStatusBadge[row.status]
                return (
                  <TableRow
                    key={row.id}
                    className="border-border-subtle hover:bg-transparent"
                  >
                    <TableCell className="h-[47px] px-0 text-[15px]">
                      {row.reference}
                    </TableCell>
                    <TableCell className="h-[47px] px-0 text-[15px]">
                      {row.date}
                    </TableCell>
                    <TableCell className="h-[47px] px-0 text-[15px] text-muted-foreground">
                      {row.method ?? "—"}
                    </TableCell>
                    <TableCell className="h-[47px] px-0 text-[15px] font-semibold tabular-nums">
                      {formatMoneyExact(row.amountCents)}
                    </TableCell>
                    <TableCell className="h-[47px] px-0">
                      <span
                        title={row.failureReason ?? undefined}
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-[13px] leading-[16px] font-medium",
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}

export { PayoutHistoryCard }
