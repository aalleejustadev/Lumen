"use client"

import { cn } from "@/lib/utils"

/** Server-side minimum too — Better Auth's `minPasswordLength` default. */
const MIN_PASSWORD_LENGTH = 8

/**
 * Four buckets, scored on length first and character variety second — enough
 * to tell someone their password is thin without pretending to be an entropy
 * calculator. Nothing here gates submission; the server's minimum does that.
 */
function scorePassword(value: string) {
  if (!value) return 0
  let score = 0
  if (value.length >= MIN_PASSWORD_LENGTH) score += 1
  if (value.length >= 12) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/\d/.test(value) && /[^\w\s]/.test(value)) score += 1
  return Math.min(score, 4)
}

const strengthLabels = ["Too short", "Weak", "Fair", "Good", "Strong"]
const strengthTones = [
  "bg-destructive",
  "bg-destructive",
  "bg-warning",
  "bg-star",
  "bg-success",
]

function PasswordStrength({ value }: { value: string }) {
  const score = scorePassword(value)

  // An empty track under an untouched field is just noise.
  if (!value) return null

  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-track">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-200",
            strengthTones[score]
          )}
          style={{ width: `${Math.max(score, 1) * 25}%` }}
        />
      </div>
      <span className="w-[70px] shrink-0 text-right text-[13px] text-muted-foreground">
        {strengthLabels[score]}
      </span>
    </div>
  )
}

export { PasswordStrength, MIN_PASSWORD_LENGTH, scorePassword }
