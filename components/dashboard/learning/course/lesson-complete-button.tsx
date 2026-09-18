"use client"

import * as React from "react"
import { CheckIcon, CircleCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { markLessonComplete } from "@/lib/actions/learning"

/**
 * "Mark as complete" — the control the whole completion chain hangs off.
 *
 * **Nothing could finish a course before this existed.** `LessonProgress` had
 * no writer, so `Enrollment.completedAt` was never set, so no certificate was
 * ever issued and the congratulations message the editor stores was never
 * sent. One button closes all three.
 *
 * It **toggles**, rather than only completing: a lesson ticked by accident had
 * no way back, and `setLessonComplete` takes the desired state for the reason
 * `lib/actions/instructor-follow.ts` records — a double click on "toggle"
 * undoes itself, where "set complete to true" twice is still complete.
 *
 * Drawn only for a lesson somebody can actually take: the caller omits it for
 * a locked one, since a lock is the answer to "may I", not "have I".
 */
function LessonCompleteButton({
  lessonId,
  completed,
}: {
  lessonId: string
  completed: boolean
}) {
  const [pending, startTransition] = React.useTransition()
  // Optimistic, so the tick lands under the cursor rather than after a round
  // trip that also recounts the enrolment and may issue a certificate.
  const [done, setDone] = React.useState(completed)

  // **Adjusted during render, not in an effect** — React's own pattern for "a
  // prop changed, reset some state", and the one the hooks lint rule accepts
  // (`react-hooks/set-state-in-effect`). `users-toolbar.tsx` records the same
  // call for its search field. Keying the component on `completed` would work
  // and would throw away the pending transition mid-flight.
  const [seen, setSeen] = React.useState(completed)
  if (seen !== completed) {
    setSeen(completed)
    setDone(completed)
  }

  function toggle() {
    const next = !done
    setDone(next)
    startTransition(async () => {
      const result = await markLessonComplete(lessonId, next)
      if (!result.ok) {
        setDone(!next)
        toast.add({ title: result.message ?? "Could not save.", type: "error" })
      }
    })
  }

  return (
    <Button
      type="button"
      variant={done ? "outline" : "default"}
      onClick={toggle}
      loading={pending}
      className={done ? "h-10 gap-2 bg-card" : "h-10 gap-2"}
    >
      {done ? (
        <CircleCheckIcon className="size-4 text-success" />
      ) : (
        <CheckIcon className="size-4" />
      )}
      {done ? "Completed" : "Mark as complete"}
    </Button>
  )
}

export { LessonCompleteButton }
