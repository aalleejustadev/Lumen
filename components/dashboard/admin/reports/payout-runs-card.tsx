"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PayoutRunDialog } from "@/components/dashboard/admin/reports/payout-run-dialog"
import type { PayoutRunRow } from "@/lib/admin/reports"
import {
  adminReportsCopy,
  payoutRunStatusLabel,
  payoutRunStatusStyles,
} from "@/lib/config/admin-reports"
import { cn } from "@/lib/utils"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})
const counts = new Intl.NumberFormat("en-US")
const longDate = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const headClass = "h-10 px-1 text-[13px] font-normal text-muted-foreground"

/**
 * "Instructor payout runs", from
 * `ui-design/light/dashboard/admin/reports-page__admin.png`.
 *
 * Measured off that export at DPR 2: a 24px-inset card, a 17px/700 heading
 * over a 13px muted line, a 40px header row and 60px body rows — the same row
 * height `top-courses-card.tsx` draws, which is what keeps the two admin
 * tables reading as one system.
 *
 * Client only for the dialog's open state. The rows themselves are rendered
 * from data the Server Component page read, so nothing about the table itself
 * is client-fetched; only a run's recipients are, and only once you open one.
 *
 * Two divergences from the export, both deliberate:
 *
 *  - **Rows are ordered most-recent-first.** Its own four are in no order at
 *    all (RUN-08, RUN-07, RUN-09, RUN-06) — see `getPayoutRuns`.
 *  - **`Table` carries the bottom border**, not `TableBody`: the export draws
 *    a divider under the final row, which `TableBody`'s
 *    `[&_tr:last-child]:border-0` removes, and re-declaring that arbitrary
 *    variant would only win on Tailwind's emission order. The same fix
 *    `billing-transactions.tsx` documents.
 */
function PayoutRunsCard({ runs }: { runs: PayoutRunRow[] }) {
  const [openRun, setOpenRun] = React.useState<PayoutRunRow | null>(null)

  return (
    <Card className="gap-0 px-6 ring-border [--card-spacing:--spacing(6)]">
      <h2 className="text-[17px] leading-none font-bold">
        {adminReportsCopy.payoutsHeading}
      </h2>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {adminReportsCopy.payoutsDescription}
      </p>

      {runs.length === 0 ? (
        <p className="py-14 text-center text-sm text-muted-foreground">
          {adminReportsCopy.payoutsEmpty}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table className="min-w-[720px] border-b border-border-subtle">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(headClass, "w-[20%]")}>Run</TableHead>
                <TableHead className={cn(headClass, "w-[20%]")}>Date</TableHead>
                <TableHead className={cn(headClass, "w-[18%]")}>
                  Recipients
                </TableHead>
                <TableHead className={cn(headClass, "w-[19%]")}>
                  Total
                </TableHead>
                <TableHead className={headClass}>Status</TableHead>
                {/* The View column has no heading in the export. */}
                <TableHead className={cn(headClass, "w-[92px]")}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id} className="hover:bg-transparent">
                  <TableCell className="h-15 px-1 text-[15px] font-semibold">
                    {run.reference}
                  </TableCell>
                  <TableCell className="h-15 px-1 text-[15px] text-muted-foreground">
                    {longDate.format(run.scheduledFor)}
                  </TableCell>
                  <TableCell className="h-15 px-1 text-[15px] text-muted-foreground tabular-nums">
                    {counts.format(run.recipientCount)}
                  </TableCell>
                  <TableCell className="h-15 px-1 text-[15px] font-semibold tabular-nums">
                    {money.format(run.totalCents / 100)}
                  </TableCell>
                  <TableCell className="h-15 px-1">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-[13px] font-medium",
                        payoutRunStatusStyles[run.status]
                      )}
                    >
                      {payoutRunStatusLabel(run.status, run.failedCount)}
                    </span>
                  </TableCell>
                  <TableCell className="h-15 px-1 text-right">
                    {/* A white surface control sitting on a card, so it takes
                        the "lifted" shadow the sale page's buttons use. */}
                    <Button
                      variant="outline"
                      onClick={() => setOpenRun(run)}
                      aria-label={`View ${run.reference}`}
                      className="h-9 bg-card px-4 text-sm shadow-sm"
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Keyed on the run so re-opening a different row remounts the dialog
          rather than showing the previous run's recipients while the new ones
          load. */}
      {openRun ? (
        <PayoutRunDialog
          key={openRun.id}
          run={openRun}
          open
          onOpenChange={(next) => {
            if (!next) setOpenRun(null)
          }}
        />
      ) : null}
    </Card>
  )
}

export { PayoutRunsCard }
