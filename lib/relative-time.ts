/**
 * "20m", "3h", "1d" — the compact ages every dashboard export draws, which
 * `date-fns`' `formatDistanceStrict` ("20 minutes") will not produce.
 *
 * It lives here rather than in any one surface because three now draw it: the
 * inbox's conversation list, the Discussions feed and its thread, and the
 * instructor's Q&A queue and its thread. Their exports all use the same
 * vocabulary — `messages-page.png` writes "20m", `discussions-page.png` "2h
 * ago", `Q&A-page.png` "48m ago" — so one formatter keeps them from drifting
 * into three spellings of the same minute.
 *
 * **It takes `now` rather than reading the clock**, so every row on a page is
 * measured against one instant: that is what keeps the render pure
 * (`Date.now()` in a component body is a `react-hooks/purity` error) and what
 * stops a list disagreeing with itself across a minute boundary. It is called
 * on the server and crosses as a string, for the two reasons
 * `audit-format.ts` records.
 */
export function compactAge(then: Date, now: Date): string {
  const seconds = Math.max(
    0,
    Math.round((now.getTime() - then.getTime()) / 1000)
  )
  if (seconds < 60) return "now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 52) return `${weeks}w`
  return `${Math.floor(days / 365)}y`
}

/** The same token with the word the prose surfaces add — "48m ago". The inbox
 *  list draws the bare token instead, because its column is 40px wide. */
export function compactAgo(then: Date, now: Date): string {
  const age = compactAge(then, now)
  return age === "now" ? "just now" : `${age} ago`
}

/**
 * "Today", "2 days ago", "3 weeks ago", "1 month ago" — the *prose* ladder,
 * beside the compact one above.
 *
 * Two vocabularies rather than one because the exports draw two: a queue whose
 * rows are minutes old says "48m ago" (`Q&A-page.png`), while a review or an
 * activity line reaching back weeks says "3 weeks ago"
 * (`course-reviews__tab.png`, `manage-course.png`). Compacting the second to
 * "3w ago" reads as a timestamp rather than a sentence, and expanding the
 * first to "48 minutes ago" is what `compactAge` exists to avoid.
 *
 * It began inside `lib/instructor-course-manage.ts` and moved here the moment
 * the enrolled course page needed the same ladder for its reviews — which is
 * the whole reason this module exists, stated in its own header.
 */
export function longAgo(then: Date, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - then.getTime())
  const DAY = 24 * 60 * 60 * 1000

  if (elapsed < DAY) return "Today"
  const days = Math.floor(elapsed / DAY)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`
  }
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30))
    return `${months} ${months === 1 ? "month" : "months"} ago`
  }
  const years = Math.floor(days / 365)
  return `${years} ${years === 1 ? "year" : "years"} ago`
}
