"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  DownloadIcon,
  SearchIcon,
  SendIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CourseFilter } from "@/components/dashboard/instructor/course-filter"
import { MessageAllDialog } from "@/components/dashboard/instructor/students/message-all-dialog"
import { StudentTableRow } from "@/components/dashboard/instructor/students/student-row"
import {
  exportStudentsCsv,
  messageAllStudents,
  openStudentConversation,
  type StudentsFilter,
} from "@/lib/actions/instructor-students"
import {
  isStudentsFiltered,
  STUDENTS_PAGE_SIZE,
  studentsCopy,
  studentTabs,
  type StudentTab,
} from "@/lib/config/instructor-students"
import type { StudentsPage } from "@/lib/instructor-students"
import { cn } from "@/lib/utils"

/** Every control on the filter row, measured off the export at 42px — the
 *  instructor shell's own vocabulary, set by `coupons-page__main.png`. */
const CONTROL = "h-[42px]"

/** How long typing settles before the URL changes. */
const SEARCH_DEBOUNCE_MS = 300

/**
 * `/dashboard/instructor/students`, from
 * `ui-design/light/dashboard/instructor/students-page.png`.
 *
 * Measured off that export at DPR 2 and verified against the render: the
 * instructor shell's usual 32px page inset over a full-width content column, a
 * header block **pixel-identical** to `coupons-page__main.png`'s (so it is that
 * page's, reused rather than re-measured) with **two** right-aligned buttons
 * instead of one, a four-up `CountCard` row of 80px tiles on a 16px gap, then a
 * **42px** segmented track (`--track`, `p-1`, 34px items) opposite a 42px
 * course filter and a **200 x 42** search field, and a zero-padding card whose
 * 43px header sits over 69px rows divided by `--border-subtle`.
 *
 * **The tabs, the course filter, the search and the page all live in the URL;
 * nothing else does.** All four change which rows exist, which happens in SQL —
 * the split `users-table.tsx` makes between its filters and its Columns menu —
 * and it buys the three things `audit-log-browser.tsx` records: a narrowed view
 * is a link you can paste, the back button walks the filters, and a reload
 * keeps them.
 *
 * **Progress is tracked per control, not per page.** `busy` is a
 * `{ kind, id }` descriptor rather than one bare `useTransition()` flag, so
 * messaging one student does not spin every other row's button and exporting
 * does not dim the dialog's submit — the rule `courses-list.tsx` states and
 * `promotions-board.tsx` follows. It is the mistake most likely to survive a
 * typecheck, a lint and a build, since none of them can see it.
 */
function StudentsBoard({
  page,
  children,
}: {
  page: StudentsPage
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isPending, startTransition] = React.useTransition()
  const [working, startWorking] = React.useTransition()
  const [busy, setBusy] = React.useState<
    | { kind: "message"; id: string }
    | { kind: "export" }
    | { kind: "all" }
    | null
  >(null)
  const [messageAllOpen, setMessageAllOpen] = React.useState(false)

  const push = React.useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams)
      for (const [key, next] of Object.entries(changes)) {
        if (next === null || next === "") params.delete(key)
        else params.set(key, next)
      }
      // Any filter change invalidates the page number — page 2 of one tab is
      // rarely page 2 of another.
      params.delete("page")
      const query = params.toString()
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        })
      })
    },
    [pathname, router, searchParams]
  )

  const hrefFor = React.useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams)
      if (next <= 1) params.delete("page")
      else params.set("page", String(next))
      const query = params.toString()
      return query ? `${pathname}?${query}` : pathname
    },
    [pathname, searchParams]
  )

  // The search field resets from the URL by adjusting state during render, not
  // in an effect — React's own "a prop changed, reset some state" pattern, and
  // the one the hooks lint rule accepts. Keying the component on the query
  // would work and would throw away focus mid-typing.
  const [value, setValue] = React.useState(page.query.query)
  const [lastQuery, setLastQuery] = React.useState(page.query.query)
  if (page.query.query !== lastQuery) {
    setLastQuery(page.query.query)
    setValue(page.query.query)
  }

  React.useEffect(() => {
    if (value === page.query.query) return
    const timer = setTimeout(
      () => push({ q: value || null }),
      SEARCH_DEBOUNCE_MS
    )
    return () => clearTimeout(timer)
  }, [value, page.query.query, push])

  /** The filter as the two whole-list actions receive it — the raw query
   *  string, which they re-parse rather than trust. */
  const filter: StudentsFilter = {
    tab: page.query.tab,
    ...(page.query.courseId ? { course: page.query.courseId } : {}),
    ...(page.query.query ? { q: page.query.query } : {}),
  }

  function message(enrollmentId: string) {
    setBusy({ kind: "message", id: enrollmentId })
    startWorking(async () => {
      const result = await openStudentConversation(enrollmentId)
      setBusy(null)
      if (!result.ok || !result.conversationId) {
        toast.add({ title: result.message, type: "error" })
        return
      }
      // The navigation is the feedback; a toast would land on a page that has
      // already moved on.
      router.push(`/dashboard/instructor/messages?c=${result.conversationId}`)
    })
  }

  function exportCsv() {
    setBusy({ kind: "export" })
    startWorking(async () => {
      const result = await exportStudentsCsv(filter)
      setBusy(null)
      if (!result.ok || !result.csv) {
        toast.add({ title: result.message, type: "error" })
        return
      }
      download(result.csv)
      toast.add({
        title: result.truncated
          ? studentsCopy.exportTruncated(result.rows ?? 0)
          : studentsCopy.exported(result.rows ?? 0),
        type: result.truncated ? "warning" : "success",
      })
    })
  }

  function sendToAll(body: string) {
    setBusy({ kind: "all" })
    startWorking(async () => {
      const result = await messageAllStudents(filter, body)
      setBusy(null)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) setMessageAllOpen(false)
    })
  }

  // Off the **page size**, not `rows.length`: the last page is short, so
  // multiplying by what it happens to hold made page 2 of 8 read "4–6".
  const from = page.total === 0 ? 0 : (page.page - 1) * STUDENTS_PAGE_SIZE + 1
  const to = from === 0 ? 0 : from + page.rows.length - 1
  const filtered = isStudentsFiltered(page.query)

  return (
    <>
      {/* Header ------------------------------------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* `font-bold` explicitly: `globals.css` sets every `h1` to 800 and
              the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
          <h1 className="text-[32px] leading-none font-bold">
            {studentsCopy.title}
          </h1>
          <p className="mt-2.5 text-[15px] text-muted-foreground">
            {studentsCopy.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            loading={busy?.kind === "export" && working}
            disabled={page.total === 0}
            onClick={exportCsv}
            className="h-10 gap-2 bg-card px-4 shadow-sm"
          >
            <DownloadIcon className="size-4" />
            {studentsCopy.exportCsv}
          </Button>
          <Button
            type="button"
            disabled={page.total === 0}
            onClick={() => setMessageAllOpen(true)}
            className="h-10 gap-2 px-4"
          >
            <SendIcon className="size-4" />
            {studentsCopy.messageAll}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>

      {/* Filter row -------------------------------------------------------- */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {/* `aria-pressed:hover:` rather than a plain `hover:`: both are single
            attribute selectors, so Tailwind's variant order — not source
            order — would decide which wins and could wash the dark pill out.
            The note `enrolled-courses-section.tsx` records. */}
        <ToggleGroup
          value={[page.query.tab]}
          onValueChange={(next: string[]) => {
            const chosen = next[0] as StudentTab | undefined
            if (!chosen || chosen === page.query.tab) return
            push({ tab: chosen === "all" ? null : chosen })
          }}
          aria-label="Filter students by progress"
          className={cn(CONTROL, "gap-0 rounded-lg bg-track p-1")}
        >
          {studentTabs.map((tab) => (
            <ToggleGroupItem
              key={tab.value}
              value={tab.value}
              size="lg"
              className="rounded-md px-4 text-muted-foreground aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
            >
              {tab.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <CourseFilter
            courses={page.courses}
            value={page.query.courseId}
            onValueChange={(courseId) => push({ course: courseId })}
            label={studentsCopy.allCourses}
            className={cn(CONTROL, "w-[190px] data-[size=default]:h-[42px]")}
          />

          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle-foreground" />
            {/* `dark:bg-card` repeats the variant `Input` carries
                (`dark:bg-input/30`, a `:is(.dark *)`-wrapped selector a plain
                override loses to) — the fix `settings-controls.ts` records. */}
            <Input
              type="search"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={studentsCopy.searchPlaceholder}
              aria-label={studentsCopy.searchPlaceholder}
              className={cn(
                CONTROL,
                "w-full rounded-lg bg-card pr-10 pl-[42px] text-[14px] sm:w-[200px] md:text-[14px] dark:bg-card"
              )}
            />
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              {isPending ? (
                <Spinner className="size-4 text-subtle-foreground" />
              ) : value ? (
                <button
                  type="button"
                  onClick={() => {
                    setValue("")
                    push({ q: null })
                  }}
                  aria-label="Clear search"
                  className="grid size-5 cursor-pointer place-items-center rounded-full text-subtle-foreground transition-colors hover:bg-hover hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Table ------------------------------------------------------------- */}
      {page.total === 0 && !filtered ? (
        <Card className="mt-4 p-0 ring-border [--card-spacing:0px]">
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>{studentsCopy.empty.title}</EmptyTitle>
              <EmptyDescription>
                {studentsCopy.empty.description}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <Card
          className={cn(
            "mt-4 overflow-hidden p-0 ring-border [--card-spacing:0px]",
            isPending && "opacity-60"
          )}
        >
          {/* The repo's own `Table`, not a hand-rolled one: its container is
              what actually clips a wide table to the card. Rolled by hand the
              coupons table escaped its `overflow-x-auto` wrapper and gave the
              *page* a horizontal scrollbar at phone width — that file's note. */}
          <Table className="min-w-[980px] border-b border-border-subtle">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                {["Student", "Course", "Progress", "Quiz", "Last active"].map(
                  (heading) => (
                    <TableHead
                      key={heading}
                      className="h-[43px] px-5 text-[13px] font-medium text-muted-foreground"
                    >
                      {heading}
                    </TableHead>
                  )
                )}
                <TableHead className="px-5">
                  <span className="sr-only">Message</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="px-5 py-10 text-center text-[14px] text-muted-foreground"
                  >
                    {studentsCopy.noMatches}
                  </TableCell>
                </TableRow>
              ) : (
                page.rows.map((row) => (
                  <StudentTableRow
                    key={row.id}
                    row={row}
                    busy={
                      working && busy?.kind === "message" && busy.id === row.id
                    }
                    onMessage={() => message(row.id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Footer ------------------------------------------------------------ */}
      {page.total > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[13px] text-muted-foreground">
            {studentsCopy.showing(from, to, page.total)}
          </p>
          {page.pageCount > 1 ? (
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent className="gap-2">
                <PaginationItem>
                  <PaginationPrevious
                    href={hrefFor(page.page - 1)}
                    aria-disabled={page.page <= 1}
                    className={cn(
                      "h-9",
                      page.page <= 1 && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
                {Array.from({ length: page.pageCount }, (_, index) => (
                  <PaginationItem key={index}>
                    {/* `bg-primary!` is the one case `!` is necessary here:
                        `isActive` makes `PaginationLink` use the outline
                        variant, whose `dark:bg-input/30` is a wrapped selector
                        that outranks a plain override regardless of source
                        order — the dark-mode trap `browse-courses.tsx`
                        records. */}
                    <PaginationLink
                      href={hrefFor(index + 1)}
                      isActive={index + 1 === page.page}
                      className={cn(
                        "size-9",
                        index + 1 === page.page &&
                          "bg-primary! text-primary-foreground!"
                      )}
                    >
                      {index + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href={hrefFor(page.page + 1)}
                    aria-disabled={page.page >= page.pageCount}
                    className={cn(
                      "h-9",
                      page.page >= page.pageCount &&
                        "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </div>
      ) : null}

      <MessageAllDialog
        open={messageAllOpen}
        onOpenChange={setMessageAllOpen}
        recipients={page.total}
        pending={working && busy?.kind === "all"}
        onSubmit={sendToAll}
      />
    </>
  )
}

/** A client-side Blob download of rows the server just handed back — the same
 *  arrangement `audit-export-button.tsx` uses, and the reason the action
 *  returns a string rather than streaming a file. */
function download(csv: string) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export { StudentsBoard }
