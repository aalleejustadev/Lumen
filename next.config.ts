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

const checkoutCsp = [
  "default-src 'self'",
  // `'unsafe-eval'` is dev-only — Turbopack's HMR runtime needs it, a
  // production build does not.
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}${stripeScript} https://checkout.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.stripe.com https://*.link.com",
  // next/font self-hosts the Figtree/Geist files out of /_next, so no Google
  // Fonts origin is needed here.
  "font-src 'self' data:",
  `frame-src ${stripeFrame}`,
  // `'self'` covers the Server Action POST that fetches the client secret;
  // dev adds the HMR websocket.
  `connect-src 'self' ${isDev ? "ws: " : ""}${stripeConnect}`,
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Checkout must not itself be framed — Stripe's own guidance is to keep the
  // embedded form out of a nested iframe, since some payment methods redirect.
  "frame-ancestors 'none'",
].join("; ")

const nextConfig: NextConfig = {
  devIndicators: false,
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
