"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { FlameIcon, PlusIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import {
  PromotionDialog,
  type PromotionDialogValues,
} from "@/components/dashboard/admin/promotions/promotion-dialog"
import {
  createPromotion,
  endPromotion,
  setInstructorPromotionOptIn,
  updatePromotion,
  type PromotionInput,
} from "@/lib/actions/admin-promotions"
import {
  adminPromotionsCopy,
  participationPill,
  PARTICIPATION_PAGE_SIZE,
  promotionStatePill,
} from "@/lib/config/admin-promotions"
import type {
  ParticipationRow,
  PromotionCategory,
} from "@/lib/admin/promotions"
import { cn } from "@/lib/utils"

/**
 * `/dashboard/admin/promotions` above the history table, from
 * `ui-design/light/dashboard/admin/promotions-page__admin.png`: the title with
 * its **New promotion** button, one card per running sale, and the instructor
 * participation list.
 *
 * It is **one client component** because all three parts share the same
 * pending flag and the same dialog — the header's button and a card's *Edit*
 * open the identical editor — and because the `h1` lives in here for the
 * reason `categories-list.tsx` gives, that the export puts the page's primary
 * action in the title's own row. The history table below is a Server Component
 * passed in as `children`, so its markup never reaches the bundle; that is the
 * arrangement `community-page.tsx` uses for its stats row, pointed at the
 * bottom of the page instead of the top.
 *
 * Measured off the export at DPR 2 and verified against the render: the
 * console's usual 32px page inset, a 41px **New promotion** button on the
 * title's line, a promotion card on 26px horizontal / 24px vertical padding
 * with a 2px `--success` ring over a `--success/5` wash, a 40px green tile
 * 16px from a 20px/700 name, a 20px LIVE NOW pill, 36px card controls on a
 * 12px gap, four 69px stat tiles on a 16px gap 22px below the header row, then
 * 70px participation rows on a 14px gap with 18px of side padding, a 38px
 * avatar 16px from a 17px/700 name, and a 22px pill 16px from the 46 x 26
 * switch.
 *
 * Measure a card's edges **away from its corners**: at 12px of radius, a
 * column 4px inside the left edge reads the bottom of the box some 7px high,
 * which is enough to send a padding measurement 6px wrong in either
 * direction.
 *
 * Four things the export leaves for the data to settle:
 *
 *  - **The row's two figures are real, and only one of the export's four is.**
 *    Simon Simorangkir's "6 courses · 28,410 students" is exactly what the
 *    database holds; the other three rows are near-misses (it gives Marco
 *    48,300 students against 77,950, and Maya 41,044 against 40,744 — a
 *    transposition). Real rows win, the reading the categories page's
 *    percentages and the billing page's plan line both settled. "Courses"
 *    counts **published** courses, which is what makes Simon's figure land.
 *  - **The switch moves before the server answers.** `useOptimistic` is what
 *    makes that safe: a toggle that waited for a round trip would read as
 *    broken, and one that kept its own copy of the answer would drift from the
 *    row underneath it. The list is *not* dimmed while it saves — the switch
 *    is the progress indicator, which is the point `CLAUDE.md` makes about
 *    showing progress where the eye already is.
 *  - **A scheduled sale gets a card too.** The export draws one LIVE NOW sale
 *    because that is the state it was drawn in, but the dialog can set a
 *    future start, and a sale that appeared nowhere afterwards could not be
 *    found, edited or called off. Its pill says Scheduled and its destructive
 *    button says *Cancel sale*, because there is nothing yet to end.
 *  - **An empty state is invented**, since the export only draws a running
 *    sale. It is a card rather than a bare line, so the page keeps its shape
 *    on the day nothing is on offer; the action is already in the header, so
 *    it is not repeated inside.
 */

/**
 * A participation row with its avatar fallback already worked out.
 *
 * The initials come from `instructor-profiles.ts`' `initialsOf`, which skips a
 * leading title ("Dr. Elias Vance" -> "EV", not "DEV") — and that module is a
 * whole catalog of dummy profiles, so it is called on the **server** and only
 * the two letters cross. `lib/user.ts`' `initialsOf` is the wrong one here: it
 * splits on whitespace with no notion of a title, and this list has a "Dr." in
 * it.
 */
export type ParticipationCardRow = ParticipationRow & { initials: string }

/** One promotion card. Every string is formatted on the server — see the page. */
export type PromotionCardRow = {
  id: string
  name: string
  live: boolean
  /** "70% off · All categories · Ends 31 Aug 2026 · 12,840 redemptions" */
  meta: string
  redemptions: string
  revenue: string
  coursesIncluded: string
  coursesOptedOut: string
  /** What *Edit* seeds the dialog with. */
  form: PromotionDialogValues
}

function PromotionsBoard({
  active,
  participation,
  categories,
  page,
  pageCount,
  total,
  children,
}: {
  active: PromotionCardRow[]
  participation: ParticipationCardRow[]
  categories: PromotionCategory[]
  page: number
  pageCount: number
  total: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startSaving] = React.useTransition()

  // *What* is in flight, not merely that something is — the pattern
  // `reported-reviews-list.tsx` and `courses-list.tsx` both use, and for the
  // reason the latter spells out: one shared flag off `useTransition()` would
  // spin **every** card's End sale button whichever one was pressed, and would
  // spin them again while an unrelated participation switch saved. Only the
  // control that was actually used should show progress.
  const [busy, setBusy] = React.useState<
    | { kind: "submit" }
    | { kind: "end"; id: string }
    | { kind: "toggle"; id: string }
    | null
  >(null)

  const [dialog, setDialog] = React.useState<{
    mode: "create" | "edit"
    promotion: PromotionCardRow | null
  } | null>(null)

  // The switch's own state, applied over the server's rows and discarded when
  // the transition ends and fresh props arrive — see the component note.
  const [rows, applyToggle] = React.useOptimistic(
    participation,
    (current, update: { instructorId: string; participating: boolean }) =>
      current.map((row) =>
        row.instructorId === update.instructorId
          ? { ...row, participating: update.participating }
          : row
      )
  )

  const hrefFor = React.useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams)
      if (next <= 1) params.delete("page")
      else params.set("page", String(next))
      const search = params.toString()
      return search ? `${pathname}?${search}` : pathname
    },
    [pathname, searchParams]
  )

  function run(
    what: NonNullable<typeof busy>,
    action: () => Promise<{ ok: boolean; message: string }>,
    onDone?: () => void
  ) {
    setBusy(what)
    startSaving(async () => {
      const result = await action()
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      setBusy(null)
      if (result.ok) onDone?.()
    })
  }

  function submitPromotion(input: PromotionInput) {
    const target = dialog
    if (!target) return
    run(
      { kind: "submit" },
      () =>
        target.mode === "edit" && target.promotion
          ? updatePromotion(target.promotion.id, input)
          : createPromotion(input),
      () => setDialog(null)
    )
  }

  function toggleParticipation(
    row: ParticipationCardRow,
    participating: boolean
  ) {
    setBusy({ kind: "toggle", id: row.instructorId })
    startSaving(async () => {
      applyToggle({ instructorId: row.instructorId, participating })
      const result = await setInstructorPromotionOptIn(
        row.instructorId,
        participating
      )
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      setBusy(null)
    })
  }

  const from = (page - 1) * PARTICIPATION_PAGE_SIZE + 1

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* `font-bold` explicitly: `globals.css` sets every `h1` to 800 and
              the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
          <h1 className="text-[32px] leading-none font-bold">
            {adminPromotionsCopy.title}
          </h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {adminPromotionsCopy.description}
          </p>
        </div>
        <Button
          onClick={() => setDialog({ mode: "create", promotion: null })}
          className="h-10 gap-2 px-4"
        >
          <PlusIcon className="size-4" />
          {adminPromotionsCopy.newPromotion}
        </Button>
      </div>

      {active.length === 0 ? (
        <Card className="mt-5 items-center gap-3 px-6 py-16 text-center ring-border">
          <p className="text-base font-bold">
            {adminPromotionsCopy.activeEmptyTitle}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {adminPromotionsCopy.activeEmptyDescription}
          </p>
        </Card>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {active.map((promotion) => {
            const pill = promotionStatePill(promotion.live)
            return (
              <Card
                key={promotion.id}
                // `ring-2 ring-success` is the export's own 2px green edge.
                // The wash goes on an inner box rather than the card: `Card`
                // carries `bg-card`, and a `bg-success/5` on the same element
                // would *replace* it and composite the tint over the page
                // colour instead of over white — three shades too dark.
                className="ring-2 ring-success [--card-spacing:0px]"
              >
                <div className="bg-success/5 px-6.5 py-6">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-success">
                      <FlameIcon
                        aria-hidden
                        className="size-5 text-white"
                        strokeWidth={2}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* `leading-6` over `leading-5` with no margin between
                          them: measured, the export's two cap lines sit 24px
                          apart and the block is 44px, which is what sets the
                          header row's height — the 40px tile centres inside
                          it. Pinning the leadings is the note
                          `learning-stat-card.tsx` spells out; at the default
                          ones this block is 57px and the card grows past what
                          is drawn. */}
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="truncate text-xl leading-6 font-bold">
                          {promotion.name}
                        </h2>
                        <span
                          className={cn(
                            "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-[0.06em] uppercase",
                            pill.className
                          )}
                        >
                          {pill.label}
                        </span>
                      </div>
                      <p className="truncate text-[15px] leading-5 text-muted-foreground">
                        {promotion.meta}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setDialog({ mode: "edit", promotion })}
                        className="h-9 bg-card px-4 shadow-sm"
                      >
                        {adminPromotionsCopy.edit}
                      </Button>
                      <Button
                        variant="outline"
                        loading={
                          busy?.kind === "end" && busy.id === promotion.id
                        }
                        onClick={() =>
                          run({ kind: "end", id: promotion.id }, () =>
                            endPromotion(promotion.id)
                          )
                        }
                        // Red *text* on a card-coloured surface, not a filled
                        // destructive button: the export draws the lighter
                        // weight, which is right for the one control here that
                        // cannot be undone. The `hover:` twin is spelled out so
                        // tailwind-merge drops the outline variant's own fill.
                        className="h-9 bg-card px-4 text-destructive shadow-sm hover:bg-destructive/10 hover:text-destructive"
                      >
                        {promotion.live
                          ? adminPromotionsCopy.endSale
                          : adminPromotionsCopy.cancelSale}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5.5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {(
                      [
                        [
                          promotion.redemptions,
                          adminPromotionsCopy.heroStats.redemptions,
                        ],
                        [
                          promotion.revenue,
                          adminPromotionsCopy.heroStats.revenue,
                        ],
                        [
                          promotion.coursesIncluded,
                          adminPromotionsCopy.heroStats.included,
                        ],
                        [
                          promotion.coursesOptedOut,
                          adminPromotionsCopy.heroStats.optedOut,
                        ],
                      ] as const
                    ).map(([value, label]) => (
                      // `p-4.5 py-3.5` with the shorthand in front: `Card`
                      // sets `py-(--card-spacing)`, and `p-*` is the one thing
                      // tailwind-merge reliably drops that against — the note
                      // `admin-count-card.tsx` records.
                      <Card key={label} className="p-4.5 py-3.5 ring-border">
                        {/* The two lines are **wrapped**, not siblings of the
                            `Card`: `Card` carries `gap-(--card-spacing)`, and
                            `p-*` overrides its padding without touching that
                            — which put a stray 16px between the figure and its
                            label and rendered the tile 86px against the drawn
                            69. One child, no gap. `admin-count-card.tsx`
                            wraps its own pair for the same reason. */}
                        <div>
                          <p className="text-[21px] leading-6 font-extrabold tracking-[-0.02em] tabular-nums">
                            {value}
                          </p>
                          <p className="text-[15px] leading-4 text-muted-foreground">
                            {label}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <h2 className="mt-7 text-xl font-bold">
        {adminPromotionsCopy.participationHeading}
      </h2>
      <p className="mt-0.5 text-[15px] text-muted-foreground">
        {adminPromotionsCopy.participationLead}
      </p>

      {rows.length === 0 ? (
        <Card className="mt-4 items-center gap-3 px-6 py-16 text-center ring-border">
          <p className="text-base font-bold">
            {adminPromotionsCopy.participationEmptyTitle}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {adminPromotionsCopy.participationEmptyDescription}
          </p>
        </Card>
      ) : (
        <div className="mt-4 flex flex-col gap-3.5">
          {rows.map((row) => {
            const pill = participationPill(row.participating)
            const switchId = `participation-${row.instructorId}`
            return (
              <Card
                key={row.instructorId}
                className="ring-border [--card-spacing:0px]"
              >
                <div className="flex min-h-[70px] flex-wrap items-center gap-x-4 gap-y-3 px-4.5 py-3">
                  <Avatar className="size-9.5 shrink-0">
                    <AvatarImage
                      src={row.imageUrl ?? undefined}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="bg-hover text-xs font-semibold text-foreground">
                      {row.initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] leading-5 font-bold">
                      {row.name}
                    </p>
                    <p className="truncate text-[15px] leading-5 text-muted-foreground tabular-nums">
                      {adminPromotionsCopy.courses(row.courseCount)} ·{" "}
                      {adminPromotionsCopy.students(row.studentsCount)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    {/* The pill is a label for the switch beside it, so it is
                        tied to it rather than announced as a second control —
                        the switch's own state is what a reader needs. */}
                    <label
                      htmlFor={switchId}
                      className={cn(
                        "inline-flex cursor-pointer rounded-full px-2.5 py-0.5 text-[13px] font-medium",
                        pill.className
                      )}
                    >
                      {pill.label}
                    </label>
                    <Switch
                      id={switchId}
                      checked={row.participating}
                      // Only the row in flight, never the list: `Switch`
                      // carries `data-disabled:opacity-50`, so a shared flag
                      // here would fade every switch on the page to half
                      // strength — the dimming this component's note
                      // disclaims. This still stops one row being flipped
                      // twice before the server answers.
                      disabled={
                        busy?.kind === "toggle" && busy.id === row.instructorId
                      }
                      onCheckedChange={(next) => toggleParticipation(row, next)}
                      aria-label={adminPromotionsCopy.participationToggleLabel(
                        row.name
                      )}
                      // `notifications-form.tsx`' 46 x 26 switch with a 20px
                      // thumb inset 3px, measured off this export too — not
                      // the generated 32 x 18.4.
                      className={cn(
                        "border-0 p-[3px] data-[size=default]:h-6.5 data-[size=default]:w-11.5",
                        "data-unchecked:bg-track dark:data-unchecked:bg-track",
                        "[&_[data-slot=switch-thumb]]:size-5",
                        "[&_[data-slot=switch-thumb]]:data-checked:translate-x-full"
                      )}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {pageCount > 1 ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[13px] text-muted-foreground">
            {adminPromotionsCopy.showing(from, from + rows.length - 1, total)}
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={hrefFor(page - 1)}
                  className={cn(
                    "bg-card",
                    page <= 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (entry) => (
                  <PaginationItem key={entry}>
                    <PaginationLink
                      href={hrefFor(entry)}
                      isActive={entry === page}
                      // `!` forces these: `isActive` uses the outline Button
                      // variant, whose `dark:bg-input/30` outranks a plain
                      // `bg-primary` on specificity in dark mode.
                      className={cn(
                        entry === page
                          ? "border-transparent! bg-primary! text-primary-foreground! hover:bg-primary/80! hover:text-white!"
                          : "bg-card"
                      )}
                    >
                      {entry}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  href={hrefFor(page + 1)}
                  className={cn(
                    "bg-card",
                    page >= pageCount && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}

      {children}

      <PromotionDialog
        open={dialog !== null}
        onOpenChange={(next) => {
          if (!next) setDialog(null)
        }}
        mode={dialog?.mode ?? "create"}
        targetId={dialog?.promotion?.id}
        values={dialog?.promotion?.form ?? null}
        categories={categories}
        pending={busy?.kind === "submit"}
        onSubmit={submitPromotion}
      />
    </>
  )
}

export { PromotionsBoard }
