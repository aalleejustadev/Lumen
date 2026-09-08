import { ReceiptTextIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { BillingTransaction } from "@/lib/billing"
import { cn } from "@/lib/utils"

/**
 * The "Transaction History" table, from
 * `ui-design/light/dashboard/student/settings-billing-page.png`.
 *
 * Real rows: these are the caller's own `order` records, not Stripe charges.
 * An order knows *which course* was bought — Stripe only knows the line-item
 * name we sent it — and it exists for abandoned checkouts too, which is what
 * makes the export's `pending` rows a real state rather than decoration.
 *
 * Measured off that export at DPR 2, relative to the card's 863px content box:
 * columns at 0 / 148 / 455 / 602 with Amount right-aligned to the edge, 4px of
 * cell padding, a 40px header row over a `--border` rule, and 50px body rows
 * divided by `--border-subtle`.
 *
 * Two notes on overriding the generated `Table`. The export draws a divider
 * under the *final* row, which `TableBody`'s `[&_tr:last-child]:border-0`
 * removes — so the last divider is drawn as a `border-b` on the **table**
 * instead. Re-declaring `[&_tr:last-child]:border-b` on `TableBody` also
 * renders, but only because Tailwind happens to emit `border-b` after
 * `border-0`: tailwind-merge keeps both (same arbitrary variant, and
 * `border-0` is a reset rather than the same utility), so it would be relying
 * on utility ordering to win. `TableRow`'s `hover:bg-muted/50` *is* safe to
 * drop with a `hover:bg-transparent` twin — same variant, same group — and it
 * needs dropping because these rows aren't interactive.
 */

const STATUS_STYLES: Record<BillingTransaction["status"], string> = {
  // `bg-*/10` + `text-*` on the semantic tokens rather than the export's
  // literal hexes, so dark mode follows. The export's amber sits between
  // `--warning` and `--star`; `--warning` is the semantic fit for "pending".
  PAID: "bg-success/10 text-success",
  PENDING: "bg-warning/10 text-warning",
  FAILED: "bg-destructive/10 text-destructive",
  EXPIRED: "bg-muted text-muted-foreground",
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function BillingTransactions({
  transactions,
}: {
  transactions: BillingTransaction[]
}) {
  return (
    <section>
      <h2 className="text-[17px] leading-snug font-bold">
        Transaction History
      </h2>

      {transactions.length === 0 ? (
        <Empty className="mt-2 border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptTextIcon />
            </EmptyMedia>
            <EmptyTitle>No transactions yet</EmptyTitle>
            <EmptyDescription>
              Course purchases show up here as soon as you buy one.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table className="mt-2 border-b border-border-subtle">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 w-[148px] px-1 text-[13px] font-normal text-muted-foreground">
                Reference
              </TableHead>
              <TableHead className="h-10 w-[307px] px-1 text-[13px] font-normal text-muted-foreground">
                Product
              </TableHead>
              <TableHead className="h-10 w-[147px] px-1 text-[13px] font-normal text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="h-10 w-[140px] px-1 text-[13px] font-normal text-muted-foreground">
                Date
              </TableHead>
              <TableHead className="h-10 px-1 text-right text-[13px] font-normal text-muted-foreground">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className="border-border-subtle hover:bg-transparent"
              >
                <TableCell className="h-[50px] px-1 text-muted-foreground">
                  {transaction.reference}
                </TableCell>
                <TableCell className="h-[50px] max-w-[307px] truncate px-1 font-medium">
                  {transaction.product}
                </TableCell>
                <TableCell className="h-[50px] px-1">
                  <Badge
                    className={cn("px-2.5", STATUS_STYLES[transaction.status])}
                  >
                    {transaction.status.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="h-[50px] px-1 text-muted-foreground">
                  {transaction.date.toLocaleDateString("en-US", {
                    month: "2-digit",
                    day: "2-digit",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="h-[50px] px-1 text-right font-semibold">
                  {money(transaction.amountCents, transaction.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

export { BillingTransactions }
