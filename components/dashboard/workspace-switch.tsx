"use client"

import Link from "next/link"

import { RowTooltip } from "@/components/dashboard/sidebar-nav"
import { workspaceModes, type WorkspaceMode } from "@/lib/config/dashboard"
import { cn } from "@/lib/utils"

/**
 * The Student / Instructor switch under the logo, drawn by both
 * `dashboard-sidebar.png` and `instructor-dashboard-sidebar.png`. It lives
 * here rather than inside either sidebar for the reason `sidebar-nav.tsx`
 * gives about the rows: both shells render it, so a change to it has to land
 * on both at once.
 *
 * **It is navigation, not a tab.** Each half is a `Link` to that mode's own
 * landing page — `/dashboard` and `/dashboard/instructor` — and which half is
 * lit is decided by `mode`, a fact about the shell doing the rendering rather
 * than a piece of client state. That is what makes switching mode change
 * *everything*: a different route group, so a different layout, a different
 * sidebar, a different app bar, a different command palette, and — the part a
 * `useState` toggle could never do — a different server-side guard. See
 * `workspaceModes` and `app/(instructor)/layout.tsx`.
 *
 * Two controls, one visible at a time, as before. Expanded it is the segmented
 * pair; on the rail there is only room for one icon and the useful one is the
 * mode you are *not* in, which is what the export draws.
 *
 * `canTeach` is the same answer the instructor shell's guard acts on, passed
 * down from the layout — so the control and the guard cannot disagree about
 * who may teach. A learner without a teaching profile still *sees* the
 * Instructor half, drawn inert with a reason rather than hidden: hiding it
 * would leave a lone "Student" pill that reads as a rendering fault, and the
 * treatment matches the inert rows `NavRow` already draws for a destination
 * you cannot reach. It is not linked to the application flow because
 * `/teach` is not a built route.
 */
const LOCKED_REASON = "Instructor mode unlocks once you have a teaching profile"

function WorkspaceSwitch({
  mode,
  canTeach = false,
}: {
  /** Which workspace is being rendered — the shell knows, the URL says. */
  mode: WorkspaceMode
  canTeach?: boolean
}) {
  const other =
    workspaceModes.find((option) => option.value !== mode) ?? workspaceModes[1]
  const locked = (value: WorkspaceMode) => value === "instructor" && !canTeach

  return (
    <>
      {/* A `nav`, not a radiogroup: these are links to two pages, and
          `aria-current` is how a link says "you are here". A radio would
          promise a form control that commits a value. */}
      <nav
        aria-label="Workspace"
        className="mt-3.5 flex h-10 items-center rounded-full bg-track p-1 group-data-[collapsible=icon]:hidden"
      >
        {workspaceModes.map((option) => {
          const selected = mode === option.value
          const className = cn(
            "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors",
            selected
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )

          if (locked(option.value)) {
            return (
              <span
                key={option.value}
                aria-disabled="true"
                title={LOCKED_REASON}
                className={cn(className, "cursor-default opacity-60")}
              >
                <option.icon className="size-4" />
                {option.label}
              </span>
            )
          }

          return (
            <Link
              key={option.value}
              href={option.href}
              aria-current={selected ? "page" : undefined}
              className={cn(className, "cursor-pointer")}
            >
              <option.icon className="size-4" />
              {option.label}
            </Link>
          )
        })}
      </nav>

      {locked(other.value) ? (
        <RowTooltip label={LOCKED_REASON}>
          <span
            aria-disabled="true"
            title={LOCKED_REASON}
            className="mx-auto mt-3.5 hidden size-9 cursor-default items-center justify-center rounded-lg bg-card text-muted-foreground opacity-60 shadow-sm group-data-[collapsible=icon]:flex"
          >
            <other.icon className="size-4" />
          </span>
        </RowTooltip>
      ) : (
        <RowTooltip label={`Switch to ${other.label}`}>
          <Link
            href={other.href}
            aria-label={`Switch to ${other.label}`}
            className="mx-auto mt-3.5 hidden size-9 cursor-pointer items-center justify-center rounded-lg bg-card text-foreground shadow-sm transition-colors group-data-[collapsible=icon]:flex hover:bg-hover"
          >
            <other.icon className="size-4" />
          </Link>
        </RowTooltip>
      )}
    </>
  )
}

export { WorkspaceSwitch }
