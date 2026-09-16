"use client"

import * as React from "react"
import {
  FileTextIcon,
  FilmIcon,
  Maximize2Icon,
  PauseIcon,
  PlayIcon,
  ShoppingCartIcon,
  Volume2Icon,
  XIcon,
} from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ArticleBody } from "@/components/dashboard/courses/article-body"
import type { CourseDetail } from "@/lib/config/course-details"
import type { SalePreviewLesson } from "@/lib/course-sale"
import { cn } from "@/lib/utils"

type PreviewLesson = {
  /** A stable key, and the id `startAt` matches on a database course. */
  key: string
  title: string
  sectionTitle: string
  minutes?: number
  previewSeconds?: number
  /** The lesson's real content, on a database course. Absent on a catalog
   *  course, which keeps the drawn player. */
  content?: SalePreviewLesson
}

/** `course.icon` is a `LucideIcon` component reference, which can't cross the
 *  server-client prop boundary (same issue `instructor-profile-page.tsx` calls
 *  out with its own `withoutIcon`), so callers strip it. Nothing here needs it
 *  anyway: unlike the hero and the purchase-card thumbnail, the player surface
 *  is the bare category gradient with no centred watermark — the export's
 *  poster frame carries nothing behind the play button, and a glyph there
 *  reads as a halo through the button's translucent white. */
type CoursePreviewCourse = Omit<CourseDetail, "icon">

/** The scrubber's M:SS clock. Prefers `previewSeconds` (the free clip's own
 *  runtime) and falls back to the lesson's rounded `minutes`, which is what
 *  `course-content-card.tsx` shows in the syllabus. */
function formatClock(lesson: PreviewLesson) {
  if (lesson.content?.kind === "article") {
    return lesson.content.minutes
      ? `${lesson.content.minutes} min read`
      : "Article"
  }
  const total = Math.round(
    lesson.content?.kind === "video" && lesson.content.video?.durationSeconds
      ? lesson.content.video.durationSeconds
      : (lesson.previewSeconds ?? (lesson.minutes ?? 0) * 60)
  )
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

/**
 * The dark, video-player-styled dialog from
 * `ui-design/light/dashboard/student/course-preview__dialog.png`, measured
 * off that export at DPR 2: a 1000px shell (`rounded-xl`, 1px `white/12`
 * hairline, `#0d0d0f` panel) over a 62px header, an `aspect-video` player
 * and a 291px lesson rail. The player chrome is deliberately dark in both
 * themes — same treatment as the hero/thumbnail scrims — so it uses literal
 * black/white alphas rather than the theme tokens.
 *
 * Both "Preview this course" buttons (`course-hero.tsx` and
 * `course-purchase-card.tsx`) wrap their own trigger button in this
 * component — `children` is rendered *as* the Base UI trigger via `render`
 * (the same pattern `dashboard-sidebar.tsx` uses to compose a trigger),
 * rather than nesting a second button inside it.
 *
 * The "FREE LESSONS" rail is whichever `CourseLesson`s across
 * `course.sections` carry `preview: true` — the same flag
 * `course-content-card.tsx` reads for its blue "Preview" tag on the content
 * accordion. That flag is an instructor's own call at course-authoring time,
 * so this dialog has no lesson content of its own: it only ever shows what
 * the course data marks previewable.
 *
 * There's no real video asset behind any of this — same "art system, not
 * stock footage" rule the course cards follow (`lumen-course-card-art`) —
 * so the player surface is the course's category gradient where the export
 * shows a photo, and the transport controls are local UI state rather than a
 * wired `<video>`.
 */
function CoursePreviewDialog({
  course,
  previews = null,
  startAt,
  purchasable = true,
  children,
}: {
  course: CoursePreviewCourse
  /**
   * The free-preview lessons with their real content, on a database course —
   * see `lib/course-sale.ts`. When present they replace the list derived from
   * the syllabus, and the player plays the actual video or shows the article.
   * Null on a catalog course, which keeps the drawn player the export shows.
   */
  previews?: SalePreviewLesson[] | null
  /** Open on this lesson (by id) rather than the first — what a syllabus
   *  row's "Preview" link passes. */
  startAt?: string
  /** Whether "Add to cart" can do anything for this course. */
  purchasable?: boolean
  children: React.ReactElement
}) {
  const previewLessons = React.useMemo<PreviewLesson[]>(
    () =>
      previews
        ? previews.map((lesson) => ({
            key: lesson.id,
            title: lesson.title,
            sectionTitle: lesson.sectionTitle,
            content: lesson,
          }))
        : course.sections.flatMap((section) =>
            section.lessons
              .filter((lesson) => lesson.preview)
              .map((lesson, index) => ({
                key: `${section.title}-${index}-${lesson.title}`,
                title: lesson.title,
                sectionTitle: section.title,
                minutes: lesson.minutes,
                previewSeconds: lesson.previewSeconds,
              }))
          ),
    [course.sections, previews]
  )
  const startIndex = Math.max(
    0,
    previewLessons.findIndex((lesson) => lesson.key === startAt)
  )

  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isPlaying, setIsPlaying] = React.useState(true)
  const active = previewLessons[activeIndex]

  const TransportIcon = isPlaying ? PauseIcon : PlayIcon

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) return
        setActiveIndex(startIndex)
        setIsPlaying(true)
      }}
    >
      <DialogTrigger render={children} />
      <DialogContent
        showCloseButton={false}
        className="grid w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl border border-white/12 bg-[#0d0d0f] p-0 text-white ring-0 sm:max-w-[1000px]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4.5 py-3">
          <div>
            <h2 className="text-[15px] leading-5 font-bold text-white">
              Course preview
            </h2>
            <p className="text-[13px] leading-4.5 text-white/55">
              {course.title} · free lessons
            </p>
          </div>
          <DialogClose className="flex size-8.5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/20 bg-white/6 text-white transition-colors hover:bg-white/12">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {active ? (
          <div className="grid md:grid-cols-[1fr_291px]">
            {active.content ? (
              <RealPreview
                lesson={active.content}
                art={course.art}
                position={`${active.sectionTitle} · Lesson ${activeIndex + 1} of ${previewLessons.length}`}
              />
            ) : (
              <div
                className={cn(
                  "relative aspect-video overflow-hidden bg-gradient-to-br",
                  course.art
                )}
              >
                <span className="absolute top-4.5 left-[27px] flex items-center gap-2 text-[11px] leading-4 font-semibold tracking-wide text-white">
                  <span className="size-1.5 rounded-full bg-destructive" />
                  FREE PREVIEW
                </span>

                <button
                  type="button"
                  onClick={() => setIsPlaying((playing) => !playing)}
                  className="absolute top-1/2 left-1/2 flex size-16.5 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/93 text-neutral-900 transition-transform hover:scale-105"
                >
                  <TransportIcon className="size-6.5 fill-current stroke-none" />
                  <span className="sr-only">
                    {isPlaying ? "Pause" : "Play"}
                  </span>
                </button>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4.5 pt-14 pb-4">
                  <p className="text-base leading-5 font-bold text-white">
                    {active.title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-4.5 text-white/70">
                    {active.sectionTitle} · Lesson {activeIndex + 1} of{" "}
                    {previewLessons.length}
                  </p>

                  <div className="mt-2.5 flex items-center gap-3 pr-0.5">
                    <button
                      type="button"
                      onClick={() => setIsPlaying((playing) => !playing)}
                      className="cursor-pointer text-white"
                    >
                      <TransportIcon className="size-4.5 fill-current stroke-none" />
                      <span className="sr-only">
                        {isPlaying ? "Pause" : "Play"}
                      </span>
                    </button>
                    <span className="text-xs leading-4 text-white tabular-nums">
                      0:00
                    </span>
                    <div className="h-1.25 flex-1 rounded-full bg-white/25">
                      <div className="h-full w-[14%] rounded-full bg-white" />
                    </div>
                    <span className="text-xs leading-4 text-white tabular-nums">
                      {formatClock(active)}
                    </span>
                    <Volume2Icon className="size-4 text-white" />
                    <Maximize2Icon className="size-4 text-white" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col">
              <p className="border-b border-white/10 px-4 py-3.25 text-xs leading-4 font-semibold tracking-wide text-white/50">
                FREE LESSONS
              </p>

              <ul className="flex flex-1 flex-col gap-0.5 p-2">
                {previewLessons.map((lesson, index) => {
                  const isActive = index === activeIndex
                  return (
                    <li key={lesson.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveIndex(index)
                          setIsPlaying(true)
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.25 text-left transition-colors",
                          isActive ? "bg-white/12" : "hover:bg-white/6"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-7.5 shrink-0 items-center justify-center rounded-full",
                            isActive ? "bg-white" : "bg-white/15"
                          )}
                        >
                          {isActive ? (
                            <Volume2Icon className="size-4 text-neutral-900" />
                          ) : lesson.content?.kind === "article" ? (
                            <FileTextIcon className="size-4 text-white" />
                          ) : (
                            <PlayIcon className="size-4 fill-white stroke-none" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-[13px] leading-5 font-semibold",
                              isActive ? "text-white" : "text-white/75"
                            )}
                          >
                            {lesson.title}
                          </span>
                          <span className="block text-xs leading-4 text-white/50 tabular-nums">
                            {formatClock(lesson)}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="border-t border-white/10 px-4 py-3.5">
                <p className="text-[13px] leading-5 text-white/60">
                  {course.durationHours}h more in the full course
                </p>
                {purchasable ? (
                  <button
                    type="button"
                    className="mt-2 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-neutral-900 transition-colors hover:bg-white/90"
                  >
                    <ShoppingCartIcon className="size-4" />
                    <span className="flex items-center gap-1.5">
                      <span>Add to cart</span>
                      <span>·</span>
                      <span className="tabular-nums">
                        ${course.price.toFixed(2)}
                      </span>
                    </span>
                  </button>
                ) : (
                  <p className="mt-2 text-[13px] leading-5 text-white/60">
                    Enrolment for this course isn&apos;t open yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-white/60">
            No free preview lessons yet — the instructor hasn&apos;t marked any
            lectures previewable.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * A free-preview lesson's real content, in the player's slot. A video is the
 * browser's own `<video controls>` — it autoplays because the viewer pressed
 * "Preview" to get here — and `key` reloads it between lessons. An article is
 * the rendered document, scrolling inside the 16:9 frame so the rail beside it
 * keeps its shape. A video not yet uploaded shows the course gradient and says
 * so, rather than a play button that plays nothing.
 */
function RealPreview({
  lesson,
  art,
  position,
}: {
  lesson: SalePreviewLesson
  art: string
  position: string
}) {
  if (lesson.kind === "video" && lesson.video) {
    return (
      <div className="relative aspect-video bg-black">
        <video
          key={lesson.id}
          src={lesson.video.url}
          controls
          autoPlay
          playsInline
          preload="metadata"
          className="size-full"
        >
          Your browser can&apos;t play this video.
        </video>
        <span className="pointer-events-none absolute top-4.5 left-[27px] flex items-center gap-2 text-[11px] leading-4 font-semibold tracking-wide text-white">
          <span className="size-1.5 rounded-full bg-destructive" />
          FREE PREVIEW
        </span>
      </div>
    )
  }

  if (lesson.kind === "article") {
    return (
      <div className="relative aspect-video overflow-y-auto bg-[#141417] px-7 py-6">
        <p className="text-[11px] leading-4 font-semibold tracking-wide text-white/60">
          FREE PREVIEW · {position.toUpperCase()}
        </p>
        <h3 className="mt-2 text-xl leading-tight font-bold text-white">
          {lesson.title}
        </h3>
        {lesson.body && lesson.body.content.length > 0 ? (
          <ArticleBody doc={lesson.body} tone="dark" className="mt-4" />
        ) : (
          <p className="mt-4 text-sm text-white/60">
            This article hasn&apos;t been written yet.
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative grid aspect-video place-items-center bg-gradient-to-br px-6 text-center",
        art
      )}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative flex flex-col items-center">
        <FilmIcon className="size-8 text-white/80" />
        <p className="mt-3 text-base font-bold text-white">{lesson.title}</p>
        <p className="mt-1 text-[13px] text-white/70">
          The video for this lesson hasn&apos;t been uploaded yet.
        </p>
      </div>
    </div>
  )
}

export { CoursePreviewDialog }
