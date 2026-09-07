"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MessageCircleQuestionMarkIcon,
  PlusIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { initialsOf } from "@/components/dashboard/learning/course/initials"
import {
  QA_VISIBLE_REPLIES,
  type CourseQuestion,
  type QuestionReply,
} from "@/lib/config/course-player"
import { cn } from "@/lib/utils"

const filters = [
  { value: "all", label: "All questions" },
  { value: "unanswered", label: "Unanswered" },
  { value: "answered", label: "Answered" },
] as const

type FilterValue = (typeof filters)[number]["value"]

function ReplyRow({ reply }: { reply: QuestionReply }) {
  return (
    <div className="flex gap-3.5">
      <Avatar className="mt-0.5 size-9 shrink-0">
        <AvatarImage src={reply.avatarUrl} alt="" />
        <AvatarFallback className="text-xs">
          {initialsOf(reply.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{reply.name}</span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[13px] leading-5 font-semibold",
              reply.role === "Instructor"
                ? "bg-accent-1/12 text-accent-1"
                : "bg-track text-muted-foreground"
            )}
          >
            {reply.role}
          </span>
          <span className="text-[15px] text-muted-foreground">
            · {reply.timeAgo}
          </span>
        </div>
        <p className="mt-1.5 text-[15px] leading-7 text-muted-foreground">
          {reply.body}
        </p>
      </div>
    </div>
  )
}

function QuestionCard({
  question,
  defaultExpanded,
}: {
  question: CourseQuestion
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const [showAllReplies, setShowAllReplies] = React.useState(false)

  const hidden = Math.max(0, question.replies.length - QA_VISIBLE_REPLIES)
  const visible =
    showAllReplies || hidden === 0
      ? question.replies
      : question.replies.slice(0, QA_VISIBLE_REPLIES)

  const ToggleIcon = expanded ? ChevronUpIcon : ChevronDownIcon

  return (
    <div className="rounded-xl bg-soft p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <Avatar className="mt-0.5 size-10 shrink-0">
            <AvatarImage src={question.avatarUrl} alt="" />
            <AvatarFallback className="text-xs">
              {initialsOf(question.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <h3 className="text-lg leading-7">{question.title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <span className="font-bold">{question.name}</span>
              <span className="text-[15px] text-muted-foreground">
                · {question.timeAgo}
              </span>
              <span className="rounded-md bg-track px-2.5 py-1 text-[15px] leading-5 text-muted-foreground">
                {question.lessonTag}
              </span>
              <span
                className={cn(
                  "rounded-md px-2.5 py-1 text-[15px] leading-5 font-medium",
                  question.answered
                    ? "bg-success/12 text-success"
                    : "bg-warning/12 text-warning"
                )}
              >
                {question.answered ? "Answered" : "Awaiting reply"}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => setExpanded((open) => !open)}
          className="shrink-0 gap-2 bg-card font-semibold shadow-sm"
          // The count is the thread's own length, so it can't drift from the
          // rows the toggle opens.
          aria-expanded={expanded}
        >
          <ToggleIcon data-icon="inline-start" className="size-4" />
          {question.replies.length}{" "}
          {question.replies.length === 1 ? "reply" : "replies"}
        </Button>
      </div>

      {expanded ? (
        // The rule hangs off the question's avatar column, which is what
        // gathers a thread visually under the question that started it.
        <div className="mt-5 ml-5 flex flex-col gap-5 border-l border-border pl-5">
          {visible.map((reply, index) => (
            <ReplyRow key={`${reply.name}-${index}`} reply={reply} />
          ))}

          {hidden > 0 && !showAllReplies ? (
            <Button
              variant="outline"
              onClick={() => setShowAllReplies(true)}
              className="w-fit gap-2 bg-card font-semibold shadow-sm"
            >
              <ChevronDownIcon data-icon="inline-start" className="size-4" />
              Show {hidden} more {hidden === 1 ? "reply" : "replies"}
            </Button>
          ) : null}

          <form
            // No thread-writing action exists yet — the composer is the
            // export's chrome, not a wired mutation. Point it at a Server
            // Action once `CourseQuestion` is a real table.
            onSubmit={(event) => event.preventDefault()}
            className="flex items-center gap-3"
          >
            <Input
              placeholder="Write a reply..."
              aria-label={`Reply to ${question.name}`}
              className="h-12 flex-1 bg-card text-[15px] shadow-sm"
            />
            <Button type="submit" className="h-12 shrink-0 px-6 font-semibold">
              Reply
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

/**
 * The Q&A panel from `course-QA__tab.png`. One card holding a header, the
 * All/Unanswered/Answered filter, and the question threads.
 *
 * The filter is the same segmented control as `enrolled-courses-section.tsx`
 * — one `bg-track` container on `p-1` with the selected item as the dark pill
 * — so the two switches in the student area behave and read identically.
 *
 * `instructorFirstName` only feeds the subtitle ("visible to enrolled
 * students and Simon"): it's the course's own instructor, so the line names
 * whoever actually answers rather than a generic "the instructor".
 */
function CourseQaTab({
  questions,
  instructorFirstName,
}: {
  questions: CourseQuestion[]
  instructorFirstName: string
}) {
  const [filter, setFilter] = React.useState<FilterValue>("all")

  const visible = questions.filter((question) =>
    filter === "all" ? true : question.answered === (filter === "answered")
  )

  return (
    <Card className="gap-0 p-6.5 ring-border">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-1/12 text-accent-1">
            <MessageCircleQuestionMarkIcon className="size-5.5" />
          </span>
          <div>
            <h2 className="text-xl font-bold">Questions about this course</h2>
            <p className="mt-0.5 text-[15px] leading-6 text-muted-foreground">
              {questions.length}{" "}
              {questions.length === 1 ? "question" : "questions"} · visible to
              enrolled students and {instructorFirstName}
            </p>
          </div>
        </div>

        <Button className="h-12 shrink-0 gap-2 px-5 font-semibold">
          <PlusIcon data-icon="inline-start" className="size-4.5" />
          Ask a question
        </Button>
      </div>

      <ToggleGroup
        value={[filter]}
        onValueChange={(value: string[]) =>
          // Clicking the selected segment would otherwise clear the value and
          // leave no filter active — keep the current one instead.
          setFilter((current) => (value[0] as FilterValue) ?? current)
        }
        aria-label="Filter questions"
        className="mt-5 w-fit gap-0 rounded-lg bg-track p-1"
      >
        {filters.map((entry) => (
          <ToggleGroupItem
            key={entry.value}
            value={entry.value}
            size="lg"
            // `aria-pressed:hover:` rather than a plain `hover:`, same reason
            // as `enrolled-courses-section.tsx`: both are single attribute
            // selectors, so Tailwind's variant order would otherwise decide
            // which one paints the selected pill on hover.
            className="rounded-md px-4 text-[15px] text-muted-foreground aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
          >
            {entry.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="mt-5 flex flex-col gap-4">
        {visible.length > 0 ? (
          visible.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              // The export draws the first thread open and the rest closed —
              // enough to show what a thread looks like without burying the
              // list under it.
              defaultExpanded={index === 0 && question.replies.length > 0}
            />
          ))
        ) : (
          <p className="rounded-xl bg-soft px-5 py-8 text-center text-[15px] text-muted-foreground">
            No {filter === "answered" ? "answered" : "unanswered"} questions
            right now.
          </p>
        )}
      </div>
    </Card>
  )
}

export { CourseQaTab }
