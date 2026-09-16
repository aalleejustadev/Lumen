import Link from "next/link"
import { CheckIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import {
  courseEditorCopy,
  editorGroups,
  editorStepHref,
  type EditorStepKey,
} from "@/lib/config/course-editor"
import { cn } from "@/lib/utils"

/**
 * The left column of both "Create Course" exports: three labelled groups of
 * steps, each with a state circle.
 *
 * Measured off `create-course-page.png` at DPR 2: a **238px** card on 14px
 * padding, a 13px/600 group label, and 36px rows on `rounded-lg` with 12px of
 * their own side padding — an 18px circle 12px from a 15px title. The selected
 * row is `--hover` with a **2px `--foreground` left border**, which is the one
 * thing about it that is not a plain pill; sampled off the export at #18181b.
 *
 * A **Server Component**. Nothing here has state, so the four lucide glyphs
 * and the whole step config stay off the bundle — and unlike
 * `settings-nav-card.tsx` there is no list crossing a prop boundary, which is
 * what forces those three wrappers to be client.
 *
 * **A step is a link only when it is built**, and renders as inert text
 * otherwise — `attention-list.tsx`' rule, and what lets the card draw all six
 * steps the export draws while four of them exist. Its circle still tells the
 * truth: completion is derived from the course's own rows
 * (`lib/instructor-course-edit.ts`), so an unbuilt step that happens to be
 * filled in — Coupons, on a course with one — is ticked rather than blank.
 */
function EditorNav({
  courseSlug,
  active,
  completed,
}: {
  courseSlug: string
  active: EditorStepKey
  completed: Record<EditorStepKey, boolean>
}) {
  return (
    <Card className="h-fit w-full gap-0 p-3.5 ring-border">
      {editorGroups.map((group, index) => (
        <div key={group.title} className={cn(index > 0 && "mt-4")}>
          <p className="px-2 py-1.5 text-[13px] leading-none font-semibold">
            {group.title}
          </p>

          {group.steps.map((step) => {
            const isActive = step.key === active
            const body = (
              <>
                <span
                  className={cn(
                    "grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px]",
                    completed[step.key]
                      ? "border-success text-success"
                      : "border-border text-transparent"
                  )}
                >
                  <CheckIcon className="size-2.5" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px]">
                  {step.title}
                </span>
              </>
            )

            const shared = cn(
              "mt-1 flex h-9 w-full items-center gap-3 rounded-lg border-l-2 px-3 text-left",
              isActive
                ? "border-foreground bg-hover font-medium"
                : "border-transparent"
            )

            if (!step.built) {
              return (
                <div
                  key={step.key}
                  title={courseEditorCopy.stepUnavailable}
                  className={cn(shared, "text-muted-foreground")}
                >
                  {body}
                </div>
              )
            }

            return (
              <Link
                key={step.key}
                href={editorStepHref(courseSlug, step.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(shared, !isActive && "hover:bg-hover/60")}
              >
                {body}
              </Link>
            )
          })}
        </div>
      ))}
    </Card>
  )
}

export { EditorNav }
