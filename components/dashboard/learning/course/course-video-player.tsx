"use client"

import * as React from "react"
import {
  EllipsisVerticalIcon,
  MaximizeIcon,
  PauseIcon,
  PlayIcon,
  Volume2Icon,
} from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The lesson player from `course-page__part1.png` — a 16:9 surface with the
 * transport bar laid over its bottom edge: play/pause, a clock, a scrubber
 * carrying amber chapter markers, then volume, fullscreen and an overflow
 * menu.
 *
 * There is no video asset behind it, same rule the rest of the app follows
 * (`lumen-course-card-art`): the surface is the course's category gradient
 * where the export shows a frame, and the controls are local state rather
 * than a wired `<video>`. Wire it to a real element once lessons carry media
 * — the markup below is the chrome, not the playback.
 *
 * The chrome is deliberately dark in both themes (literal white alphas, not
 * theme tokens), matching `course-preview-dialog.tsx` and the hero scrims:
 * it sits on a coloured gradient, not on the page.
 */

/** Chapter marks on the scrubber, as a percentage of the lesson's runtime.
 *  The export draws three, clustered in the first third. */
const CHAPTER_MARKS = [2.5, 13, 31]

function CourseVideoPlayer({
  art,
  lessonTitle,
}: {
  art: string
  lessonTitle: string
}) {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const TransportIcon = isPlaying ? PauseIcon : PlayIcon

  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br",
        art
      )}
    >
      {/* The controls sit on a scrim rather than the gradient itself, so the
          white glyphs hold their contrast wherever the gradient is lightest. */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-4 bg-gradient-to-t from-black/60 to-transparent px-5 pt-16 pb-4">
        <button
          type="button"
          onClick={() => setIsPlaying((playing) => !playing)}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
        >
          <TransportIcon className="size-5 fill-current stroke-none" />
          <span className="sr-only">
            {isPlaying ? "Pause" : "Play"} {lessonTitle}
          </span>
        </button>

        <span className="shrink-0 text-[15px] leading-5 font-medium text-white tabular-nums">
          0:00
        </span>

        <div className="relative h-1.5 flex-1 rounded-full bg-white/45">
          {CHAPTER_MARKS.map((mark) => (
            <span
              key={mark}
              // `-translate-x-1/2` centres each dot on its mark; without it
              // they'd hang off the right of the position they label.
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-star"
              style={{ left: `${mark}%` }}
            />
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-4 text-white">
          <button type="button" className="cursor-pointer">
            <Volume2Icon className="size-5" />
            <span className="sr-only">Mute</span>
          </button>
          <button type="button" className="cursor-pointer">
            <MaximizeIcon className="size-5" />
            <span className="sr-only">Full screen</span>
          </button>
          <button type="button" className="cursor-pointer">
            <EllipsisVerticalIcon className="size-5" />
            <span className="sr-only">More options</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export { CourseVideoPlayer }
