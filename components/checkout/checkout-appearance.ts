import type { Appearance } from "@stripe/stripe-js"

/**
 * How Stripe's Elements are told to look. This is the seam between our design
 * tokens and Stripe's iframes: the inputs live on Stripe's origin, so no
 * stylesheet of ours reaches them and every value has to be handed over
 * explicitly.
 *
 * The numbers come from `checkout-page.png`, measured at DPR 2 — a `#f4f4f3`
 * field on no border, 42px tall, 8px radius, 14px bold labels 12px above it.
 * `#f4f4f3` is `--background`, which is why the fields read as insets rather
 * than boxes.
 *
 * Deliberately not theme-aware: the export is the light design, and Stripe
 * would need a whole second palette. If dark mode arrives for this page, build
 * the object from `resolvedTheme` and pass it through `changeAppearance()`.
 */
const checkoutAppearance: Appearance = {
  theme: "flat",
  variables: {
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif",
    fontSizeBase: "15px",
    // `--background`: the field fill in the export.
    colorBackground: "#f4f4f3",
    colorText: "#18181b",
    colorTextSecondary: "#71717a",
    colorTextPlaceholder: "#a1a1aa",
    colorDanger: "#ef4444",
    // Stripe's own indigo — the one colour in the export that isn't ours, and
    // the export keeps it, so we do too.
    colorPrimary: "#625cf6",
    borderRadius: "8px",
    spacingUnit: "4px",
    gridRowSpacing: "18px",
  },
  rules: {
    ".Label": {
      fontSize: "14px",
      fontWeight: "700",
      color: "#18181b",
      marginBottom: "12px",
    },
    ".Input": {
      // `theme: "flat"` already drops the border; this pins the geometry the
      // export measures rather than inheriting Stripe's own padding scale.
      padding: "11px 14px",
      border: "none",
      boxShadow: "none",
      fontSize: "15px",
    },
    ".Input:focus": {
      // Matches the app's own focus treatment (`ring-3 ring-ring/50`), since
      // the customer tabs straight from our fields into Stripe's.
      boxShadow: "0 0 0 3px rgba(98, 92, 246, 0.35)",
    },
    ".Input::placeholder": { color: "#a1a1aa" },
    ".Error": { fontSize: "13px", marginTop: "8px" },
  },
}

/**
 * Figtree is self-hosted by `next/font` out of `/_next`, which Stripe's iframe
 * can't read — a font for Elements has to be a public stylesheet URL. This is
 * the same family at the weights the export uses, so the fields match the rest
 * of the page.
 */
const checkoutFonts = [
  {
    cssSrc:
      "https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800&display=swap",
  },
]

export { checkoutAppearance, checkoutFonts }
