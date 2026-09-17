"use client"

import * as React from "react"
import { DownloadIcon, Share2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { certificatesCopy, PRINT_PARAM } from "@/lib/config/certificates"

/**
 * The two controls in a certificate card's footer, from
 * `ui-design/light/dashboard/student/certificates-page.png` — a 38px square
 * white **Share** beside a 38px dark **PDF**.
 *
 * The only client component on the page, which is why it is its own file: the
 * cards, the stat row and the pager all stay on the server.
 *
 * **Share copies the verification link rather than navigating.** The
 * destination is the public page at `/certificates/[slug]` that
 * `Certificate.publicSlug`'s own docstring calls for, and the thing a learner
 * wants from a Share button on their own credential is the URL, not to be
 * taken to it. `navigator.share` is used where the browser has it — a phone
 * offering its own sheet is better than a toast — and the clipboard is the
 * fallback everywhere else. A share the person dismissed is not an error, so
 * `AbortError` is swallowed rather than toasted.
 *
 * **PDF opens that same page with `?print=1`**, which makes it open the
 * browser's print dialog once on arrival — where "Save as PDF" lives.
 * `Certificate.pdfStorageKey` is the eventual home for a real generated file
 * ("rendered once on issue rather than on every download", per its own note)
 * and nothing writes one yet; printing the credential is the honest version
 * until something does, and the button's destination does not change when it
 * lands. It is a plain link with `target="_blank"` rather than a click
 * handler, so it is middle-clickable and survives having JavaScript off.
 */
function CertificateActions({
  publicSlug,
  courseTitle,
}: {
  publicSlug: string
  courseTitle: string
}) {
  const [sharing, setSharing] = React.useState(false)
  const href = `/certificates/${publicSlug}`

  async function share() {
    // Built from `location` rather than a configured base URL: this runs in
    // the browser, so the origin the person is actually on is the one the link
    // has to carry.
    const url = new URL(href, window.location.origin).toString()
    setSharing(true)
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: courseTitle, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.add({ title: certificatesCopy.shareCopied, type: "success" })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      toast.add({ title: certificatesCopy.shareFailed, type: "error" })
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        loading={sharing}
        onClick={share}
        aria-label={certificatesCopy.share}
        title={certificatesCopy.share}
        className="size-[38px] bg-card shadow-sm"
      >
        <Share2Icon className="size-4" />
      </Button>
      {/* `nativeButton={false}` because Base UI asserts that a component acting
          as a button really is one — the console error `CLAUDE.md` records two
          of shipping. */}
      <Button
        nativeButton={false}
        render={
          <a
            href={`${href}?${PRINT_PARAM}=1`}
            target="_blank"
            rel="noopener noreferrer"
          />
        }
        className="h-[38px] gap-2 px-4"
      >
        <DownloadIcon className="size-4" />
        {certificatesCopy.pdf}
      </Button>
    </div>
  )
}

export { CertificateActions }
