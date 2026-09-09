"use client"

import * as React from "react"
import { DownloadIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { loadPayoutRun } from "@/lib/actions/admin-reports"
import type { PayoutRunDetail, PayoutRunRow } from "@/lib/admin/reports"
import {
  adminReportsCopy,
  payoutMethodLine,
  payoutRunStatusLabel,
  payoutRunStatusStyles,
  payoutStatusLabels,
  payoutStatusStyles,
} from "@/lib/config/admin-reports"
import { initialsOf } from "@/lib/user"
import { cn } from "@/lib/utils"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})
const counts = new Intl.NumberFormat("en-US")
const longDate = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

/** One CSV cell, quoted so a name containing a comma can't split the row. */
function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`
}

/**
 * The run detail dialog from
 * `ui-design/light/dashboard/admin/payout-run__dialog_admin.png`: the
 * reference with its status pill, a disbursed/recipients/average tile row, the
 * recipient list, and Export CSV / Close.
 *
 * Measured off that export at DPR 2: a 618px panel on 32px padding, 22px/700
 * reference over a 14px muted line, three tinted tiles on a 12px gap, and 68px
 * recipient rows also on 12px.
 *
 * **Recipients are fetched when the dialog opens**, not shipped with the
 * table — see `loadPayoutRun`. That makes the first frame a spinner, which is
 * the honest state; the export only draws a loaded run.
 *
 * The recipient list scrolls rather than growing the dialog: the export shows
 * four rows for a run whose own header says 3,410, so a fixed viewport with a
 * scroll is what it is actually drawing.
 */
function PayoutRunDialog({
  run,
  open,
  onOpenChange,
}: {
  run: PayoutRunRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [detail, setDetail] = React.useState<PayoutRunDetail | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // One fetch per mount. `PayoutRunsCard` renders this only while a run is
  // open and keys it on that run's id, so opening a different row remounts
  // rather than reusing this instance — which is what lets the effect leave
  // `detail`/`error` at their initial values instead of resetting them
  // synchronously on the way in (a setState in an effect body, which the React
  // hooks lint rule rightly rejects).
  React.useEffect(() => {
    let active = true
    loadPayoutRun(run.id).then((result) => {
      if (!active) return
      if (result.ok) setDetail(result.run)
      else setError(result.message)
    })
    return () => {
      active = false
    }
  }, [run.id])

  function exportCsv() {
    if (!detail) return

    const rows = [
      ["Instructor", "Destination", "Amount", "Status"],
      ...detail.recipients.map((recipient) => [
        recipient.name,
        payoutMethodLine(recipient) ?? "",
        (recipient.amountCents / 100).toFixed(2),
        payoutStatusLabels[recipient.status],
      ]),
    ]

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n")
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    )
    const link = document.createElement("a")
    link.href = url
    link.download = `${run.reference}-recipients.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const scheduled = run.status === "SCHEDULED"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-8 sm:max-w-[618px]">
        <DialogHeader className="gap-0">
          <DialogTitle className="flex flex-wrap items-center gap-3 text-[22px] font-bold">
            {run.reference}
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[13px] font-medium",
                payoutRunStatusStyles[run.status]
              )}
            >
              {payoutRunStatusLabel(run.status, run.failedCount)}
            </span>
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm">
            {scheduled ? "Scheduled for" : "Disbursed"}{" "}
            {longDate.format(run.scheduledFor)} ·{" "}
            {counts.format(run.recipientCount)}{" "}
            {run.recipientCount === 1 ? "instructor" : "instructors"}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            {
              label: "Total disbursed",
              value: money.format(run.totalCents / 100),
            },
            { label: "Recipients", value: counts.format(run.recipientCount) },
            {
              label: "Average payout",
              value:
                detail?.averageCents != null
                  ? money.format(detail.averageCents / 100)
                  : "—",
            },
          ].map((tile) => (
            <div key={tile.label} className="rounded-xl bg-soft px-4 py-3.5">
              <p className="text-lg leading-tight font-bold tabular-nums">
                {tile.value}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {tile.label}
              </p>
            </div>
          ))}
        </div>

        <h3 className="mt-6 mb-3 text-base font-bold">Recipients</h3>

        <div className="flex max-h-[296px] flex-col gap-3 overflow-y-auto">
          {error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : !detail ? (
            <div className="grid place-items-center py-12">
              <Spinner className="size-5 text-muted-foreground" />
            </div>
          ) : detail.recipients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {scheduled
                ? adminReportsCopy.recipientsPending
                : adminReportsCopy.recipientsEmpty}
            </p>
          ) : (
            detail.recipients.map((recipient) => {
              const line = payoutMethodLine(recipient)
              return (
                <div
                  key={recipient.id}
                  className="flex items-center gap-3.5 rounded-xl bg-soft px-4 py-3"
                >
                  <Avatar className="size-9.5">
                    <AvatarImage
                      src={recipient.imageUrl ?? undefined}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="bg-hover text-xs font-semibold text-foreground">
                      {initialsOf(recipient.name, "")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">
                      {recipient.name}
                    </span>
                    {line ? (
                      <span className="truncate text-[13px] text-muted-foreground">
                        {line}
                      </span>
                    ) : null}
                  </div>

                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                    {money.format(recipient.amountCents / 100)}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[13px] font-medium",
                      payoutStatusStyles[recipient.status]
                    )}
                  >
                    {payoutStatusLabels[recipient.status]}
                  </span>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter className="mt-7 sm:justify-start">
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={!detail || detail.recipients.length === 0}
            className="h-10 gap-2 bg-card shadow-sm"
          >
            <DownloadIcon className="size-4" />
            Export CSV
          </Button>
          <DialogClose
            render={
              <Button className="h-10 px-6 focus-visible:ring-3 focus-visible:ring-ring/50">
                Close
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { PayoutRunDialog }
