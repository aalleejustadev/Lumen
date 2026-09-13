import Link from "next/link"
import { MessagesSquareIcon, SendIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { instructorHelpCopy } from "@/lib/config/instructor-help"
import { instructorNav } from "@/lib/config/instructor-nav"

/**
 * The two cards at the foot of the page: "Still stuck?" over a filled
 * `Contact support`, and "Ask the community" over an outlined
 * `Open Discussions`.
 *
 * Measured off the export at DPR 2: two 490px cards on a 16px gap, **24px**
 * padding (the topic cards above use 22 — the export differs by 2px between
 * the two blocks), a 16px/700 title, a 14px muted line, and 40px buttons at
 * the app's usual control height.
 *
 * `Open Discussions` is drawn enabled and rendered **disabled**, because
 * `/dashboard/instructor/discussions` does not exist yet — a primary action
 * onto a 404 is the thing every unbuilt row in this app already refuses to be.
 * The flag is read off `instructorNav` rather than written down a second time,
 * so the button lights up on its own the day that row flips to `built: true`
 * and the two can never disagree about whether the page is there.
 */
const discussionsRow = instructorNav
  .flatMap((group) => group.items)
  .find((item) => item.href === "/dashboard/instructor/discussions")

function HelpContactCards({ supportEmail }: { supportEmail: string }) {
  const { support, community } = instructorHelpCopy
  const discussionsHref = discussionsRow?.href ?? "/dashboard/instructor"
  const discussionsBuilt = discussionsRow?.built ?? false
  const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(support.subject)}`

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-base leading-none">{support.title}</h3>
        <p className="mt-3.5 text-sm leading-5 text-muted-foreground">
          {support.description}
        </p>
        {/* A `mailto:`, for the reason `user-row-actions.tsx` records — the
            models for a real conversation exist, a surface for one does not.
            The address is the platform's own configured `supportEmail`, not a
            string written into this page. */}
        <Button
          nativeButton={false}
          className="mt-4 h-10 gap-2 px-4.5 text-sm font-semibold"
          render={<a href={mailto} />}
        >
          <SendIcon className="size-4.5" />
          {support.action}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-base leading-none">{community.title}</h3>
        <p className="mt-3.5 text-sm leading-5 text-muted-foreground">
          {community.description}
        </p>
        {discussionsBuilt ? (
          <Button
            variant="outline"
            nativeButton={false}
            className="mt-4 h-10 gap-2 px-4.5 text-sm font-semibold"
            render={<Link href={discussionsHref} />}
          >
            <MessagesSquareIcon className="size-4.5" />
            {community.action}
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled
            title={community.unavailable}
            className="mt-4 h-10 gap-2 px-4.5 text-sm font-semibold"
          >
            <MessagesSquareIcon className="size-4.5" />
            {community.action}
          </Button>
        )}
      </div>
    </div>
  )
}

export { HelpContactCards }
