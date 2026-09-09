"use client"

import * as React from "react"
import Link from "next/link"
import {
  CircleCheckIcon,
  EllipsisIcon,
  MailIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { userRowMenu } from "@/lib/config/admin-users"
import type { UserRow } from "@/lib/admin/users"

/**
 * The `⋯` menu at the end of each row, from the popup
 * `users-page__admin.png` draws open over row six: **View profile**,
 * **Message**, and a red **Suspend**.
 *
 * All three are reproduced, and each one had to be decided:
 *
 *  - **View profile** goes to `/dashboard/instructors/[slug]`, which is the
 *    only public page any account has. A learner has none — there is no route
 *    for one and no export asking for one — so for those rows the item is
 *    drawn *disabled* with the reason beside it rather than dropped. Dropping
 *    it would make the menu change shape row to row for no reason the reader
 *    can see; linking it somewhere would be a 404. Give learners a profile
 *    page and this becomes an ordinary link.
 *  - **Message** is a `mailto:`. Lumen has `Conversation`/`Message` models but
 *    no messaging surface, so an in-app thread is not a thing this can open;
 *    the address is right there in the row, and mail is what "message this
 *    person" means until there is somewhere else for it to go.
 *  - **Suspend** is real, and flips to **Reactivate** for an account that is
 *    already suspended — the export only ever draws an active row, so the
 *    other half of the toggle is inferred. It runs `setUserStatus`, which
 *    writes the audit entry and refuses the two cases that would lock the
 *    console; see that action.
 */
function UserRowActions({
  user,
  pending,
  onSetStatus,
}: {
  user: UserRow
  pending: boolean
  onSetStatus: (status: "ACTIVE" | "SUSPENDED") => void
}) {
  const suspended = user.status === "SUSPENDED"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${user.name}`}
        className="grid size-8 cursor-pointer place-items-center rounded-md text-subtle-foreground transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <EllipsisIcon className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        {user.instructorSlug ? (
          <DropdownMenuItem
            render={
              <Link href={`/dashboard/instructors/${user.instructorSlug}`} />
            }
            className="cursor-pointer p-2"
          >
            <UserRoundIcon />
            {userRowMenu.viewProfile}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled
            title={userRowMenu.viewProfileUnavailable}
            className="p-2"
          >
            <UserRoundIcon />
            {userRowMenu.viewProfile}
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          render={<a href={`mailto:${user.email}`} />}
          className="cursor-pointer p-2"
        >
          <MailIcon />
          {userRowMenu.message}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={pending}
          onClick={() => onSetStatus(suspended ? "ACTIVE" : "SUSPENDED")}
          className={
            suspended
              ? "cursor-pointer p-2"
              : "cursor-pointer p-2 text-destructive [&_svg]:text-destructive"
          }
        >
          {suspended ? <CircleCheckIcon /> : <XIcon />}
          {suspended ? userRowMenu.reactivate : userRowMenu.suspend}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { UserRowActions }
