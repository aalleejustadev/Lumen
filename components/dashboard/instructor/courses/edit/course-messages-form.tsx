"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  EDITOR_CARD,
  EDITOR_FIELD,
  EDITOR_HEADING,
  EDITOR_LABEL,
  EDITOR_LEAD,
  EDITOR_SUBMIT,
} from "@/components/dashboard/instructor/courses/edit/editor-controls"
import {
  COURSE_MESSAGE_MAX,
  courseMessagesCopy,
} from "@/lib/config/course-editor"
import { cn } from "@/lib/utils"

export type MessagesValues = {
  welcomeMessage: string
  congratulationsMessage: string
}

/**
 * The Course messages step, from `create-course-page__messages.png`.
 *
 * Measured off that export at DPR 2: the editor's shared card and lead, then
 * two labelled **95px** textareas — the landing page's description box, drawn
 * identically — 22px apart, and a 40px *Save messages* 28px below.
 *
 * Controlled from `course-editor-page.tsx`, for the Intended learners form's
 * reason: *Save draft* and *Save messages* write the same values.
 *
 * **What it writes is stored, not yet sent.** `Course.welcomeMessage` belongs
 * on enrolment and `congratulationsMessage` on completion, and nothing in the
 * app writes either event yet — see `saveCourseMessages`. The lead still says
 * "sent to every learner" because it describes what the fields are for.
 */
function CourseMessagesForm({
  values,
  onChange,
  onSubmit,
  pending,
}: {
  values: MessagesValues
  onChange: (next: Partial<MessagesValues>) => void
  onSubmit: () => void
  pending: boolean
}) {
  const box = cn(
    EDITOR_FIELD,
    "mt-1.5 block h-[95px] min-h-[95px] resize-y py-2.5 leading-[23px]"
  )

  return (
    <Card className={EDITOR_CARD}>
      <h2 className={EDITOR_HEADING}>{courseMessagesCopy.heading}</h2>
      <p className={EDITOR_LEAD}>{courseMessagesCopy.lead}</p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div className="mt-5.5">
          <label htmlFor="welcome-message" className={EDITOR_LABEL}>
            {courseMessagesCopy.welcome.label}
          </label>
          <textarea
            id="welcome-message"
            value={values.welcomeMessage}
            disabled={pending}
            maxLength={COURSE_MESSAGE_MAX}
            placeholder={courseMessagesCopy.welcome.placeholder}
            onChange={(event) =>
              onChange({ welcomeMessage: event.target.value })
            }
            className={box}
          />
        </div>

        <div className="mt-5.5">
          <label htmlFor="congratulations-message" className={EDITOR_LABEL}>
            {courseMessagesCopy.congratulations.label}
          </label>
          <textarea
            id="congratulations-message"
            value={values.congratulationsMessage}
            disabled={pending}
            maxLength={COURSE_MESSAGE_MAX}
            placeholder={courseMessagesCopy.congratulations.placeholder}
            onChange={(event) =>
              onChange({ congratulationsMessage: event.target.value })
            }
            className={box}
          />
        </div>

        <Button
          type="submit"
          loading={pending}
          className={cn(EDITOR_SUBMIT, "mt-7")}
        >
          {courseMessagesCopy.save}
        </Button>
      </form>
    </Card>
  )
}

export { CourseMessagesForm }
