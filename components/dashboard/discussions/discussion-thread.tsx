"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  HeartIcon,
  MessageCircleIcon,
  SendIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  createDiscussionReply,
  toggleDiscussionLike,
  toggleReplyLike,
} from "@/lib/actions/discussions"
import {
  authorRoleBadge,
  discussionsHref,
  threadCopy,
  type DiscussionAudience,
} from "@/lib/config/discussions"
import type { DiscussionDetail, DiscussionRow } from "@/lib/discussions"
import { cn } from "@/lib/utils"

/**
 * One thread and its replies, from
 * `ui-design/light/dashboard/instructor/discussion-page__individual.png` —
 * shared by both modes, because the export draws nothing an instructor gets
 * and a learner does not. The audience only decides where "Back to
 * discussions" points.
 *
 * Measured off that export at DPR 2: a **760px** column at the shells' usual
 * page inset — left-aligned, not centred, which is what it draws — a back link
 * above a 760 x 326 thread card on 32px padding, then a "Replies" heading, a
 * composer row, and 104px reply cards **inset 52px** so their 40px avatars sit
 * in the gutter beside them. The thread's own title is 24px/700 over 16px body
 * paragraphs, closed by a hairline above a 36px heart pill and the reply
 * count.
 *
 * Four things decide what it does:
 *
 *  - **The tinted reply is a staff reply, not your own.** The export tints
 *    exactly one — the instructor's — and both readings fit a page drawn for
 *    that instructor. Staff wins because it says the same thing to everyone: a
 *    learner opening a thread wants to spot the answer, where a highlight that
 *    followed the viewer would mean something different to each of them.
 *  - **Both hearts are real**, and separate actions: `LikeTargetType` exists
 *    precisely so an id never has to be resolved to a table by guessing.
 *    Each is optimistic and settles on whatever the server reports.
 *  - **Everyone who can read the thread can reply.** That is the learner
 *    page's own promise, and the line that separates replying from starting a
 *    thread. A **locked** thread is the one refusal, which is what
 *    `Discussion.isLocked` is for — the composer says so rather than vanishing.
 *  - **The per-reply "Reply" focuses the composer and mentions the author.**
 *    `DiscussionReply.parentId` would carry real nesting, but the export draws
 *    none, so inventing a second level of card would be designing past it.
 */

type Busy =
  { kind: "thread" } | { kind: "reply"; id: string } | { kind: "post" } | null

function DiscussionThread({
  audience,
  detail,
}: {
  audience: DiscussionAudience
  detail: DiscussionDetail
}) {
  const [, startSaving] = React.useTransition()
  const [busy, setBusy] = React.useState<Busy>(null)
  const [draft, setDraft] = React.useState("")
  const composer = React.useRef<HTMLInputElement>(null)

  /** Hearts moved since this render; dropped when fresh rows arrive. */
  const [optimistic, setOptimistic] = React.useState<Record<string, boolean>>(
    {}
  )
  const stateKey = [
    `${detail.id}:${detail.liked}:${detail.likeCount}`,
    ...detail.replies.map((r) => `${r.id}:${r.liked}:${r.likeCount}`),
  ].join(",")
  const [lastKey, setLastKey] = React.useState(stateKey)
  if (stateKey !== lastKey) {
    setLastKey(stateKey)
    setOptimistic({})
  }

  function heartOf(id: string, serverLiked: boolean, serverCount: number) {
    const liked = optimistic[id] ?? serverLiked
    const drift =
      optimistic[id] === undefined
        ? 0
        : optimistic[id]
          ? serverLiked
            ? 0
            : 1
          : serverLiked
            ? -1
            : 0
    return { liked, count: Math.max(0, serverCount + drift) }
  }

  function run(
    what: NonNullable<Busy>,
    action: () => Promise<{ ok: boolean; message: string }>,
    quiet = false
  ) {
    setBusy(what)
    startSaving(async () => {
      const result = await action()
      if (!result.ok || !quiet) {
        toast.add({
          title: result.message,
          type: result.ok ? "success" : "error",
        })
      }
      if (result.ok && what.kind === "post") setDraft("")
      setBusy(null)
    })
  }

  const thread = heartOf(detail.id, detail.liked, detail.likeCount)

  return (
    <div className="w-full max-w-[760px]">
      <Button
        variant="ghost"
        nativeButton={false}
        render={<Link href={discussionsHref[audience]} />}
        className="-ml-2 h-9 gap-2 px-2 text-[14px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {threadCopy.back}
      </Button>

      {/* The thread ------------------------------------------------------ */}
      <Card className="mt-3 gap-0 p-8 ring-border">
        <div className="flex items-start gap-3.5">
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={detail.author.image ?? undefined} alt="" />
            <AvatarFallback className="text-[13px]">
              {detail.author.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[16px] font-bold text-foreground">
                {detail.author.name}
              </span>
              <RolePill author={detail.author} />
            </div>
            <p className="text-[13px] text-muted-foreground">{detail.age}</p>
          </div>
        </div>

        <h1 className="mt-6 text-[24px] leading-snug font-bold text-foreground">
          {detail.title}
        </h1>

        <div className="mt-4 grid gap-4">
          {detail.paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className={cn(
                "text-[16px] leading-7",
                // The export runs the opening paragraph at full strength and
                // anything after it muted, which is what a lede looks like.
                index === 0 ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-5 border-t border-border-subtle pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOptimistic((c) => ({ ...c, [detail.id]: !thread.liked }))
              run(
                { kind: "thread" },
                () => toggleDiscussionLike(audience, detail.id),
                true
              )
            }}
            disabled={busy?.kind === "thread"}
            aria-pressed={thread.liked}
            aria-label={thread.liked ? "Remove like" : "Like this discussion"}
            className="h-9 gap-2 rounded-lg bg-card px-4 text-[14px] font-normal tabular-nums shadow-sm"
          >
            {busy?.kind === "thread" ? (
              <Spinner className="size-4" />
            ) : (
              <HeartIcon
                className={cn(
                  "size-4",
                  thread.liked && "fill-current text-destructive"
                )}
              />
            )}
            {thread.count}
          </Button>
          <span className="flex items-center gap-2 text-[14px] text-muted-foreground tabular-nums">
            <MessageCircleIcon className="size-4" />
            {threadCopy.replies(detail.replyCount)}
          </span>
        </div>
      </Card>

      {/* Replies --------------------------------------------------------- */}
      <h2 className="mt-8 text-[18px] font-bold text-foreground">
        {threadCopy.repliesHeading}
      </h2>

      <form
        className="mt-4 flex items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (!draft.trim() || !detail.canReply) return
          run({ kind: "post" }, () =>
            createDiscussionReply(audience, detail.id, draft)
          )
        }}
      >
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={detail.me.image ?? undefined} alt="" />
          <AvatarFallback className="text-[13px]">
            {detail.me.initials}
          </AvatarFallback>
        </Avatar>
        <input
          ref={composer}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!detail.canReply}
          placeholder={
            detail.canReply ? threadCopy.placeholder : threadCopy.locked
          }
          aria-label={threadCopy.placeholder}
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-card px-4 text-[15px] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Button
          type="submit"
          loading={busy?.kind === "post"}
          disabled={!detail.canReply}
          className="h-11 shrink-0 gap-2 px-5"
        >
          <SendIcon className="size-4" />
          {threadCopy.reply}
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-3">
        {detail.replies.map((reply) => {
          const heart = heartOf(reply.id, reply.liked, reply.likeCount)
          return (
            <div key={reply.id} className="flex items-start gap-3">
              <Avatar className="size-10 shrink-0">
                <AvatarImage src={reply.author.image ?? undefined} alt="" />
                <AvatarFallback className="text-[13px]">
                  {reply.author.initials}
                </AvatarFallback>
              </Avatar>
              <Card
                className={cn(
                  "min-w-0 flex-1 gap-0 p-4.5 ring-border",
                  // The export tints the instructor's reply — see the
                  // component note for why it is staff and not "your own".
                  reply.fromStaff && "bg-hover"
                )}
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[15px] font-bold text-foreground">
                    {reply.author.name}
                  </span>
                  <RolePill author={reply.author} />
                  <span className="text-[13px] text-muted-foreground">
                    · {reply.age}
                  </span>
                </div>
                <p className="mt-2 text-[15px] leading-6 text-foreground">
                  {reply.body}
                </p>
                <div className="mt-3 flex items-center gap-5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setOptimistic((c) => ({ ...c, [reply.id]: !heart.liked }))
                      run(
                        { kind: "reply", id: reply.id },
                        () => toggleReplyLike(audience, reply.id),
                        true
                      )
                    }}
                    disabled={busy?.kind === "reply" && busy.id === reply.id}
                    aria-pressed={heart.liked}
                    aria-label={heart.liked ? "Remove like" : "Like this reply"}
                    className="h-auto gap-2 p-0 text-[14px] font-normal text-muted-foreground tabular-nums hover:bg-transparent hover:text-foreground"
                  >
                    {busy?.kind === "reply" && busy.id === reply.id ? (
                      <Spinner className="size-4" />
                    ) : (
                      <HeartIcon
                        className={cn(
                          "size-4",
                          heart.liked && "fill-current text-destructive"
                        )}
                      />
                    )}
                    {heart.count}
                  </Button>
                  {detail.canReply ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        // No nested card is drawn, so this mentions the author
                        // in the one composer rather than opening a second.
                        setDraft((current) =>
                          current.startsWith(`@${reply.author.name}`)
                            ? current
                            : `@${reply.author.name} ${current}`.trimEnd() + " "
                        )
                        composer.current?.focus()
                      }}
                      className="h-auto p-0 text-[14px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
                    >
                      {threadCopy.reply}
                    </Button>
                  ) : null}
                </div>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RolePill({ author }: { author: DiscussionRow["author"] }) {
  const role = authorRoleBadge(author.role)
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-medium",
        role.className
      )}
    >
      {role.label}
    </span>
  )
}

export { DiscussionThread }
