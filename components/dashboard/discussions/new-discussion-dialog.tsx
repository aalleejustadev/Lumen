"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  DISCUSSION_BODY_MAX,
  DISCUSSION_TITLE_MAX,
  newDiscussionCopy,
} from "@/lib/config/discussions"
import type { NewDiscussionInput } from "@/lib/actions/discussions"
import type { DiscussionTopic } from "@/lib/discussions"
import { cn } from "@/lib/utils"

/**
 * "New discussion" — and "New announcement", which is the same four fields
 * with the Announcements topic chosen for you. One component rather than two,
 * the call `category-dialog.tsx` makes.
 *
 * **Neither export draws it.** It is built because both of the instructor
 * export's header buttons are primary actions, and a primary action that opens
 * nothing is the 404 the codebase's own rule refuses — the same reason the
 * inbox got its New-message dialog. It borrows the established dialog
 * vocabulary (a 540px panel on 30px padding, 44px fields filled with
 * `--background`, a 40px submit) rather than inventing a second look, and it
 * **drops Cancel** per the standing rule: `DialogContent` already draws a
 * close X.
 *
 * The `dark:bg-background` twins are spelled out because `Input`/`Textarea`
 * carry `dark:bg-input/30`, a wrapped selector a plain `bg-background` loses
 * to on specificity — the trap `settings-controls.ts` records.
 */

const FIELD =
  "rounded-lg bg-background text-[15px] md:text-[15px] dark:bg-background"
const LABEL = "text-[14px] font-medium text-foreground"

function NewDiscussionDialog({
  open,
  onOpenChange,
  topics,
  /** Announce mode: the topic is fixed and the copy changes. */
  announce,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  topics: DiscussionTopic[]
  announce: boolean
  pending: boolean
  onSubmit: (input: NewDiscussionInput) => void
}) {
  const announcements = topics.find((topic) => topic.slug === "announcements")
  const fallback = (announce ? announcements : undefined) ?? topics[0]

  const [values, setValues] = React.useState<NewDiscussionInput>({
    topicId: fallback?.id ?? "",
    title: "",
    body: "",
    tags: "",
  })

  // Seeded by adjusting state *during render*, keyed on a **string**: the
  // parent rebuilds its props every render, so keying on object identity would
  // re-seed the fields on each keystroke and spin the render loop. The trap
  // `category-dialog.tsx` records.
  const seedKey = `${open}:${announce}`
  const [lastSeed, setLastSeed] = React.useState(seedKey)
  if (seedKey !== lastSeed) {
    setLastSeed(seedKey)
    if (open) {
      setValues({
        topicId: fallback?.id ?? "",
        title: "",
        body: "",
        tags: "",
      })
    }
  }

  function set<K extends keyof NewDiscussionInput>(
    key: K,
    value: NewDiscussionInput[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-7.5 sm:max-w-[540px]">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-[20px] font-bold">
            {announce
              ? newDiscussionCopy.announceTitle
              : newDiscussionCopy.title}
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-6">
            {announce
              ? newDiscussionCopy.announceDescription
              : newDiscussionCopy.description}
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(values)
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="discussion-topic" className={LABEL}>
              {newDiscussionCopy.topic}
            </Label>
            <Select
              value={values.topicId}
              onValueChange={(next: string | null) =>
                set("topicId", next ?? "")
              }
            >
              {/* `data-[size=default]:h-11` repeats the variant `SelectTrigger`
                  carries — an attribute selector a plain height loses to. */}
              <SelectTrigger
                id="discussion-topic"
                className={cn(FIELD, "h-11 w-full data-[size=default]:h-11")}
              >
                {/* A render function, not a bare `SelectValue`: the trigger
                    otherwise prints the raw topic id. */}
                <SelectValue placeholder={newDiscussionCopy.topicPlaceholder}>
                  {(current: string) =>
                    topics.find((topic) => topic.id === current)?.name ??
                    newDiscussionCopy.topicPlaceholder
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="discussion-title" className={LABEL}>
              {newDiscussionCopy.discussionTitle}
            </Label>
            <Input
              id="discussion-title"
              value={values.title}
              maxLength={DISCUSSION_TITLE_MAX}
              placeholder={newDiscussionCopy.titlePlaceholder}
              onChange={(event) => set("title", event.target.value)}
              className={cn(FIELD, "h-11")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="discussion-body" className={LABEL}>
              {newDiscussionCopy.body}
            </Label>
            <Textarea
              id="discussion-body"
              value={values.body}
              maxLength={DISCUSSION_BODY_MAX}
              placeholder={newDiscussionCopy.bodyPlaceholder}
              onChange={(event) => set("body", event.target.value)}
              className={cn(FIELD, "min-h-28 px-3.5 py-2.5")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="discussion-tags" className={LABEL}>
              {newDiscussionCopy.tags}
            </Label>
            <Input
              id="discussion-tags"
              value={values.tags}
              placeholder={newDiscussionCopy.tagsPlaceholder}
              onChange={(event) => set("tags", event.target.value)}
              className={cn(FIELD, "h-11")}
            />
          </div>

          <Button
            type="submit"
            loading={pending}
            className="mt-1 h-10 w-fit px-5"
          >
            {announce
              ? newDiscussionCopy.announceSubmit
              : newDiscussionCopy.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { NewDiscussionDialog }
