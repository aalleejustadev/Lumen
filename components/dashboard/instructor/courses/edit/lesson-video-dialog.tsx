"use client"

import * as React from "react"
import { FilmIcon, Trash2Icon, UploadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/toast"
import {
  LESSON_VIDEO_MAX_BYTES,
  LESSON_VIDEO_TYPES,
  lessonVideoCopy,
} from "@/lib/config/course-editor"
import type { EditorLesson } from "@/lib/instructor-course-edit"
import {
  attachLessonVideo,
  removeLessonVideo,
  startLessonVideoUpload,
} from "@/lib/actions/instructor-course-edit"
import { cn } from "@/lib/utils"

type Phase =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string; percent: number }
  | { kind: "finishing"; fileName: string }

/**
 * The curriculum's **Upload video** dialog — one instance for the whole board,
 * opened on whichever video row was pressed.
 *
 * No export draws it, so it is built from `new-category__dialog_admin.png`'s
 * vocabulary the way `payout-method-dialog.tsx` is: 30px padding, a 20px/700
 * title over a 15px lead, 40px controls, and no Cancel beside the close X, per
 * the standing dialog rule.
 *
 * Four things about how it works:
 *
 *  - **The file goes straight from the browser to the bucket**, through a PUT
 *    the server signs (`startLessonVideoUpload`) and then verifies
 *    (`attachLessonVideo`). A video is far too large to post through a Server
 *    Action — see `createLessonVideoUpload`. The PUT is an `XMLHttpRequest`
 *    rather than `fetch` because it is the only one of the two that reports
 *    upload progress, and a multi-minute upload with no bar reads as a hang.
 *  - **The duration is read here, before uploading**, off a detached `<video>`
 *    pointed at the local file. The browser is the only party that decodes it,
 *    and the lesson's length should follow from the video rather than being
 *    typed. A file the browser cannot decode (some `.mov`s) simply uploads
 *    without one and the length is left as it was.
 *  - **Closing the dialog mid-upload aborts it**, and so does Cancel. An upload
 *    left running behind a closed dialog would attach itself to a lesson
 *    minutes later with nobody watching.
 *  - Replacing a video uploads the new one first and collects the old one only
 *    once the new one is attached, so a failed replace leaves the lesson with
 *    the video it had rather than with none.
 */
function LessonVideoDialog({
  courseId,
  lesson,
  onOpenChange,
  onChange,
}: {
  courseId: string
  /** The row it was opened for; null closes it. */
  lesson: EditorLesson | null
  onOpenChange: (open: boolean) => void
  onChange: (change: Partial<EditorLesson>) => void
}) {
  const [phase, setPhase] = React.useState<Phase>({ kind: "idle" })
  const [removing, startRemoving] = React.useTransition()
  const [dragOver, setDragOver] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const xhrRef = React.useRef<XMLHttpRequest | null>(null)

  const busy = phase.kind !== "idle"
  const video = lesson?.video ?? null

  function abort() {
    xhrRef.current?.abort()
    xhrRef.current = null
    setPhase({ kind: "idle" })
  }

  async function upload(file: File) {
    if (!lesson || busy) return

    if (!(LESSON_VIDEO_TYPES as readonly string[]).includes(file.type)) {
      toast.add({ title: lessonVideoCopy.wrongType, type: "error" })
      return
    }
    if (file.size > LESSON_VIDEO_MAX_BYTES) {
      toast.add({ title: lessonVideoCopy.tooLarge, type: "error" })
      return
    }

    const lessonId = lesson.id
    setPhase({ kind: "uploading", fileName: file.name, percent: 0 })

    const [durationSeconds, started] = await Promise.all([
      readDuration(file),
      startLessonVideoUpload(courseId, lessonId, {
        contentType: file.type,
        sizeBytes: file.size,
      }),
    ])
    if (!started.ok || !started.uploadUrl || !started.key) {
      setPhase({ kind: "idle" })
      toast.add({ title: started.message, type: "error" })
      return
    }

    const sent = await put(started.uploadUrl, file, (percent) =>
      setPhase({ kind: "uploading", fileName: file.name, percent })
    )
    if (sent === "aborted") return
    if (sent === "failed") {
      setPhase({ kind: "idle" })
      toast.add({ title: lessonVideoCopy.failed, type: "error" })
      return
    }

    setPhase({ kind: "finishing", fileName: file.name })
    const attached = await attachLessonVideo(courseId, lessonId, {
      key: started.key,
      fileName: file.name,
      durationSeconds,
    })
    setPhase({ kind: "idle" })

    toast.add({
      title: attached.message,
      type: attached.ok ? "success" : "error",
    })
    if (attached.ok && attached.video) {
      onChange({
        video: attached.video,
        ...(attached.durationMinutes !== undefined
          ? { durationMinutes: attached.durationMinutes }
          : {}),
      })
    }
  }

  function put(
    url: string,
    file: File,
    onProgress: (percent: number) => void
  ): Promise<"ok" | "failed" | "aborted"> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      xhrRef.current = xhr
      xhr.open("PUT", url)
      xhr.setRequestHeader("Content-Type", file.type)
      // Sent as a header because the bucket ignores it as a signed query
      // parameter; immutable is safe because every upload is a new key.
      xhr.setRequestHeader(
        "Cache-Control",
        "public, max-age=31536000, immutable"
      )
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      }
      xhr.onload = () => {
        xhrRef.current = null
        resolve(xhr.status >= 200 && xhr.status < 300 ? "ok" : "failed")
      }
      xhr.onerror = () => {
        xhrRef.current = null
        resolve("failed")
      }
      xhr.onabort = () => resolve("aborted")
      xhr.send(file)
    })
  }

  function remove() {
    if (!lesson) return
    const lessonId = lesson.id
    startRemoving(async () => {
      const result = await removeLessonVideo(courseId, lessonId)
      toast.add({
        title: result.message,
        type: result.ok ? "success" : "error",
      })
      if (result.ok) onChange({ video: null })
    })
  }

  function pick() {
    inputRef.current?.click()
  }

  return (
    <Dialog
      open={lesson !== null}
      onOpenChange={(open) => {
        if (!open) abort()
        onOpenChange(open)
      }}
    >
      {/* `sm:` repeated for `request-changes-dialog.tsx`' reason: the
          generated `sm:max-w-sm` beats a plain `max-w-*` above the
          breakpoint. */}
      <DialogContent className="w-[560px] gap-0 p-7.5 sm:max-w-[560px]">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-bold">
            {lessonVideoCopy.title}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-6">
            {lesson ? (
              <span className="text-foreground">{lesson.title}</span>
            ) : null}
            {" · "}
            {lessonVideoCopy.lead}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept={LESSON_VIDEO_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0]
            // Cleared so picking the same file again still fires a change.
            event.target.value = ""
            if (file) void upload(file)
          }}
        />

        <div className="mt-6">
          {busy ? (
            <div className="rounded-xl border border-border p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-2/10 text-accent-2">
                  <FilmIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">
                    {phase.fileName}
                  </p>
                  <p className="text-[13px] text-muted-foreground tabular-nums">
                    {phase.kind === "uploading"
                      ? lessonVideoCopy.uploading(phase.percent)
                      : lessonVideoCopy.finishing}
                  </p>
                </div>
              </div>
              <Progress
                value={phase.kind === "uploading" ? phase.percent : 100}
                aria-label={
                  phase.kind === "uploading"
                    ? lessonVideoCopy.uploading(phase.percent)
                    : lessonVideoCopy.finishing
                }
                className="mt-4 [&_[data-slot=progress-indicator]]:bg-bar-fill [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-track"
              />
              {phase.kind === "uploading" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={abort}
                  className="mt-4 h-10 bg-card px-4 shadow-sm"
                >
                  {lessonVideoCopy.cancel}
                </Button>
              ) : null}
            </div>
          ) : video ? (
            <div>
              {/* `key` so replacing a video reloads the element rather than
                  keeping the old file's buffered frames on screen. */}
              <video
                key={video.url}
                src={video.url}
                controls
                preload="metadata"
                className="aspect-video w-full rounded-xl bg-black"
              />
              <p className="mt-3 truncate text-[13px] text-muted-foreground">
                {[
                  video.fileName,
                  formatBytes(video.sizeBytes),
                  video.durationSeconds !== null
                    ? formatClock(video.durationSeconds)
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  onClick={pick}
                  disabled={removing}
                  className="h-10 gap-2 px-4"
                >
                  <UploadIcon className="size-4" />
                  {lessonVideoCopy.replace}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  loading={removing}
                  onClick={remove}
                  className="h-10 gap-2 bg-card px-4 text-destructive shadow-sm hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                  {lessonVideoCopy.remove}
                </Button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragOver(false)
                const file = event.dataTransfer.files?.[0]
                if (file) void upload(file)
              }}
              className={cn(
                "flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
                dragOver ? "border-primary bg-soft" : "border-border"
              )}
            >
              <span className="grid size-12 place-items-center rounded-xl bg-accent-2/10 text-accent-2">
                <UploadIcon className="size-5" />
              </span>
              <p className="mt-4 text-[15px]">{lessonVideoCopy.drop}</p>
              <Button
                type="button"
                onClick={pick}
                className="mt-3 h-10 gap-2 px-4"
              >
                {lessonVideoCopy.choose}
              </Button>
              <p className="mt-3 text-[13px] text-muted-foreground">
                {lessonVideoCopy.dropHint}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The file's running time, read locally. Null when the browser cannot decode
 *  it or takes too long to say. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const probe = document.createElement("video")
    const done = (value: number | null) => {
      window.clearTimeout(timer)
      URL.revokeObjectURL(url)
      probe.removeAttribute("src")
      resolve(value)
    }
    const timer = window.setTimeout(() => done(null), 8000)
    probe.preload = "metadata"
    probe.onloadedmetadata = () =>
      done(Number.isFinite(probe.duration) ? probe.duration : null)
    probe.onerror = () => done(null)
    probe.src = url
  })
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`
}

function formatClock(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (value: number) => String(value).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export { LessonVideoDialog }
