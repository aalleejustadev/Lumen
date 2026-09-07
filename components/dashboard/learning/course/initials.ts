/**
 * "Nadia Rahman" -> "NR", for the `AvatarFallback` behind everyone who
 * doesn't have a supplied headshot. Shared by the three surfaces on this page
 * that render a person (the instructor strip, Q&A, reviews) so they can't
 * disagree.
 *
 * Distinct from `initialsOf` in `lib/user.ts`, which falls back to an email
 * address — these are course participants, not the signed-in user, and there
 * is no address to fall back to.
 */
export function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
