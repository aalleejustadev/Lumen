import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"

/**
 * Content-Security-Policy for the checkout routes — the only pages that load
 * Stripe.js. Stripe's integration security guide treats a missing CSP as a
 * real weakness: Stripe.js leans on the browser's XSS protections, and the
 * card fields live in iframes that a policy has to explicitly allow.
 *
 * Host lists are taken verbatim from that guide, unioned across the three sets
 * that apply to embedded Checkout: **Stripe.js** (api/js/hooks), **Checkout**
 * (checkout.stripe.com) and **Link** (link.com), which is on by default and is
 * what draws the autofill glyphs in the export.
 *
 * `script-src` carries `'unsafe-inline'` because Next inlines its own
 * bootstrap and flight payloads; a per-request nonce is the stronger option
 * and needs a proxy or middleware to mint one, which is a bigger change than
 * this page warranted. Everything else is locked to `'self'` plus Stripe.
 */
const stripeScript = "https://js.stripe.com https://*.js.stripe.com"
const stripeFrame = `${stripeScript} https://hooks.stripe.com https://checkout.stripe.com https://link.com https://*.link.com`
const stripeConnect =
  "https://api.stripe.com https://checkout.stripe.com https://link.com https://*.link.com"

/**
 * Google Fonts, for **Stripe's iframe only**.
 *
 * `next/font` self-hosts Figtree out of `/_next`, which the rest of the app
 * uses and which needs no external origin — but Stripe's Elements render in a
 * cross-origin iframe that cannot read those files, so
 * `checkout-appearance.ts` hands Stripe a `fonts.googleapis.com` URL instead.
 * Without these three directives that fetch is refused and the payment form
 * silently falls back to a system font, which is only visible on a real
 * deploy: the stylesheet is fetched (`connect-src`), injected (`style-src`)
 * and then pulls the woff2 from a second origin (`font-src`).
 */
const googleFonts = "https://fonts.googleapis.com"
const googleFontFiles = "https://fonts.gstatic.com"

const checkoutCsp = [
  "default-src 'self'",
  // `'unsafe-eval'` is dev-only — Turbopack's HMR runtime needs it, a
  // production build does not.
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}${stripeScript} https://checkout.stripe.com`,
  `style-src 'self' 'unsafe-inline' ${googleFonts}`,
  "img-src 'self' data: blob: https://*.stripe.com https://*.link.com",
  `font-src 'self' data: ${googleFontFiles}`,
  `frame-src ${stripeFrame}`,
  // `'self'` covers the Server Action POST that fetches the client secret;
  // dev adds the HMR websocket.
  `connect-src 'self' ${isDev ? "ws: " : ""}${stripeConnect} ${googleFonts}`,
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Checkout must not itself be framed — Stripe's own guidance is to keep the
  // embedded form out of a nested iframe, since some payment methods redirect.
  "frame-ancestors 'none'",
].join("; ")

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      // A Server Action body is capped at 1MB by default, and the profile
      // page's avatar upload posts the file itself through one
      // (`uploadAvatar`). `lib/storage.ts` refuses anything over 4MB, so this
      // is that limit plus room for the multipart framing — raising it here
      // rather than in the action is the only place Next reads it.
      bodySizeLimit: "5mb",
    },
  },
  async headers() {
    return [
      {
        source: "/checkout/:path*",
        headers: [{ key: "Content-Security-Policy", value: checkoutCsp }],
      },
      {
        source: "/checkout",
        headers: [{ key: "Content-Security-Policy", value: checkoutCsp }],
      },
    ]
  },
}

export default nextConfig
