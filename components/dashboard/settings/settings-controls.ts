/**
 * The class vocabulary shared by every settings form, measured off
 * `setting-profile-page.png` and `settings-account-page.png` at DPR 2 — the
 * two exports draw identical geometry, so these live in one place rather than
 * being retyped per form and drifting.
 *
 * The values, for the record:
 *  - controls are **46px** (`h-11.5`) on `bg-background` with 14px side
 *    padding and a 15px value. That is the auth screens' control height, not
 *    the dashboard's usual 40px, because these are text fields rather than
 *    buttons.
 *  - labels are 15px/600 — `FieldLabel`'s own `text-sm font-medium` measures a
 *    step light against both exports.
 *  - descriptions are 13px, one step below the value.
 *  - the submit is 44px, 24px of side padding, 28px below the last field —
 *    `FieldGroup`'s `gap-5` covers the gaps *between* fields, so this margin
 *    only applies to a submit rendered outside the group.
 *
 * Two tokens here are not redundant, and both are the same trap:
 *
 *  - `md:text-[15px]`, because `Input`/`Textarea` carry their own
 *    `md:text-sm`, which a plain `text-[15px]` loses to above the `md`
 *    breakpoint.
 *  - `dark:bg-background`, because those components also carry
 *    `dark:bg-input/30` — a `:is(.dark *)`-wrapped selector that outranks a
 *    plain `bg-background` on specificity whatever order Tailwind emits them
 *    in. In dark mode that would fill the control *lighter* than the card it
 *    sits on, inverting the export's relationship (the control is the darker
 *    surface in both themes). Spelling the override with the same `dark:`
 *    prefix is what lets `cn()`'s tailwind-merge drop the generated one —
 *    it only does that when both carry the same variant — which is the same
 *    fix the auth screens' `dark:bg-card` inputs use.
 */
export const SETTINGS_CONTROL =
  "h-11.5 bg-background px-3.5 text-[15px] md:text-[15px] dark:bg-background"

export const SETTINGS_LABEL = "text-[15px] font-semibold"

export const SETTINGS_DESCRIPTION = "text-[13px]"

export const SETTINGS_SUBMIT = "mt-7 h-11 px-6"
