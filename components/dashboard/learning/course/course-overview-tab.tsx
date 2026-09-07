"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import type { CoursePlayerCourse } from "@/lib/config/course-player"

/**
 * The Overview panel from `course-page__part{1,2}.png`. The one tab whose
 * content is *not* on a card — it sits straight on the page background, which
 * is what the export draws, so the three other panels read as panes and this
 * one reads as the page's own body copy.
 *
 * "Show more" reveals the rest of the description; the export shows it
 * collapsed to the first paragraph.
 */
function CourseOverviewTab({ about }: { about: CoursePlayerCourse["about"] }) {
  const [expanded, setExpanded] = React.useState(false)
  const [lead, ...rest] = about.description
  const ToggleIcon = expanded ? ChevronUpIcon : ChevronDownIcon

  return (
    <div className="pt-2">
      <h2 className="text-xl font-bold">About This Course</h2>
      <p className="mt-3 text-[17px] leading-8 text-muted-foreground">{lead}</p>

      {expanded
        ? rest.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-4 text-[17px] leading-8 text-muted-foreground"
            >
              {paragraph}
            </p>
          ))
        : null}

      {rest.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-3 flex cursor-pointer items-center gap-2 text-[15px] font-bold text-foreground hover:text-muted-foreground"
        >
          {expanded ? "Show less" : "Show more"}
          <ToggleIcon className="size-4" />
        </button>
      ) : null}

      <h2 className="mt-8 text-xl font-bold">This Course Suit For:</h2>
      <ul className="mt-4 flex flex-col gap-4">
        {about.suitFor.map((line) => (
          <li key={line} className="flex items-start gap-4">
            {/* Default stroke, not the heavier 2.5 the app uses for a check
                inside a filled circle — the export draws these bare on the
                page and they read thin. */}
            <CheckIcon className="mt-1 size-4 shrink-0 text-success" />
            <span className="text-[15px] leading-6">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { CourseOverviewTab }
