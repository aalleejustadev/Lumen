import { cn } from "@/lib/utils"

/**
 * The class vocabulary the course editor's form steps share — Intended
 * learners, Course landing page and Pricing — kept beside them the way
 * `settings-controls.ts` is for the settings pages.
 *
 * Measured off `create-course-page__landing-page.png` and
 * `create-course-page__pricing.png` at DPR 2, which draw the **identical** card
 * `create-course-page.png` does: 28px padding, a 20px/700 heading over a 15px
 * lead, 16px labels, 44px fields filled with `--background` and a 40px submit.
 * Measured once, so three steps cannot drift into three looks.
 */

/** The card every form step sits on. */
export const EDITOR_CARD = "gap-0 p-7 ring-border"

export const EDITOR_HEADING = "text-xl leading-none font-bold"

/**
 * The lead, held to a **620px measure**. Both new exports wrap it inside a
 * much wider card — the landing page before "work.", pricing after "you earn"
 * — which the full content box does not do, so padding alone will not
 * reproduce it (`course-feedback-dialog.tsx` records the same point about its
 * own lead). Measured in the browser rather than off the export, whose type
 * shapes a few percent tighter: the pricing line needs 615px to keep "you
 * earn" and the landing line breaks correctly below 626px.
 *
 * It also opts out of the global `text-wrap: pretty` with `[text-wrap:wrap]`:
 * that rule refuses a one-word last line, so it pulled "the" down beside
 * "work." where the export wraps greedily — the reason `CLAUDE.md` gives for
 * the three other exports that opt out.
 */
export const EDITOR_LEAD =
  "mt-2.5 max-w-[620px] text-[15px] leading-[23px] text-muted-foreground [text-wrap:wrap]"

export const EDITOR_LABEL = "block text-[16px] leading-5 font-bold"

/**
 * `dark:bg-background` repeats the variant on purpose, and so does
 * `md:text-[15px]`: the generated field classes carry `dark:bg-input/30` and
 * `md:text-sm`, both wrapped selectors that beat a plain override on
 * specificity — the trap `settings-controls.ts` spells out. Repeating the
 * variant is what lets tailwind-merge drop the generated one; that is the fix,
 * not `!`.
 */
export const EDITOR_FIELD =
  "w-full rounded-lg bg-background px-3.5 text-[15px] outline-none ring-1 ring-transparent transition-shadow placeholder:text-subtle-foreground focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-background md:text-[15px]"

/**
 * `SelectTrigger` at the field's size. `data-[size=default]:h-11` repeats the
 * trigger's own attribute variant, which a plain `h-11` loses to on
 * specificity — the account form's note. The generated `border-input` is made
 * transparent because the exports draw these as filled boxes with no edge.
 */
export const EDITOR_SELECT = cn(
  EDITOR_FIELD,
  "justify-between gap-2 border-transparent py-0 pr-3.5 data-[size=default]:h-11 dark:hover:bg-background"
)

export const EDITOR_SUBMIT = "h-10 px-5"

/** `notifications-form.tsx`' 46 x 26 switch with a 20px thumb inset 3px — the
 *  size both toggle exports draw, reused rather than re-derived. */
export const EDITOR_SWITCH = cn(
  "border-0 p-[3px] data-[size=default]:h-6.5 data-[size=default]:w-11.5",
  "data-unchecked:bg-track dark:data-unchecked:bg-track",
  "[&_[data-slot=switch-thumb]]:size-5",
  "[&_[data-slot=switch-thumb]]:data-checked:translate-x-full"
)
