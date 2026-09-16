import type { CourseStatus } from "@/lib/generated/prisma/client"

/**
 * The course status pill, in one place.
 *
 * It began in `lib/config/admin-courses.ts` for the review queue, and moved
 * here when the instructor's `my-courses-page.png` drew the same six words in
 * the same slot — the call `userRoleBadge` already made when the audit log
 * wanted the role pill the Users table draws. **Two surfaces must not tint the
 * same word two ways**, and both exports are read from here now.
 *
 * Tints are a tenth-opacity semantic token behind that same token as the text,
 * rather than either export's literal hexes, so dark mode follows — the choice
 * `billing-transactions.tsx` documents. Sampled off both: In review is the
 * blue `--accent-2` (#3b82f6, which is the token exactly), Published
 * `--success`, Rejected `--destructive`, Needs changes the amber `--warning`.
 *
 * **Draft is amber too, and that is read off the instructor export** — the
 * only one of the two that draws a Draft pill, since the console's queue
 * excludes drafts outright. Its amber sits between `--warning` and `--star`,
 * the case the billing page's own note describes, and it lands on `--warning`.
 * That leaves Draft and Needs changes sharing a tint and told apart by the
 * word, which is the call the Users table settled for Inactive and Suspended:
 * a second amber one shade off would read as a rendering fault rather than a
 * distinction.
 *
 * ARCHIVED is the one state neither export draws. It takes the neutral tint,
 * because an archived course is not a problem — it is simply no longer on
 * sale.
 */
export type Badge = { label: string; className: string }

export function courseStatusBadge(status: CourseStatus): Badge {
  switch (status) {
    case "IN_REVIEW":
      return { label: "In review", className: "bg-accent-2/10 text-accent-2" }
    case "NEEDS_CHANGES":
      return {
        label: "Needs changes",
        className: "bg-warning/10 text-warning",
      }
    case "PUBLISHED":
      return { label: "Published", className: "bg-success/10 text-success" }
    case "REJECTED":
      return {
        label: "Rejected",
        className: "bg-destructive/10 text-destructive",
      }
    case "ARCHIVED":
      return { label: "Archived", className: "bg-hover text-muted-foreground" }
    default:
      return { label: "Draft", className: "bg-warning/10 text-warning" }
  }
}
