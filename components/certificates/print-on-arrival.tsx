"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PRINT_PARAM, verificationCopy } from "@/lib/config/certificates"

/**
 * The **Download PDF** button on the public verification page, and the one
 * thing on that page that needs the client.
 *
 * It opens the browser's print dialog, which is where "Save as PDF" lives.
 * `Certificate.pdfStorageKey` is the eventual home for a generated file
 * ("rendered once on issue rather than on every download", per its own
 * docstring) and nothing writes one yet; when something does, this button
 * becomes a link to that object and the page around it does not change.
 *
 * **It also prints once on arrival when `?print=1` is present**, which is what
 * the card's PDF button appends. The flag exists so the *shared* link — the
 * same URL, without it — opens quietly: somebody checking a credential wants
 * to read it, not to be ambushed by a print dialog. `useSearchParams` is why
 * the route wraps this in `<Suspense>`; without one it would opt the whole
 * page into client-side rendering, the trap `navigation-progress.tsx`
 * records.
 *
 * The effect guards on a ref rather than on the dependency array alone: React
 * runs effects twice in development's strict mode, and two print dialogs is a
 * bug somebody would file.
 */
function PrintOnArrival() {
  const searchParams = useSearchParams()
  const wanted = searchParams.get(PRINT_PARAM) === "1"
  const printed = React.useRef(false)

  React.useEffect(() => {
    if (!wanted || printed.current) return
    printed.current = true
    // A frame's delay, so the fonts and the artwork above are painted into the
    // dialog's preview rather than caught mid-load.
    const timer = setTimeout(() => window.print(), 400)
    return () => clearTimeout(timer)
  }, [wanted])

  return (
    <div className="print:hidden">
      <Button
        type="button"
        onClick={() => window.print()}
        className="h-11 gap-2 px-5"
      >
        <PrinterIcon className="size-4" />
        {verificationCopy.print}
      </Button>
      <p className="mt-2.5 text-[13px] text-muted-foreground">
        {verificationCopy.printHint}
      </p>
    </div>
  )
}

export { PrintOnArrival }
