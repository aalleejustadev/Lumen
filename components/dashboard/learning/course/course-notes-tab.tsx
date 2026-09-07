"use client"

import * as React from "react"
import { PlayIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { CourseNote } from "@/lib/config/course-player"

/**
 * The Notes panel from `course-notes__tab.png`. A composer stamped with the
 * player's current timestamp, then the notes taken so far, newest work at the
 * bottom in the order they were written.
 *
 * Notes are local state, not persisted: there is no `LessonNote` model in
 * `prisma/schema.prisma` yet, so adding and deleting work for the session and
 * reset on reload. Swap the two handlers for Server Actions once there is a
 * table — the shape below is already one row per note.
 *
 * The composer's timestamp is fixed at 0:00 for the same reason the player's
 * clock is: nothing is wired to a real `<video>`, so there is no playhead to
 * read. Feed it the player's current time once there is one — that is what
 * "Scrub the bar, then note the moment" is describing.
 */
function CourseNotesTab({ notes: initialNotes }: { notes: CourseNote[] }) {
  const [notes, setNotes] = React.useState(initialNotes)
  const [draft, setDraft] = React.useState("")
  const timestamp = "0:00"

  function addNote(event: React.FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    setNotes((current) => [
      ...current,
      { id: `note-${Date.now()}`, timestamp, body },
    ])
    setDraft("")
  }

  return (
    <Card className="gap-0 p-6.5 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Lesson Notes</h2>
        <p className="text-[15px] text-muted-foreground">
          Scrub the bar, then note the moment
        </p>
      </div>

      <form onSubmit={addNote} className="mt-5 flex items-center gap-4">
        {/* The timestamp lives inside the field's own tinted row rather than
            beside it, so the stamp reads as part of the note being written. */}
        <div className="flex h-14 flex-1 items-center gap-3 rounded-xl bg-soft px-3.5">
          <span className="shrink-0 rounded-md bg-track px-2.5 py-1 text-[15px] leading-5 font-bold tabular-nums">
            {timestamp}
          </span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a note at this timestamp..."
            aria-label="Add a note at this timestamp"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        <Button
          type="submit"
          className="h-14 shrink-0 gap-2 px-6 font-semibold"
        >
          <PlusIcon data-icon="inline-start" className="size-4.5" />
          Add note
        </Button>
      </form>

      {notes.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3.5">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-center gap-4 rounded-xl bg-soft px-4 py-4"
            >
              <span className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-[15px] leading-6 font-bold text-primary-foreground tabular-nums">
                <PlayIcon className="size-3.5" />
                {note.timestamp}
              </span>
              <span className="min-w-0 flex-1 text-[15px] leading-6">
                {note.body}
              </span>
              <button
                type="button"
                onClick={() =>
                  setNotes((current) =>
                    current.filter((entry) => entry.id !== note.id)
                  )
                }
                className="shrink-0 cursor-pointer text-subtle-foreground transition-colors hover:text-destructive"
              >
                <Trash2Icon className="size-4.5" />
                <span className="sr-only">Delete note at {note.timestamp}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl bg-soft px-5 py-8 text-center text-[15px] text-muted-foreground">
          No notes yet — pause at anything worth coming back to and jot it down.
        </p>
      )}
    </Card>
  )
}

export { CourseNotesTab }
