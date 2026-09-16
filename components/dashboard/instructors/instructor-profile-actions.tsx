"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, ChevronDownIcon, MailIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/toast"
import { setFollowingInstructor } from "@/lib/actions/instructor-follow"
import { openInstructorConversation } from "@/lib/actions/messages"
import type { ProfileRelationship } from "@/lib/instructor-relationship"

/**
 * The profile header's **Follow** and **Message**, which the export draws and
 * which did nothing until now. What each may do is decided on the server
 * (`getProfileRelationship`); this only draws that answer and acts on it.
 *
 *  - **Follow is optimistic** and settles on what the action reports, sending
 *    the *desired* state rather than a toggle so a double-click cannot undo
 *    itself. It reads **Following** once set, and the follower count beside it
 *    moves with it. On an instructor with no database row it is drawn disabled
 *    with the reason.
 *  - **Message is drawn only for a viewer enrolled in one of this instructor's
 *    courses** — the rule the messaging system already enforces, and re-checks
 *    in the action. It opens the thread in `/dashboard/messages`. With more
 *    than one such course it becomes a menu, because a conversation is about a
 *    course.
 *  - Neither is drawn on the instructor's own profile.
 */
function InstructorProfileActions({
  instructorSlug,
  relationship,
}: {
  instructorSlug: string
  relationship: ProfileRelationship
}) {
  const router = useRouter()
  const [following, setFollowing] = React.useState(relationship.following)
  const [followers, setFollowers] = React.useState(relationship.followerCount)
  const [followPending, startFollow] = React.useTransition()
  const [messagePending, startMessage] = React.useTransition()

  if (relationship.isSelf) return null

  function toggleFollow() {
    const next = !following
    const previous = { following, followers }
    setFollowing(next)
    setFollowers((count) => Math.max(0, count + (next ? 1 : -1)))
    startFollow(async () => {
      const result = await setFollowingInstructor(instructorSlug, next)
      if (!result.ok) {
        setFollowing(previous.following)
        setFollowers(previous.followers)
        toast.add({ title: result.message, type: "error" })
        return
      }
      setFollowing(result.following)
      setFollowers(result.followerCount)
    })
  }

  function message(courseId: string) {
    startMessage(async () => {
      const result = await openInstructorConversation(instructorSlug, courseId)
      if (!result.ok || !result.conversationId) {
        toast.add({ title: result.message, type: "error" })
        return
      }
      // The navigation is the feedback; a toast would land on a page that has
      // already moved on.
      router.push(`/dashboard/messages?c=${result.conversationId}`)
    })
  }

  const courses = relationship.messageCourses

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {relationship.followable ? (
        following ? (
          <Button
            variant="outline"
            onClick={toggleFollow}
            aria-pressed
            className="gap-1.5 bg-card font-semibold shadow-sm"
          >
            <CheckIcon data-icon="inline-start" className="size-4" />
            Following
          </Button>
        ) : (
          <Button
            onClick={toggleFollow}
            aria-pressed={false}
            className="gap-1.5 font-semibold shadow-sm"
          >
            <PlusIcon data-icon="inline-start" className="size-4" />
            Follow
          </Button>
        )
      ) : (
        <Button
          disabled
          title="This instructor can't be followed yet."
          className="gap-1.5 font-semibold shadow-sm"
        >
          <PlusIcon data-icon="inline-start" className="size-4" />
          Follow
        </Button>
      )}

      {courses.length === 1 ? (
        <Button
          variant="outline"
          loading={messagePending}
          onClick={() => message(courses[0]!.id)}
          className="gap-1.5 bg-card font-semibold shadow-sm"
        >
          <MailIcon data-icon="inline-start" className="size-4" />
          Message
        </Button>
      ) : courses.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                loading={messagePending}
                className="gap-1.5 bg-card font-semibold shadow-sm"
              />
            }
          >
            <MailIcon data-icon="inline-start" className="size-4" />
            Message
            <ChevronDownIcon data-icon="inline-end" className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {/* A `DropdownMenuLabel` throws outside a group — `CLAUDE.md`. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Which course is this about?</DropdownMenuLabel>
              {courses.map((course) => (
                <DropdownMenuItem
                  key={course.id}
                  onClick={() => message(course.id)}
                  className="cursor-pointer p-2"
                >
                  <span className="truncate">{course.title}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {relationship.followable ? (
        // Kept outside the buttons so an instructor with no followers still
        // reads as a fact ("0 followers") rather than an empty space.
        <span
          className="text-sm text-muted-foreground tabular-nums"
          aria-live="polite"
        >
          {followers.toLocaleString("en-US")}{" "}
          {followers === 1 ? "follower" : "followers"}
        </span>
      ) : null}

      {followPending ? <span className="sr-only">Saving…</span> : null}
    </div>
  )
}

export { InstructorProfileActions }
