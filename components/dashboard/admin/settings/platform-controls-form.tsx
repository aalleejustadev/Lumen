"use client"

import * as React from "react"
import { CheckCheckIcon, CheckIcon, LoaderCircleIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { MaintenanceDialog } from "@/components/dashboard/admin/settings/maintenance-dialog"
import { BrandingUpload } from "@/components/dashboard/admin/settings/branding-upload"
import {
  updatePlatformSettings,
  type PlatformSettingsPatch,
} from "@/lib/actions/admin-settings"
import {
  categoryAccentClasses,
  categoryAccentLabels,
} from "@/lib/config/admin-categories"
import {
  maintenanceToggle,
  META_DESCRIPTION_MAX,
  platformControlsCopy,
  platformCurrencies,
  platformToggles,
  PLATFORM_ACCENTS,
  revenueShareOptions,
  SUPPORT_EMAIL_MAX,
  WEBSITE_TITLE_MAX,
} from "@/lib/config/admin-settings"
import type { PlatformSetting } from "@/lib/generated/prisma/client"
import { cn } from "@/lib/utils"

/**
 * `/dashboard/admin/settings/platform`, from
 * `ui-design/light/dashboard/admin/platform-settings.png`. The card, heading
 * and sections nav come from the settings layout; this is everything inside
 * the card.
 *
 * Measured off that export at DPR 2 and verified against the render (the card
 * is the same 922px on 30px padding as the other three sections, so nothing
 * about the shell is re-measured): a 56px branding tile beside 40px buttons,
 * six **34px** accent swatches on a **9px** gap, 44px text controls, a 118px
 * meta-description box, **70px** toggle rows on a **13px** gap, and a
 * three-column defaults grid.
 *
 * **The page has no submit button, and that is the whole design.** The export
 * draws none anywhere — it says "Changes save automatically" under the search
 * block instead — so every control saves itself as it is used. Two
 * consequences worth knowing:
 *
 *  - **A save is a patch, never the whole row.** `updatePlatformSettings`
 *    takes only the key that changed, so two admins with this page open
 *    cannot silently undo each other's unrelated edits. A form that posted
 *    all thirteen columns on every switch would do exactly that.
 *  - **Text fields save on `blur`, not on keystroke.** A controlled field
 *    that wrote on every character would be a database write per letter and
 *    a race between them. Blur is also when a person has finished the
 *    thought, which is what the autosave line promises.
 *
 * The status line is the export's own sentence at rest and reports the write
 * while it happens. It is a **state machine, not a timer** — idle → saving →
 * saved, and "saved" simply persists until the next edit. A `setTimeout` back
 * to idle would need an effect, which is both the `react-hooks` rule this
 * repo already trips over elsewhere and more machinery than the line is
 * worth.
 *
 * Every control is **controlled**, held in one state object seeded once from
 * the server's row and never re-synced from props — the reasoning
 * `notifications-form.tsx` spells out. It matters more here: this page
 * revalidates `/` as a layout (the public site renders these values), so
 * fresh props arrive after *every* save, and copying them back over state
 * would stamp on an edit made while a write was in flight.
 *
 * **Maintenance mode is the one control that is confirmed.** The four
 * switches above it change who can sign up or publish; this one, by its own
 * description, signs every non-admin out. The confirmation is a UI
 * affordance and not the guard — the action validates it like any other
 * column. See `maintenance-dialog.tsx`.
 *
 * **The export's two character counters do not match its own strings.** It
 * draws `52 / 60` beside a title that is 40 characters and `138 / 160`
 * beside a description that is 130 — the same hand-placed numbers its
 * sibling exports put on the categories page's percentages and the community
 * tiles. The counters here are computed from the field, so they are right and
 * differ from the drawing; that is the reading every one of those pages
 * settled.
 */

/** 18px/700 section heading — explicit, because `globals.css` sets `h2` to 800. */
const HEADING = "text-lg font-bold"

/** The 44px text control this card draws, one step down from the 46px the
 *  learner's settings forms use. `dark:bg-background` repeats the variant so
 *  tailwind-merge can drop `Input`'s own `dark:bg-input/30` — the specificity
 *  trap `settings-controls.ts` records; `md:text-[15px]` is there for the
 *  same reason against `md:text-sm`. */
const FIELD = cn(
  "h-11 rounded-lg border-border bg-background px-3.5 text-[15px] md:text-[15px]",
  "dark:bg-background"
)

/** The row card. A plain `div` rather than a `Card`: `Card`'s hairline is a
 *  `ring`, which paints outside the layout box and would make the drawn 13px
 *  gap read as 11 — the trap the wishlist rows record. */
const TOGGLE_ROW =
  "flex min-h-[70px] items-center justify-between gap-4 rounded-xl border px-5 py-3.5"

/** `notifications-form.tsx`' 46 x 26 switch with a 20px thumb inset 3px, the
 *  same one this export draws — not the generated 32 x 18.4. */
const SWITCH = cn(
  "border-0 p-[3px] data-[size=default]:h-6.5 data-[size=default]:w-11.5",
  "data-unchecked:bg-track dark:data-unchecked:bg-track",
  "[&_[data-slot=switch-thumb]]:size-5",
  "[&_[data-slot=switch-thumb]]:data-checked:translate-x-full"
)

const FIELD_LABEL = "text-[13px] font-semibold"

type SaveState = "idle" | "saving" | "saved" | "error"

type FormValues = {
  accentColor: string
  websiteTitle: string
  metaDescription: string
  supportEmail: string
  currency: string
  defaultRevenueShareBps: number
  instructorApplicationsOpen: boolean
  newStudentSignupsOpen: boolean
  requireManualCourseReview: boolean
  autoEnrollNewCoursesInPromotions: boolean
  maintenanceMode: boolean
}

function PlatformControlsForm({ settings }: { settings: PlatformSetting }) {
  const copy = platformControlsCopy

  const [values, setValues] = React.useState<FormValues>({
    accentColor: settings.accentColor,
    websiteTitle: settings.websiteTitle,
    metaDescription: settings.metaDescription,
    supportEmail: settings.supportEmail,
    currency: settings.currency,
    defaultRevenueShareBps: settings.defaultRevenueShareBps,
    instructorApplicationsOpen: settings.instructorApplicationsOpen,
    newStudentSignupsOpen: settings.newStudentSignupsOpen,
    requireManualCourseReview: settings.requireManualCourseReview,
    autoEnrollNewCoursesInPromotions: settings.autoEnrollNewCoursesInPromotions,
    maintenanceMode: settings.maintenanceMode,
  })

  const [status, setStatus] = React.useState<SaveState>("idle")
  const [confirmMaintenance, setConfirmMaintenance] = React.useState(false)
  const [, startSaving] = React.useTransition()

  /**
   * What each text field last held on the server. A blur only writes when the
   * value actually moved, so tabbing straight through the card is silent.
   * A ref rather than state: nothing renders from it, and updating it must
   * not itself cause a render.
   */
  const saved = React.useRef({
    websiteTitle: settings.websiteTitle,
    metaDescription: settings.metaDescription,
    supportEmail: settings.supportEmail,
  })

  function save(patch: PlatformSettingsPatch, onFail?: () => void) {
    setStatus("saving")
    startSaving(async () => {
      const result = await updatePlatformSettings(patch)
      setStatus(result.ok ? "saved" : "error")
      if (!result.ok) {
        // The status line says *that* it failed; the toast says why, which is
        // where the action's own sentence belongs.
        toast.add({ title: result.message, type: "error" })
        onFail?.()
      }
    })
  }

  /**
   * Blur handler for the three text fields — writes only on a real change,
   * so tabbing straight through the card is silent.
   *
   * Called as `onBlur={() => saveText("websiteTitle")}` rather than through a
   * `saveText(key)` factory used directly as the handler. The factory read
   * `saved.current` from a closure built *during* render, which the
   * `react-hooks/refs` rule rightly refuses: a ref must not be touched while
   * rendering. Taking the key as an argument keeps every read inside the
   * event.
   */
  function saveText(key: "websiteTitle" | "metaDescription" | "supportEmail") {
    const previous = saved.current[key]
    const next = values[key].trim()
    if (next === previous) return

    if (next.length === 0) {
      // Put the server's value back rather than writing an empty one: the
      // action would refuse it anyway, and a field left blank on screen would
      // misreport what the site is actually serving.
      setValues((current) => ({ ...current, [key]: previous }))
      return
    }

    saved.current[key] = next
    setValues((current) => ({ ...current, [key]: next }))
    save({ [key]: next } as PlatformSettingsPatch, () => {
      saved.current[key] = previous
      setValues((current) => ({ ...current, [key]: previous }))
    })
  }

  function saveToggle(name: string, value: boolean) {
    setValues((current) => ({ ...current, [name]: value }))
    save({ toggle: { name, value } }, () =>
      // Put the switch back if the write was refused, so the row never
      // advertises a setting the platform is not running under.
      setValues((current) => ({ ...current, [name]: !value }))
    )
  }

  return (
    <div>
      <div>
        <h2 className={HEADING}>{copy.title}</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {copy.description}
        </p>
      </div>

      {/* Branding ---------------------------------------------------------- */}
      <section className="mt-7">
        <h3 className="text-[15px] font-bold">{copy.brandingHeading}</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {copy.brandingDescription}
        </p>

        <div className="mt-4">
          <BrandingUpload logoUrl={settings.logoUrl} />
        </div>

        <p className="mt-5 mb-2.5 text-[13px] font-semibold">
          {copy.accentLabel}
        </p>
        {/* Native radios inside their labels (`sr-only`, not removed), so
            arrow-key selection and the group's screen-reader semantics come
            from the platform — the arrangement the quiz options, the
            new-user role cards and `category-dialog.tsx`' own swatch row all
            use. The classes come from `categoryAccentClasses` rather than a
            second palette; see `PLATFORM_ACCENTS`. */}
        <div
          role="radiogroup"
          aria-label={copy.accentLabel}
          className="flex flex-wrap gap-[9px]"
        >
          {PLATFORM_ACCENTS.map((accent) => {
            const selected = values.accentColor === accent
            return (
              <label
                key={accent}
                className={cn(
                  // Every swatch carries the 3px border so selecting one
                  // cannot resize it — transparent on the five unselected,
                  // since a background paints under a border by default.
                  "grid size-[34px] cursor-pointer place-items-center rounded-lg border-[3px] transition-colors",
                  "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                  categoryAccentClasses[accent].swatch,
                  selected ? "border-foreground" : "border-transparent"
                )}
                title={categoryAccentLabels[accent]}
              >
                <input
                  type="radio"
                  name="platform-accent"
                  value={accent}
                  checked={selected}
                  onChange={() => {
                    const previous = values.accentColor
                    setValues((current) => ({
                      ...current,
                      accentColor: accent,
                    }))
                    save({ accentColor: accent }, () =>
                      setValues((current) => ({
                        ...current,
                        accentColor: previous,
                      }))
                    )
                  }}
                  className="sr-only"
                />
                <span className="sr-only">{categoryAccentLabels[accent]}</span>
                {selected ? (
                  <CheckIcon
                    aria-hidden
                    className="size-4 text-white"
                    strokeWidth={3}
                  />
                ) : null}
              </label>
            )
          })}
        </div>
      </section>

      {/* Search appearance ------------------------------------------------- */}
      <section className="mt-7">
        <h3 className="text-[15px] font-bold">{copy.searchHeading}</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {copy.searchDescription}
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <Label htmlFor="website-title" className={FIELD_LABEL}>
                {copy.websiteTitleLabel}
              </Label>
              {/* The export's own `52 / 60`. It is a *guide*, not a limit that
                  bites mid-typing: `maxLength` caps the field, and the count
                  turns destructive as it approaches so the writer can see the
                  title is about to be truncated in a search result. */}
              <span
                className={cn(
                  "text-[13px] tabular-nums",
                  values.websiteTitle.length > WEBSITE_TITLE_MAX - 5
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {values.websiteTitle.length} / {WEBSITE_TITLE_MAX}
              </span>
            </div>
            <Input
              id="website-title"
              value={values.websiteTitle}
              maxLength={WEBSITE_TITLE_MAX}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  websiteTitle: event.target.value,
                }))
              }
              onBlur={() => saveText("websiteTitle")}
              className={FIELD}
            />
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <Label htmlFor="meta-description" className={FIELD_LABEL}>
                {copy.metaDescriptionLabel}
              </Label>
              <span
                className={cn(
                  "text-[13px] tabular-nums",
                  values.metaDescription.length > META_DESCRIPTION_MAX - 10
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {values.metaDescription.length} / {META_DESCRIPTION_MAX}
              </span>
            </div>
            <Textarea
              id="meta-description"
              value={values.metaDescription}
              maxLength={META_DESCRIPTION_MAX}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  metaDescription: event.target.value,
                }))
              }
              onBlur={() => saveText("metaDescription")}
              className={cn(
                "min-h-[118px] rounded-lg border-border bg-background px-3.5 py-3 text-[15px] md:text-[15px]",
                "dark:bg-background"
              )}
            />
          </div>

          {/* The search preview. It reads the two fields *live* rather than
              the saved row, which is the only way it can do its job — the
              point of the block is to see how an edit will land before it is
              committed. The colours are Google's own result styling, which is
              what the export draws; they are literal rather than themed
              because they are a quotation of another surface, not part of
              this one. */}
          <div className="rounded-xl bg-background p-4">
            <p className="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
              {copy.searchPreviewLabel}
            </p>
            <p className="mt-2.5 text-[13px] text-[#3c8f4e] dark:text-[#6cc47f]">
              {copy.searchPreviewHost}
            </p>
            <p className="mt-1 text-[18px] leading-6 text-[#1a0dab] dark:text-[#8ab4f8]">
              {values.websiteTitle}
            </p>
            <p className="mt-1 text-[13px] leading-[19px] text-muted-foreground">
              {values.metaDescription}
            </p>
          </div>

          <AutosaveStatus status={status} />
        </div>
      </section>

      {/* Access & moderation ----------------------------------------------- */}
      <section className="mt-7">
        <h3 className={HEADING}>{copy.accessHeading}</h3>
        <div className="mt-4 flex flex-col gap-3.5">
          {platformToggles.map((toggle) => (
            <div key={toggle.name} className={TOGGLE_ROW}>
              <div className="min-w-0">
                <Label
                  htmlFor={toggle.name}
                  className="cursor-pointer text-[15px] leading-5 font-semibold"
                >
                  {toggle.title}
                </Label>
                <p className="text-[13px] leading-[18px] text-muted-foreground">
                  {toggle.description}
                </p>
              </div>
              <Switch
                id={toggle.name}
                checked={values[toggle.name]}
                onCheckedChange={(next) => saveToggle(toggle.name, next)}
                className={SWITCH}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Defaults ----------------------------------------------------------- */}
      <section className="mt-7">
        <h3 className={HEADING}>{copy.defaultsHeading}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="platform-currency" className={FIELD_LABEL}>
              {copy.currencyLabel}
            </Label>
            {/* `NativeSelect` hands `className` to its *wrapper* and hardcodes
                `h-8 pl-2.5 text-sm` on the inner `<select>`, so the 44px box
                is reached with `[&_select]:` descendant selectors — (0,1,1)
                beats (0,1,0) whatever order Tailwind emits. `bg-background!`
                is the one `!`, for the reason `profile-form.tsx` records: the
                select's `dark:bg-input/30` is (0,2,0), which a descendant
                override cannot outrank and tailwind-merge cannot drop. */}
            <NativeSelect
              id="platform-currency"
              value={values.currency}
              onChange={(event) => {
                const previous = values.currency
                const next = event.target.value
                setValues((current) => ({ ...current, currency: next }))
                save({ currency: next }, () =>
                  setValues((current) => ({ ...current, currency: previous }))
                )
              }}
              className={cn(
                "mt-2 w-full",
                "[&_select]:h-11 [&_select]:rounded-lg [&_select]:border-border [&_select]:bg-background! [&_select]:pl-3.5 [&_select]:text-[15px]",
                "[&_[data-slot=native-select-icon]]:right-3.5"
              )}
            >
              {platformCurrencies.map((currency) => (
                <NativeSelectOption key={currency.value} value={currency.value}>
                  {currency.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div>
            <Label htmlFor="revenue-share" className={FIELD_LABEL}>
              {copy.revenueShareLabel}
            </Label>
            <NativeSelect
              id="revenue-share"
              value={String(values.defaultRevenueShareBps)}
              onChange={(event) => {
                const previous = values.defaultRevenueShareBps
                const next = Number(event.target.value)
                setValues((current) => ({
                  ...current,
                  defaultRevenueShareBps: next,
                }))
                save({ defaultRevenueShareBps: next }, () =>
                  setValues((current) => ({
                    ...current,
                    defaultRevenueShareBps: previous,
                  }))
                )
              }}
              className={cn(
                "mt-2 w-full",
                "[&_select]:h-11 [&_select]:rounded-lg [&_select]:border-border [&_select]:bg-background! [&_select]:pl-3.5 [&_select]:text-[15px]",
                "[&_[data-slot=native-select-icon]]:right-3.5"
              )}
            >
              {revenueShareOptions.map((option) => (
                <NativeSelectOption
                  key={option.value}
                  value={String(option.value)}
                >
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div>
            <Label htmlFor="support-email" className={FIELD_LABEL}>
              {copy.supportEmailLabel}
            </Label>
            <Input
              id="support-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              spellCheck={false}
              value={values.supportEmail}
              maxLength={SUPPORT_EMAIL_MAX}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  supportEmail: event.target.value,
                }))
              }
              onBlur={() => saveText("supportEmail")}
              className={cn(FIELD, "mt-2")}
            />
          </div>
        </div>
      </section>

      {/* Danger zone --------------------------------------------------------- */}
      <section className="mt-7">
        <h3 className={cn(HEADING, "text-destructive")}>
          {copy.dangerHeading}
        </h3>
        <div
          className={cn(
            TOGGLE_ROW,
            "mt-4 border-destructive/40 bg-destructive/5"
          )}
        >
          <div className="min-w-0">
            <Label
              htmlFor={maintenanceToggle.name}
              className="cursor-pointer text-[15px] leading-5 font-semibold"
            >
              {maintenanceToggle.title}
            </Label>
            <p className="text-[13px] leading-[18px] text-muted-foreground">
              {maintenanceToggle.description}
            </p>
          </div>
          <Switch
            id={maintenanceToggle.name}
            checked={values.maintenanceMode}
            onCheckedChange={(next) => {
              // Turning it *off* restores service and needs no ceremony;
              // turning it on is the destructive direction, so it asks first.
              if (next) setConfirmMaintenance(true)
              else saveToggle(maintenanceToggle.name, false)
            }}
            className={SWITCH}
          />
        </div>
      </section>

      <MaintenanceDialog
        open={confirmMaintenance}
        onOpenChange={setConfirmMaintenance}
        pending={status === "saving"}
        onConfirm={() => {
          setConfirmMaintenance(false)
          saveToggle(maintenanceToggle.name, true)
        }}
      />
    </div>
  )
}

/**
 * The export's "Changes save automatically" line, with the write's own state
 * folded into it. The double-tick is the export's glyph; it turns
 * `--success` once something has actually been written, which is the only
 * moment the sentence is a report rather than a promise.
 */
function AutosaveStatus({ status }: { status: SaveState }) {
  const copy = platformControlsCopy

  if (status === "saving") {
    return (
      <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <LoaderCircleIcon aria-hidden className="size-4 animate-spin" />
        {copy.autosaveSaving}
      </p>
    )
  }

  if (status === "error") {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-[13px] text-destructive"
      >
        <CheckCheckIcon aria-hidden className="size-4" />
        {copy.autosaveError}
      </p>
    )
  }

  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 text-[13px]",
        status === "saved" ? "text-success" : "text-muted-foreground"
      )}
    >
      <CheckCheckIcon
        aria-hidden
        className={cn("size-4", status === "saved" ? "" : "text-success")}
      />
      {status === "saved" ? copy.autosaveSaved : copy.autosaveIdle}
    </p>
  )
}

export { PlatformControlsForm }
