"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  moderatorPermissionRows,
  moderatorsDialogCopy,
  permissionSummary,
  type ModeratorPermission,
} from "@/lib/config/admin-community"
import {
  loadTopicModerators,
  searchModeratorCandidates,
  type ModeratorDraft,
} from "@/lib/actions/admin-community"
import type { ModeratorCandidate } from "@/lib/admin/community"
import { initialsOf } from "@/lib/user"
import { cn } from "@/lib/utils"

/**
 * "Moderators", from
 * `ui-design/light/dashboard/admin/moderators__dialog_admin.png`.
 *
 * It is a **staged editor**: adds, removals and permission changes accumulate
 * locally and commit on "Save changes", which is what makes that button mean
 * something and closing the dialog a discard. Nothing is written until then.
 *
 * **The Permissions section edits the selected moderator, not the topic**, and
 * this is the one place the export is not reproduced literally. It captions
 * that section "Applies to every moderator in this topic", which its own data
 * contradicts twice: the four rows directly above carry four *different*
 * summaries ("Pin, lock, delete", "Pin, lock", "Full control", "Pin,
 * delete"), and so does the Permissions column of the table behind it.
 * Uniform per-topic permissions cannot produce either, and `TopicModerator`
 * stores the four booleans per (topic, user) for that reason — its own note
 * calls them "the four permission switches it draws". So the moderator rows
 * are a radio group, the switches edit whoever is selected, and the caption
 * names them. Everything else — the order of the sections, the 34px avatars,
 * the red text Remove, the dark Add, the search field — is as drawn.
 *
 * **The list loads when the dialog opens**, not with the page: six topics'
 * moderator lists and candidate pools is work most visits never look at — the
 * arrangement `payout-run-dialog.tsx` records. The loader carries a
 * `.catch()` for that file's own reason: without one a rejected action leaves
 * the list spinning forever with nothing to say.
 *
 * **The export's "Cancel" is deliberately not reproduced**, per the standing
 * rule — `DialogContent` already draws a close X.
 */

type Draft = ModeratorDraft & {
  name: string
  email: string
  image: string | null
}

const SWITCH = cn(
  "border-0 p-[3px] data-[size=default]:h-6.5 data-[size=default]:w-11.5",
  "data-unchecked:bg-track dark:data-unchecked:bg-track",
  "[&_[data-slot=switch-thumb]]:size-5",
  "[&_[data-slot=switch-thumb]]:data-checked:translate-x-full"
)

function PersonAvatar({
  name,
  email,
  image,
}: {
  name: string
  email: string
  image: string | null
}) {
  return (
    <Avatar className="size-9 shrink-0">
      <AvatarImage
        src={image ?? undefined}
        alt=""
        referrerPolicy="no-referrer"
      />
      <AvatarFallback className="bg-hover text-[11px] font-semibold text-foreground">
        {initialsOf(name, email)}
      </AvatarFallback>
    </Avatar>
  )
}

function ModeratorsDialog({
  open,
  onOpenChange,
  topicId,
  topicName,
  /** Pre-selects a person — the Moderators table's Edit lands here. */
  focusUserId,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topicId: string | null
  topicName: string
  focusUserId?: string | null
  pending: boolean
  onSubmit: (drafts: ModeratorDraft[]) => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [drafts, setDrafts] = React.useState<Draft[]>([])
  const [selected, setSelected] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [candidates, setCandidates] = React.useState<ModeratorCandidate[]>([])
  const [searching, startSearching] = React.useTransition()

  // Loaded when the dialog opens, keyed on the topic — the same
  // adjust-state-during-render trigger the two form dialogs use, so a second
  // topic opened without closing the first re-loads rather than showing the
  // previous one's list.
  const loadKey = open && topicId ? topicId : null
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null)
  if (loadKey !== loadedKey) {
    setLoadedKey(loadKey)
    setDrafts([])
    setCandidates([])
    setSearch("")
    setSelected(null)
    setError(null)
    setLoading(loadKey !== null)
  }

  React.useEffect(() => {
    if (!loadKey) return
    let live = true
    loadTopicModerators(loadKey)
      .then((result) => {
        if (!live) return
        if (!result) {
          setError(moderatorsDialogCopy.currentEmpty)
          setLoading(false)
          return
        }
        const next = result.moderators.map((row) => ({
          userId: row.userId,
          name: row.name,
          email: row.email,
          image: row.image,
          canPin: row.canPin,
          canLock: row.canLock,
          canDelete: row.canDelete,
          canSuspend: row.canSuspend,
        }))
        setDrafts(next)
        setCandidates(result.candidates)
        setSelected(
          (focusUserId && next.some((row) => row.userId === focusUserId)
            ? focusUserId
            : next[0]?.userId) ?? null
        )
        setLoading(false)
      })
      .catch(() => {
        if (!live) return
        setError("That list could not be loaded.")
        setLoading(false)
      })
    return () => {
      live = false
    }
  }, [loadKey, focusUserId])

  function runSearch(term: string) {
    setSearch(term)
    if (!topicId) return
    startSearching(async () => {
      const next = await searchModeratorCandidates(topicId, term)
      setCandidates(next)
    })
  }

  function add(candidate: ModeratorCandidate) {
    setDrafts((current) => [
      ...current,
      {
        userId: candidate.userId,
        name: candidate.name,
        email: candidate.email,
        image: candidate.image,
        // The export's own defaults: pin and lock on, the two destructive
        // ones off — which is also what `TopicModerator`'s column defaults
        // already say.
        canPin: true,
        canLock: true,
        canDelete: false,
        canSuspend: false,
      },
    ])
    setCandidates((current) =>
      current.filter((row) => row.userId !== candidate.userId)
    )
    setSelected(candidate.userId)
  }

  function remove(userId: string) {
    setDrafts((current) => current.filter((row) => row.userId !== userId))
    setSelected((current) => {
      if (current !== userId) return current
      const rest = drafts.filter((row) => row.userId !== userId)
      return rest[0]?.userId ?? null
    })
  }

  function toggle(permission: ModeratorPermission, value: boolean) {
    setDrafts((current) =>
      current.map((row) =>
        row.userId === selected ? { ...row, [permission]: value } : row
      )
    )
  }

  const active = drafts.find((row) => row.userId === selected) ?? null
  const copy = moderatorsDialogCopy

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[560px] flex-col gap-0 p-0 sm:max-w-[560px]">
        <DialogHeader className="gap-2 px-7.5 pt-7.5">
          <DialogTitle className="text-xl font-bold">{copy.title}</DialogTitle>
          <DialogDescription className="text-[15px] leading-6">
            Managing{" "}
            <span className="font-semibold text-foreground">{topicName}</span>.
            Moderators act only inside this topic.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-7.5 pt-5 pb-7.5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="size-5 text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : (
            <>
              <section className="flex flex-col gap-2.5">
                <h3 className="text-[15px] font-bold">{copy.currentHeading}</h3>
                {drafts.length === 0 ? (
                  <p className="rounded-xl bg-soft px-4 py-5 text-center text-sm text-muted-foreground">
                    {copy.currentEmpty}
                  </p>
                ) : (
                  <div role="radiogroup" aria-label={copy.currentHeading}>
                    {drafts.map((row) => {
                      const isSelected = row.userId === selected
                      return (
                        <div
                          key={row.userId}
                          className={cn(
                            "mb-2.5 flex items-center gap-3.5 rounded-xl border-2 bg-soft px-4 py-3",
                            isSelected
                              ? "border-foreground"
                              : "border-transparent"
                          )}
                        >
                          {/* The row selects; Remove sits outside it so
                              removing somebody cannot also select them. */}
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5">
                            <input
                              type="radio"
                              name="topic-moderator"
                              value={row.userId}
                              checked={isSelected}
                              onChange={() => setSelected(row.userId)}
                              className="sr-only"
                            />
                            <PersonAvatar
                              name={row.name}
                              email={row.email}
                              image={row.image}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-[15px] leading-5 font-semibold">
                                {row.name}
                              </span>
                              <span className="block truncate text-[13px] leading-[18px] text-muted-foreground">
                                {permissionSummary(row)}
                              </span>
                            </span>
                          </label>
                          <Button
                            variant="outline"
                            disabled={pending}
                            onClick={() => remove(row.userId)}
                            className="h-9 shrink-0 bg-card px-3.5 text-destructive shadow-sm hover:text-destructive"
                          >
                            {copy.remove}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-2.5">
                <div>
                  <h3 className="text-[15px] font-bold">
                    {copy.permissionsHeading}
                  </h3>
                  <p className="text-[13px] text-muted-foreground">
                    {active
                      ? copy.permissionsLead(active.name)
                      : copy.permissionsNoSelection}
                  </p>
                </div>

                {moderatorPermissionRows.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5"
                  >
                    <div>
                      <Label
                        htmlFor={`permission-${row.key}`}
                        className={cn(
                          "text-[15px] leading-5 font-semibold",
                          active && "cursor-pointer"
                        )}
                      >
                        {row.title}
                      </Label>
                      <p className="text-[13px] leading-[18px] text-muted-foreground">
                        {row.description}
                      </p>
                    </div>
                    <Switch
                      id={`permission-${row.key}`}
                      disabled={!active}
                      checked={active ? active[row.key] : false}
                      onCheckedChange={(next) => toggle(row.key, next)}
                      className={SWITCH}
                    />
                  </div>
                ))}
              </section>

              <section className="flex flex-col gap-2.5">
                <h3 className="text-[15px] font-bold">{copy.addHeading}</h3>

                <div className="relative">
                  <SearchIcon
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={search}
                    onChange={(event) => runSearch(event.target.value)}
                    placeholder={copy.searchPlaceholder}
                    aria-label={copy.addHeading}
                    className="h-11 bg-background pl-10 text-[15px] md:text-[15px] dark:bg-background"
                  />
                </div>

                <div
                  className={cn(
                    "flex flex-col",
                    searching && "opacity-60 transition-opacity"
                  )}
                >
                  {candidates.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {copy.searchEmpty}
                    </p>
                  ) : (
                    candidates.map((candidate) => (
                      <div
                        key={candidate.userId}
                        className="flex items-center gap-3.5 py-2.5"
                      >
                        <PersonAvatar
                          name={candidate.name}
                          email={candidate.email}
                          image={candidate.image}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] leading-5 font-semibold">
                            {candidate.name}
                          </p>
                          <p className="truncate text-[13px] leading-[18px] text-muted-foreground">
                            {copy.candidateMeta(
                              candidate.role,
                              candidate.courseCount
                            )}
                          </p>
                        </div>
                        <Button
                          disabled={pending}
                          onClick={() => add(candidate)}
                          className="h-9 shrink-0 px-4"
                        >
                          {copy.add}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <div>
                <Button
                  loading={pending}
                  onClick={() =>
                    onSubmit(
                      drafts.map(
                        ({
                          userId,
                          canPin,
                          canLock,
                          canDelete,
                          canSuspend,
                        }) => ({
                          userId,
                          canPin,
                          canLock,
                          canDelete,
                          canSuspend,
                        })
                      )
                    )
                  }
                  className="h-11 px-5"
                >
                  {copy.submit}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { ModeratorsDialog }
