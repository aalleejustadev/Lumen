import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-loading:pointer-events-none data-loading:cursor-wait dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-loading:[&>svg:not([data-slot=spinner])]:hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * **Local addition: `loading`.** The generated component has no pending state,
 * so every call site that ran a Server Action had to hand-roll the same three
 * things — `disabled={pending}`, a `{pending ? <Spinner/> : <Icon/>}` swap and
 * a label change — and most of them only did the first, leaving a button that
 * looked idle while the work ran. `loading` is that pattern in one place:
 *
 *  - it disables the button, so a second click can't fire the action twice;
 *  - it sets `aria-busy`, which is what tells a screen reader the control is
 *    working rather than simply unavailable;
 *  - it renders a `Spinner` **and hides the button's own icon**, via
 *    `data-loading:[&>svg:not([data-slot=spinner])]:hidden` in the base
 *    variant, so the glyph is replaced rather than joined and the button keeps
 *    its width. `aria-disabled:` is spelled alongside `disabled:` in that same
 *    string because a `nativeButton={false}` button (one rendered as a link)
 *    carries the aria attribute rather than the DOM property, and without it
 *    those stayed fully lit and clickable while loading.
 *
 * Prefer `loading={pending}` over `disabled={pending}` for anything
 * asynchronous. `disabled` still means "unavailable", and the two compose.
 *
 * `npx shadcn@latest add button` will revert this along with the
 * `cursor-pointer` fix `CLAUDE.md` records; re-apply both.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & { loading?: boolean }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {/* `aria-busy` on the button is what announces the pending state, so the
          spinner itself is hidden from the accessibility tree — `Spinner`'s own
          `role="status"` inside a button would otherwise be announced twice. */}
      {loading ? (
        <Spinner role={undefined} aria-label={undefined} aria-hidden />
      ) : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
