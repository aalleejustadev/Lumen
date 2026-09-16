"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { CourseArt } from "@/components/dashboard/course-art"
import {
  EDITOR_CARD,
  EDITOR_FIELD,
  EDITOR_HEADING,
  EDITOR_LABEL,
  EDITOR_LEAD,
  EDITOR_SUBMIT,
} from "@/components/dashboard/instructor/courses/edit/editor-controls"
import {
  COVER_MAX_BYTES,
  COVER_MIME_TYPES,
  LANDING_LIMITS,
  landingPageCopy,
} from "@/lib/config/course-editor"
import type { EditorLanding } from "@/lib/instructor-course-edit"
import { uploadCourseCover } from "@/lib/actions/instructor-course-edit"
import { cn } from "@/lib/utils"

export type LandingValues = {
  title: string
  subtitle: string
  description: string
}

/**
 * The Course landing page step, from `create-course-page__landing-page.png`.
 *
 * Measured off that export at DPR 2: the editor's shared card (28px padding, a
 * 20px/700 heading over a 15px lead held to 620px), then 16px labels 6px above
 * **44px** fields filled with `--background` on a 16px rhythm, a **95px**
 * description box, a **200 x 118** cover 16px from a 40px *Replace image*, and
 * a 40px *Save landing page* 24px below. See `editor-controls.ts`.
 *
 * Three things about it:
 *
 *  - **It is controlled from `course-editor-page.tsx`**, for the reason the
 *    Intended learners form is: the header's *Save draft* and the card's own
 *    *Save landing page* write the same values, and one owner is what stops
 *    them disagreeing about what is pending.
 *  - **The cover applies the moment it is picked**, while the text waits for
 *    Save — the profile page's arrangement between its avatar and its fields.
 *    An upload is already a deliberate act, and holding a picked file in the
 *    browser until a later click would lose it to any navigation in between.
 *  - **A course with no cover shows its category artwork** — the gradient and
 *    glyph every catalog surface already falls back to — and the button reads
 *    *Upload image* rather than the export's *Replace image*, because there is
 *    nothing to replace yet. The export draws a photograph because its course
 *    has one; `lumen-course-card-art` is why no stock photo stands in.
 */
function LandingPageForm({
  courseId,
  landing,
  values,
  onChange,
  onSubmit,
  pending,
}: {
  courseId: string
  landing: EditorLanding
  values: LandingValues
  onChange: (next: Partial<LandingValues>) => void
  onSubmit: () => void
  pending: boolean
}) {
  return (
    <Card className={EDITOR_CARD}>
      <h2 className={EDITOR_HEADING}>{landingPageCopy.heading}</h2>
      <p className={EDITOR_LEAD}>{landingPageCopy.lead}</p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div className="mt-5.5">
          <label htmlFor="course-title" className={EDITOR_LABEL}>
            {landingPageCopy.title.label}
          </label>
          <input
            id="course-title"
            value={values.title}
            disabled={pending}
            required
            maxLength={LANDING_LIMITS.title}
            placeholder={landingPageCopy.title.placeholder}
            onChange={(event) => onChange({ title: event.target.value })}
            className={cn(EDITOR_FIELD, "mt-1.5 h-11")}
          />
        </div>

        <div className="mt-4">
          <label htmlFor="course-subtitle" className={EDITOR_LABEL}>
            {landingPageCopy.subtitle.label}
          </label>
          <input
            id="course-subtitle"
            value={values.subtitle}
            disabled={pending}
            maxLength={LANDING_LIMITS.subtitle}
            placeholder={landingPageCopy.subtitle.placeholder}
            onChange={(event) => onChange({ subtitle: event.target.value })}
            className={cn(EDITOR_FIELD, "mt-1.5 h-11")}
          />
        </div>

        <div className="mt-4">
          <label htmlFor="course-description" className={EDITOR_LABEL}>
            {landingPageCopy.description.label}
          </label>
          <textarea
            id="course-description"
            value={values.description}
            disabled={pending}
            maxLength={LANDING_LIMITS.description}
            placeholder={landingPageCopy.description.placeholder}
            onChange={(event) => onChange({ description: event.target.value })}
            className={cn(
              EDITOR_FIELD,
              "mt-1.5 block h-[95px] min-h-[95px] resize-y py-2.5 leading-[23px]"
            )}
          />
        </div>

        <CoverField courseId={courseId} landing={landing} />

        <Button
          type="submit"
          loading={pending}
          className={cn(EDITOR_SUBMIT, "mt-6")}
        >
          {landingPageCopy.save}
        </Button>
      </form>
    </Card>
  )
}

/**
 * The cover and its button. It posts through `uploadCourseCover` on pick and
 * shows the new image straight from the action's answer, without waiting for
 * the revalidation to stream the course back.
 */
function CoverField({
  courseId,
  landing,
}: {
  courseId: string
  landing: EditorLanding
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, startUploading] = React.useTransition()
  const [url, setUrl] = React.useState(landing.thumbnailUrl)
  // Re-seed when the server's value changes — adjusted during render, the
  // pattern `editable-text.tsx` records.
  const [seed, setSeed] = React.useState(landing.thumbnailUrl)
  if (landing.thumbnailUrl !== seed) {
    setSeed(landing.thumbnailUrl)
    setUrl(landing.thumbnailUrl)
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Cleared so the same file can be picked again after a refusal.
    event.target.value = ""
    if (!file) return

    // Checked here as well as in the action, so an obviously wrong file is
    // refused before it is sent anywhere.
    if (!(COVER_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast.add({ title: landingPageCopy.cover.wrongType, type: "error" })
      return
    }
    if (file.size > COVER_MAX_BYTES) {
      toast.add({ title: landingPageCopy.cover.tooLarge, type: "error" })
      return
    }

    const formData = new FormData()
    formData.set("image", file)
    startUploading(async () => {
      const result = await uploadCourseCover(courseId, formData)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok && result.url) setUrl(result.url)
    })
  }

  return (
    <div className="mt-5">
      <p className={EDITOR_LABEL}>{landingPageCopy.cover.label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <div className="relative h-[118px] w-[200px] shrink-0 overflow-hidden rounded-lg">
          <CourseArt
            thumbnailUrl={url}
            categorySlug={landing.categorySlug}
            categoryAccent={landing.categoryAccent}
            className="size-full"
            iconClassName="size-10"
          />
          {uploading ? (
            <span className="absolute inset-0 grid place-items-center bg-card/70">
              <Spinner className="size-5" />
            </span>
          ) : null}
        </div>

        <>
          <input
            ref={inputRef}
            type="file"
            accept={COVER_MIME_TYPES.join(",")}
            onChange={onPick}
            className="sr-only"
            tabIndex={-1}
            aria-label={landingPageCopy.cover.label}
          />
          <Button
            type="button"
            variant="outline"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
            className="h-10 bg-card px-4 text-[15px] shadow-sm"
          >
            {uploading
              ? landingPageCopy.cover.uploading
              : url
                ? landingPageCopy.cover.replace
                : landingPageCopy.cover.upload}
          </Button>
        </>
      </div>
    </div>
  )
}

export { LandingPageForm }
