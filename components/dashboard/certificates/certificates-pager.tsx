"use client"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { certificatesCopy } from "@/lib/config/certificates"
import { cn } from "@/lib/utils"

/**
 * The footer line and the pager, from
 * `ui-design/light/dashboard/student/certificates-page.png`.
 *
 * **It is `"use client"` for a reason worth knowing: `Pagination` cannot be
 * rendered from a Server Component.** `components/ui/pagination.tsx` carries
 * no `"use client"` directive, so an RSC parent pulls it — and `Button`, and
 * Base UI's `useRender` underneath — into the *server* React runtime, where it
 * takes a different path: the server emitted `data-slot="button"` on the
 * anchor and dropped the chevron's props, where the client produced
 * `data-slot="pagination-link"` and a full `<svg>`. React reported it as a
 * hydration mismatch and regenerated the tree.
 *
 * Every other paginated page in this app renders its pager inside a client
 * board that also owns tabs or a search, so nothing had ever pointed an RSC at
 * it. This page has no filters — the pager is plain `<a href="?page=2">` links
 * and the rest of the page is happily server-rendered — which is exactly how
 * it surfaced. The fix is this boundary, not a change to the primitive: a
 * `"use client"` on the generated file would be reverted by
 * `npx shadcn@latest add pagination`.
 *
 * Nothing here is interactive; it is a boundary, not a behaviour. The links
 * still work with JavaScript off.
 */
function CertificatesPager({
  from,
  to,
  total,
  page,
  pageCount,
  basePath,
}: {
  from: number
  to: number
  total: number
  page: number
  pageCount: number
  /** The page's own path. **A string, not a `hrefFor` function** — a function
   *  cannot be serialized across the server→client boundary, and this
   *  component's parent is a Server Component; passing one throws *"Only plain
   *  objects can be passed to Client Components"* at request time, which
   *  builds, typechecks and lints cleanly. The trap `settings-nav-card.tsx`
   *  records about a nav item's `icon`. */
  basePath: string
}) {
  /** `?page=1` is dropped so the first page has one URL rather than two — the
   *  rule every paginated list here follows. */
  const hrefFor = (next: number) =>
    next <= 1 ? basePath : `${basePath}?page=${next}`

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
      <p className="text-[13px] text-muted-foreground">
        {certificatesCopy.showing(from, to, total)}
      </p>
      {pageCount > 1 ? (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent className="gap-2">
            <PaginationItem>
              <PaginationPrevious
                href={hrefFor(page - 1)}
                aria-disabled={page <= 1}
                className={cn(
                  "h-9",
                  page <= 1 && "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(pageCount, 6) }, (_, index) => (
              <PaginationItem key={index}>
                {/* `bg-primary!` is the one case `!` is necessary: `isActive`
                    makes `PaginationLink` use the outline variant, whose
                    `dark:bg-input/30` is a wrapped selector that outranks a
                    plain override regardless of source order — the dark-mode
                    trap `browse-courses.tsx` records. */}
                <PaginationLink
                  href={hrefFor(index + 1)}
                  isActive={index + 1 === page}
                  className={cn(
                    "size-9",
                    index + 1 === page && "bg-primary! text-primary-foreground!"
                  )}
                >
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href={hrefFor(page + 1)}
                aria-disabled={page >= pageCount}
                className={cn(
                  "h-9",
                  page >= pageCount && "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  )
}

export { CertificatesPager }
