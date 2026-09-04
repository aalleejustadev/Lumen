import { cn } from "@/lib/utils"

/** The "or" rule between the social buttons and the email form. */
function AuthDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("my-6 flex items-center gap-4 text-center", className)}
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-border" />
      <span className="text-[13px] text-subtle-foreground">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

export { AuthDivider }
