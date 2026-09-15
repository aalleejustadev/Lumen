"use client"

import * as React from "react"
import { GraduationCapIcon, PenSquareIcon, UsersIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ConversationList } from "@/components/dashboard/messages/conversation-list"
import { MessageThread } from "@/components/dashboard/messages/message-thread"
import { NewMessageDialog } from "@/components/dashboard/messages/new-message-dialog"
import {
  counterpartRole,
  messagesCopy,
  messagesEmpty,
  messagesLead,
  type MessageAudience,
} from "@/lib/config/messages"
import type { MessagesPage as MessagesPageData } from "@/lib/messages"

/**
 * The Messages page, shared by **both** modes — the learner's
 * `/dashboard/messages` and the instructor's `/dashboard/instructor/messages`
 * are this component with a different `audience`, the arrangement the
 * notification feed already has and for the same reason: the two exports
 * (`ui-design/light/dashboard/student/messages-page.png` and
 * `…/instructor/messages-page.png`) are one drawing at two sets of copy,
 * measured landmark for landmark and identical on every one of them.
 *
 * Measured off those exports at DPR 2: the dashboard's usual page inset and
 * the same 32px/700 title over a 15px lead every other page carries — the
 * header block is *pixel-identical* to `courses-page__admin.png`'s (the h1 cap
 * and the lead ink land on the same rows), so it is that page's header rather
 * than a second measurement. Under it sits one **619px** card, full content
 * width, split by a `--border` rule into a 320px conversation column and the
 * thread.
 *
 * **The card's height is the export's own, not the viewport's.** Both exports
 * draw 619px over different canvases — the student's crop is 142px shorter
 * than the instructor's and the card is the same size in each — so it is a
 * fixed height rather than a `100svh` calculation, and the two panes scroll
 * inside it. That is also what keeps the composer on screen without a sticky
 * footer.
 *
 * It is `"use client"` all the way up for `wishlist-page.tsx`' reason: the
 * page's own action sits *in* the title's row, so the header is client either
 * way. The route strips nothing on the way in — everything `getMessagesPage`
 * returns is plain data, formatted on the server (see that module's note about
 * relative time).
 *
 * **The page lead follows the open thread**, which is what both exports draw
 * there: "Student · Mastering Illustration" over the instructor's, "Instructor
 * · Mastering Illustration" over the learner's — the same line the
 * conversation header carries. With nothing open it falls back to the mode's
 * own standing lead, which the exports never had to show.
 */

function MessagesPage({
  audience,
  data,
}: {
  audience: MessageAudience
  data: MessagesPageData
}) {
  const [composing, setComposing] = React.useState(false)
  const empty = messagesEmpty[audience]
  const EmptyIcon = audience === "INSTRUCTOR" ? UsersIcon : GraduationCapIcon

  const activeUnread =
    data.conversations.find((entry) => entry.id === data.active?.id)?.unread ??
    0

  const lead = data.active
    ? `${counterpartRole[audience]}${
        data.active.courseTitle ? ` · ${data.active.courseTitle}` : ""
      }`
    : messagesLead[audience]

  const blank = data.conversations.length === 0 && data.query.search === ""

  return (
    <main className="w-full px-6 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* `font-bold` explicitly: `globals.css` sets every `h1` to 800 and
              the dashboard exports draw 700 — the note `CLAUDE.md` gives. */}
          <h1 className="text-[32px] leading-none font-bold">
            {messagesCopy.title}
          </h1>
          <p className="mt-2.5 truncate text-[15px] text-muted-foreground">
            {lead}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setComposing(true)}
          className="h-10 shrink-0 gap-2 px-4"
        >
          <PenSquareIcon className="size-4" />
          {messagesCopy.newMessage}
        </Button>
      </div>

      <Card className="mt-6 h-[619px] flex-row gap-0 overflow-hidden p-0 [--card-spacing:0px]">
        {blank ? (
          <Empty className="flex-1">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <EmptyIcon />
              </EmptyMedia>
              <EmptyTitle>{empty.title}</EmptyTitle>
              <EmptyDescription>{empty.description}</EmptyDescription>
            </EmptyHeader>
            <Button
              type="button"
              onClick={() => setComposing(true)}
              className="h-10 gap-2 px-4"
            >
              <PenSquareIcon className="size-4" />
              {messagesCopy.newMessage}
            </Button>
          </Empty>
        ) : (
          <div className="flex min-h-0 w-full flex-col md:flex-row">
            <ConversationList
              conversations={data.conversations}
              activeId={data.active?.id ?? null}
              search={data.query.search}
            />
            {data.active ? (
              <MessageThread
                audience={audience}
                thread={data.active}
                unread={activeUnread}
              />
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center bg-background p-8">
                <p className="text-[15px] text-muted-foreground">
                  {messagesCopy.noMatches}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      <NewMessageDialog
        audience={audience}
        open={composing}
        onOpenChange={setComposing}
      />
    </main>
  )
}

export { MessagesPage }
