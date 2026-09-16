import Link from "next/link"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FileQuestionIcon,
  FilmIcon,
  LockIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArticleBody } from "@/components/dashboard/courses/article-body"
import type { LessonView } from "@/lib/course-player"
import { cn } from "@/lib/utils"

/**
 * The lesson on screen, on a database course — what replaces
 * `course-video-player.tsx`' drawn player once there is a real lesson to show.
 *
 * `course-page__part1.png` draws only a video, so the video keeps the player's
 * own geometry (a 16:9 `rounded-2xl` box at the top of the column). The other
 * three kinds have no export and borrow the page's card vocabulary:
 *
 *  - **Video** is the browser's own `<video controls>`. The drawn transport —
 *    play, a scrubber with chapter dots, volume, full screen — is exactly what
 *    the native controls provide, and a hand-built copy would have to
 *    reimplement seeking, buffering, captions and keyboard control to be as
 *    good. `key` on the element reloads it between lessons, so the previous
 *    lesson's frame never lingers.
 *  - **Article** is the rendered document (`ArticleBody`) on a card, at the
 *    reading measure the help-centre articles use.
 *  - **Quiz** is a card that opens the quiz page, which already draws
 *    `quiz-page.png`.
 *  - **Locked** is the video box with a lock, for a viewer who is not enrolled.
 *    Nothing of the lesson but its title reached the page (`getLessonView`).
 *
 * Previous and next walk the course in syllabus order, carrying the viewer's
 * preview origin (`query`) so an instructor stepping through a preview stays
 * in it.
 */
function LessonViewer({
  lesson,
  art,
  courseSlug,
  published,
  query,
}: {
  lesson: LessonView
  /** The course's gradient, behind a video that has not been uploaded yet. */
  art: string
  courseSlug: string
  /** Whether a sale page exists for a locked viewer to go to. */
  published: boolean
  /** Extra query parameters to keep on lesson links (`via=…`), or "". */
  query: string
}) {
  const hrefFor = (id: string) =>
    `/dashboard/learning/${courseSlug}?lesson=${id}${query ? `&${query}` : ""}`

  return (
    <div className="flex flex-col gap-3">
      {lesson.kind === "video" ? (
        lesson.video ? (
          <div className="overflow-hidden rounded-2xl bg-black">
            <video
              key={lesson.id}
              src={lesson.video.url}
              controls
              preload="metadata"
              playsInline
              className="aspect-video w-full"
            >
              Your browser can&apos;t play this video.
            </video>
          </div>
        ) : (
          <Placeholder
            art={art}
            icon={<FilmIcon className="size-7" />}
            title="Video coming soon"
            body="The instructor hasn't uploaded this lesson's video yet."
          />
        )
      ) : null}

      {lesson.kind === "article" ? (
        <Card className="gap-0 px-6 py-7 ring-border sm:px-9 sm:py-8">
          <p className="text-[13px] font-medium text-muted-foreground">
            Article
            {lesson.minutes ? ` · ${lesson.minutes} min read` : ""}
          </p>
          <h2 className="mt-1.5 text-2xl leading-tight font-bold">
            {lesson.title}
          </h2>
          {lesson.body && lesson.body.content.length > 0 ? (
            <ArticleBody doc={lesson.body} className="mt-6 max-w-[696px]" />
          ) : (
            <p className="mt-6 text-[15px] text-muted-foreground">
              The instructor hasn&apos;t written this article yet.
            </p>
          )}
        </Card>
      ) : null}

      {lesson.kind === "quiz" ? (
        <Card className="flex-row flex-wrap items-center gap-5 px-6 py-7 ring-border sm:px-8">
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-accent-1/10 text-accent-1">
            <FileQuestionIcon className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-muted-foreground">
              Quiz · {lesson.questions}{" "}
              {lesson.questions === 1 ? "question" : "questions"}
            </p>
            <h2 className="mt-1 text-xl leading-tight font-bold">
              {lesson.title}
            </h2>
          </div>
          {lesson.quizSlug && lesson.questions > 0 ? (
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/dashboard/learning/${courseSlug}/quiz/${lesson.quizSlug}${query ? `?${query}` : ""}`}
                />
              }
              className="h-10 px-5"
            >
              Start quiz
            </Button>
          ) : (
            <p className="text-[14px] text-muted-foreground">
              No questions written yet.
            </p>
          )}
        </Card>
      ) : null}

      {lesson.kind === "locked" ? (
        <Placeholder
          art={art}
          icon={<LockIcon className="size-7" />}
          title="Enrol to unlock this lesson"
          body="This lesson is part of the full course. Lessons marked Preview are free to watch."
          action={
            published ? (
              <Button
                nativeButton={false}
                render={<Link href={`/dashboard/courses/${courseSlug}`} />}
                className="mt-4 h-10 bg-white px-5 text-neutral-900 hover:bg-white/90"
              >
                View course
              </Button>
            ) : null
          }
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">
            {lesson.sectionTitle} · Lesson {lesson.number} of {lesson.total}
          </p>
          {lesson.kind !== "article" && lesson.kind !== "quiz" ? (
            <p className="truncate text-[17px] font-semibold">{lesson.title}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StepLink
            href={lesson.previousId ? hrefFor(lesson.previousId) : null}
            label="Previous"
            icon={<ChevronLeftIcon className="size-4" />}
          />
          <StepLink
            href={lesson.nextId ? hrefFor(lesson.nextId) : null}
            label="Next lesson"
            icon={<ChevronRightIcon className="size-4" />}
            trailing
          />
        </div>
      </div>
    </div>
  )
}

function Placeholder({
  art,
  icon,
  title,
  body,
  action,
}: {
  art: string
  icon: React.ReactNode
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "relative grid aspect-video place-items-center overflow-hidden rounded-2xl bg-gradient-to-br px-6 text-center",
        art
      )}
    >
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative flex max-w-sm flex-col items-center text-white">
        <span className="grid size-14 place-items-center rounded-full bg-white/15 backdrop-blur-sm">
          {icon}
        </span>
        <p className="mt-4 text-lg font-bold">{title}</p>
        <p className="mt-1 text-[15px] text-white/80">{body}</p>
        {action}
      </div>
    </div>
  )
}

/** A previous/next control. Drawn disabled at either end of the course rather
 *  than removed, so the pair does not change shape as you walk it. */
function StepLink({
  href,
  label,
  icon,
  trailing,
}: {
  href: string | null
  label: string
  icon: React.ReactNode
  trailing?: boolean
}) {
  const content = trailing ? (
    <>
      {label}
      {icon}
    </>
  ) : (
    <>
      {icon}
      {label}
    </>
  )
  const className = "h-10 gap-1.5 bg-card px-4 shadow-sm"

  return href ? (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link href={href} scroll={false} />}
      className={className}
    >
      {content}
    </Button>
  ) : (
    <Button variant="outline" disabled className={className}>
      {content}
    </Button>
  )
}

export { LessonViewer }
