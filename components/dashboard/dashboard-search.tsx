"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { SearchIcon, StarIcon } from "lucide-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { CourseFeedbackDialog } from "@/components/dashboard/learning/course/course-feedback-dialog"
import { browseCourses } from "@/lib/config/browse-courses"
import { adminCommandPaletteGroups } from "@/lib/config/admin-nav"
import { instructorCommandPaletteGroups } from "@/lib/config/instructor-nav"
import { commandPaletteGroups } from "@/lib/config/dashboard"

/**
 * The header's search. It looks like the input in the export, but it opens a
 * command palette — a field advertising ⌘K that did nothing on Enter would be
 * a promise the app can't keep yet. Course search joins the palette when the
 * catalog is wired to the database.
 *
 * Every group in `commandPaletteGroups` is a navigation. The one hand-written
 * group below is not: **"Rate this course" is a temporary way to look at
 * `course-feedback-dialog.tsx`**, which in the finished product prompts on its
 * own once a student is a few lessons in. That needs enrolment progress to be
 * real, so until then it hangs here. Delete this group — and the two pieces of
 * state and the `browseCourses` import feeding it — when the prompt becomes
 * automatic.
 *
 * `variant` picks which navigation the palette offers: the admin console and
 * the instructor workspace each get their own, since a palette that jumps to
 * My Learning from inside either one would quietly drop you back into the
 * student shell, and rating a course has nothing to do with either. It is a **string**, not the group list itself —
 * both headers are Server Components, and every item in those lists carries a
 * `LucideIcon`, which is a function and cannot cross the server-client
 * boundary. So the lists are picked here, inside the client module, exactly as
 * `instructor-profile-page.tsx` strips its icons for the same reason.
 */
function DashboardSearch({
  variant = "student",
}: {
  variant?: "student" | "admin" | "instructor"
} = {}) {
  const groups =
    variant === "admin"
      ? adminCommandPaletteGroups
      : variant === "instructor"
        ? instructorCommandPaletteGroups
        : commandPaletteGroups
  // The "Rate this course" preview is a *learner* action, so it hangs only
  // off the student palette — rating a course has as little to do with
  // teaching one as it does with administering the platform.
  const preview = variant === "student"
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)

  // Rate whichever course you're looking at, falling back to the flagship so
  // the entry still demonstrates something from anywhere in the dashboard.
  const slug = pathname.match(
    /^\/dashboard\/(?:courses|learning)\/([^/]+)/
  )?.[1]
  const course =
    browseCourses.find((entry) => entry.slug === slug) ??
    browseCourses.find((entry) => entry.slug === "mastering-illustration") ??
    browseCourses[0]!

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-[458px] min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg border bg-card pr-3 pl-3.5 text-left transition-colors hover:bg-hover"
      >
        <SearchIcon className="size-4 shrink-0 text-subtle-foreground" />
        <span className="flex-1 truncate text-sm text-muted-foreground">
          Search...
        </span>
        <Kbd className="hidden shrink-0 sm:flex">⌘ K</Kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        {/* The generated `CommandDialog` doesn't wrap its children in the cmdk
            root, so the input has no store to subscribe to without this. */}
        <Command>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>Nothing matches that yet.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.title} heading={group.title}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={item.title}
                    onSelect={() => go(item.href)}
                    className="cursor-pointer"
                  >
                    <item.icon />
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            {preview ? (
              <CommandGroup heading="Preview">
                <CommandItem
                  value="Rate this course"
                  onSelect={() => {
                    setOpen(false)
                    setFeedbackOpen(true)
                  }}
                  className="cursor-pointer"
                >
                  <StarIcon />
                  Rate this course
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>

      {preview ? (
        <CourseFeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          courseTitle={course.title}
          instructorFirstName={
            course.instructor.split(" ")[0] ?? "the instructor"
          }
        />
      ) : null}
    </>
  )
}

export { DashboardSearch }
