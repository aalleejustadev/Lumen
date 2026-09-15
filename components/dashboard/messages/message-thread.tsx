"use client"

import * as React from "react"
import { PaperclipIcon, SendHorizontalIcon } from "lucide-react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import {
  closedThreadReason,
  counterpartRole,
  MESSAGE_MAX,
  messagesCopy,
  type MessageAudience,
} from "@/lib/config/messages"
import { markConversationRead, sendMessage } from "@/lib/actions/messages"
import type { ActiveThread } from "@/lib/messages"
import { cn } from "@/lib/utils"

/**
 * The right column of both Messages exports — the person's header, the
 * transcript, and the composer.
 *
 * Measured off `ui-design/light/dashboard/instructor/messages-page.png` at
 * DPR 2 and identical in the learner's. The three bands are drawn at three
 * different insets and that is not a slip — each is symmetric in itself, and
 * the export really does set them apart:
 *
 *  - **Header: 68px, 20px sides**, a 40px avatar 12px from a 16px name over a
 *    13px muted line. Four pixels shorter than the list's own 72px search
 *    band, which is what the export draws — the two rules do not line up.
 *  - **Transcript: 22px padding, 14px between bubbles**, on the page ground
 *    (`--background`) rather than the card's white, which is what separates it
 *    from the two bands that close it.
 *  - **Composer: 72px, 18px sides**, a 40px attach button, an 11px gap, a 44px
 *    field and a 44px send button.
 *
 * A bubble is `rounded-xl` on 16px/12px padding with **15px** body copy and a
 * **right-aligned 12px** timestamp under it — right-aligned in both
 * directions, measured: the incoming bubble's time sits on the same trailing
 * edge as its text. Incoming is white inside a `--border` hairline; outgoing
 * is solid `--primary` with no hairline at all, which is why the two measure
 * 67px and 65px against identical content.
 *
 * **The paperclip is inert.** `MediaOwnerType.MESSAGE_ATTACHMENT` exists but
 * no upload path to it does, and a control that opens nothing is the promise
 * every unbuilt sidebar row refuses to make — so it is drawn disabled with the
 * reason on it, the treatment the Help Center gives "Open Discussions".
 */

/** The export's bubbles are far from this, but a wrapped one needs a measure:
 *  15px Figtree runs past 110 characters a line at the full column width. */
const BUBBLE_MAX = "max-w-[560px]"

type Pending = { id: string; body: string }

function MessageThread({
  audience,
  thread,
  unread,
}: {
  audience: MessageAudience
  thread: ActiveThread
  unread: number
}) {
  const [isSending, startSending] = React.useTransition()
  const [, startReading] = React.useTransition()
  const [draft, setDraft] = React.useState("")
  // Sent-but-not-yet-round-tripped messages. `useOptimistic` is the wrong tool
  // here: the action revalidates the *layout*, so the real row arrives on a
  // navigation rather than by resolving this component's own transition, and
  // an optimistic value tied to that transition would flicker out before it.
  const [pending, setPending] = React.useState<Pending[]>([])
  const viewport = React.useRef<HTMLDivElement>(null)
  const readFor = React.useRef<string | null>(null)

  // A thread the server has caught up on: drop the local copies, which are now
  // duplicated by real rows. Adjusted *during render* rather than in an effect
  // — React's own pattern for "a prop changed, reset some state", and the one
  // the hooks lint rule accepts; an effect here would render the duplicate
  // once before clearing it.
  const serverIds = `${thread.id}:${thread.messages
    .map((message) => message.id)
    .join(",")}`
  const [lastServerIds, setLastServerIds] = React.useState(serverIds)
  if (serverIds !== lastServerIds) {
    setLastServerIds(serverIds)
    setPending([])
  }

  // Opening a thread reads it. Fired once per thread and only while there is
  // something to clear — the action revalidates, so `unread` comes back zero
  // and the effect cannot re-enter.
  React.useEffect(() => {
    if (unread === 0 || readFor.current === thread.id) return
    readFor.current = thread.id
    startReading(async () => {
      await markConversationRead(audience, thread.id)
    })
  }, [audience, thread.id, unread])

  // A transcript opens on its end, and a sent message has to come into view.
  React.useEffect(() => {
    const node = viewport.current
    if (node) node.scrollTop = node.scrollHeight
  }, [thread.id, serverIds, pending.length])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || !thread.writable) return

    const local: Pending = { id: `pending-${Date.now()}`, body }
    setDraft("")
    setPending((current) => [...current, local])

    startSending(async () => {
      const result = await sendMessage(audience, thread.id, body)
      if (!result.ok) {
        // Put the words back rather than losing them to a failed send, and
        // take the optimistic bubble away so the transcript stops claiming
        // something was delivered.
        setPending((current) =>
          current.filter((entry) => entry.id !== local.id)
        )
        setDraft(body)
        toast.add({ title: result.message, type: "error" })
      }
    })
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Header — 68px, 20px sides -------------------------------------- */}
      <div className="flex h-17 shrink-0 items-center gap-3 border-b border-border px-5">
        <Avatar size="lg">
          <AvatarImage src={thread.counterpart.image ?? undefined} alt="" />
          <AvatarFallback className="text-[13px]">
            {thread.counterpart.initials}
          </AvatarFallback>
          {thread.counterpart.online ? (
            <AvatarBadge
              title={messagesCopy.presence}
              className="bg-success ring-card group-data-[size=lg]/avatar:size-2"
            />
          ) : null}
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-foreground">
            {thread.counterpart.name}
          </p>
          <p className="truncate text-[13px] text-muted-foreground">
            {counterpartRole[audience]}
            {thread.courseTitle ? ` · ${thread.courseTitle}` : ""}
          </p>
        </div>
      </div>

      {/* Transcript — page ground, 22px padding, 14px between bubbles ---- */}
      <div
        ref={viewport}
        className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto bg-background p-[22px]"
      >
        {thread.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              BUBBLE_MAX,
              "w-fit rounded-xl px-4 py-3",
              message.mine
                ? "self-end bg-primary text-primary-foreground"
                : "self-start border border-border bg-card"
            )}
          >
            <p className="text-[15px] leading-normal wrap-break-word whitespace-pre-wrap">
              {message.body}
            </p>
            <p
              className={cn(
                "mt-1 text-right text-[12px]",
                message.mine
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground"
              )}
            >
              {message.time}
            </p>
          </div>
        ))}

        {pending.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              BUBBLE_MAX,
              "w-fit self-end rounded-xl bg-primary px-4 py-3 text-primary-foreground opacity-70"
            )}
          >
            <p className="text-[15px] leading-normal wrap-break-word whitespace-pre-wrap">
              {entry.body}
            </p>
            <p className="mt-1 text-right text-[12px] text-primary-foreground/70">
              Sending…
            </p>
          </div>
        ))}
      </div>

      {/* Composer — 72px, 18px sides ------------------------------------ */}
      <form
        onSubmit={submit}
        className="flex h-18 shrink-0 items-center gap-[11px] border-t border-border px-[18px]"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled
          title={messagesCopy.attach}
          aria-label={messagesCopy.attach}
          className="size-10 shrink-0 rounded-lg bg-card"
        >
          <PaperclipIcon className="size-4.5" />
        </Button>

        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MESSAGE_MAX}
          disabled={!thread.writable}
          placeholder={
            thread.writable
              ? messagesCopy.composerPlaceholder
              : closedThreadReason[audience]
          }
          aria-label={messagesCopy.composerPlaceholder}
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3.5 text-[14px] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <Button
          type="submit"
          size="icon"
          loading={isSending}
          // Not disabled on an empty draft: the export draws the send button
          // solid over an empty field, and `submit` already returns early
          // with nothing to send. `writable` is the one thing that really
          // makes it unavailable.
          disabled={!thread.writable}
          aria-label={messagesCopy.send}
          className="size-11 shrink-0 rounded-lg"
        >
          <SendHorizontalIcon className="size-[18px]" />
        </Button>
      </form>
    </div>
  )
}

export { MessageThread }
