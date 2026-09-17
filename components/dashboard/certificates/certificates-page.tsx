import { AwardIcon, ClockIcon, FlameIcon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { CertificateCard } from "@/components/dashboard/certificates/certificate-card"
import { CertificatesPager } from "@/components/dashboard/certificates/certificates-pager"
import { CountCard } from "@/components/dashboard/count-card"
import {
  CERTIFICATES_PAGE_SIZE,
  certificateStats,
  certificatesCopy,
} from "@/lib/config/certificates"
import type { CertificatesPage as CertificatesPageData } from "@/lib/certificates"

/**
 * `/dashboard/certificates`, from
 * `ui-design/light/dashboard/student/certificates-page.png`.
 *
 * A **Server Component all the way down except each card's two buttons**,
 * which is further than any other paginated page in this app manages — and it
 * is the pager that makes it possible. Every other list here drives its page
 * number through `router.replace` from a client board because it also owns
 * tabs, a search or a filter; this page has none of those, so the pager can be
 * plain `<a href="?page=2">` links and nothing above the buttons needs the
 * client at all.
 *
 * Measured off that export at DPR 2: the dashboard's usual page inset, a
 * header block **pixel-identical** to the instructor pages' (so it is that
 * header, reused rather than re-measured), a three-up `CountCard` row on an
 * **18px** gap — 80px cards with a 44px tinted tile, which is exactly what
 * `users-page__admin.png` and `coupons-page__main.png` draw — then a two-up
 * grid of **730px** cards on an 18px gap, 24px below.
 *
 * **`CountCard` rather than `StatCard`**: this export draws the figure *above*
 * its label beside a 44px tile and no delta, which is the count tile's
 * anatomy, not the 34px-tile-with-a-delta one the Analytics and Revenue pages
 * use. Measured, its cards are the same 80px on the same 20px inset.
 */
function CertificatesPage({ page }: { page: CertificatesPageData }) {
  const from =
    page.total === 0 ? 0 : (page.page - 1) * CERTIFICATES_PAGE_SIZE + 1
  const to = from === 0 ? 0 : from + page.rows.length - 1

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="min-w-0">
        {/* `font-bold` explicitly: `globals.css` sets every `h1` to 800 and
            the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
        <h1 className="text-[32px] leading-none font-bold">
          {certificatesCopy.title}
        </h1>
        <p className="mt-2.5 text-[15px] text-muted-foreground">
          {certificatesCopy.description}
        </p>
      </div>

      <div className="mt-6 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        <CountCard
          icon={AwardIcon}
          value={page.stats.earned.toLocaleString("en-US")}
          label={certificateStats.earned}
        />
        <CountCard
          icon={ClockIcon}
          value={page.stats.hours.toLocaleString("en-US")}
          label={certificateStats.hours}
        />
        {/* "46d" — the export's own spelling, and the reason this tile takes a
            string: a streak is a duration, not a count, and "46" alone beside
            "Longest Streak" would read as a tally of streaks. */}
        <CountCard
          icon={FlameIcon}
          value={`${page.stats.streakDays}d`}
          label={certificateStats.streak}
        />
      </div>

      {page.total === 0 ? (
        <Empty className="mt-6 rounded-xl bg-card py-16 ring-1 ring-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AwardIcon />
            </EmptyMedia>
            <EmptyTitle>{certificatesCopy.empty.title}</EmptyTitle>
            <EmptyDescription>
              {certificatesCopy.empty.description}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="mt-6 grid gap-[18px] xl:grid-cols-2">
            {page.rows.map((row) => (
              <CertificateCard key={row.id} row={row} />
            ))}
          </div>

          <CertificatesPager
            from={from}
            to={to}
            total={page.total}
            page={page.page}
            pageCount={page.pageCount}
            basePath="/dashboard/certificates"
          />
        </>
      )}
    </main>
  )
}

export { CertificatesPage }
