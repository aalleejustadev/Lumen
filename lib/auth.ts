import { cache } from "react"
import { headers } from "next/headers"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { admin } from "better-auth/plugins/admin"

import { siteConfig } from "@/lib/config/site"
import { db } from "@/lib/db"
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email"

/**
 * A provider is only registered once both of its keys are present, so the app
 * boots and email sign-in keeps working while the OAuth constants in `.env`
 * are still blank. Calling `signIn.social()` for a provider that isn't
 * registered fails with a clear error rather than a half-configured redirect.
 */
const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }
    : {}),
}

/**
 * Better Auth, server side. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and
 * `BETTER_AUTH_TRUSTED_ORIGINS` are read from the environment by the library
 * itself, so they are not repeated here.
 *
 * Server-side only — it reaches the database through `lib/db.ts`. Client
 * components talk to it over `/api/auth` via `lib/auth-client.ts`.
 */
export const auth = betterAuth({
  appName: siteConfig.name,
  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    // Off for now, as agreed: accounts work the moment they're created. The
    // verification mail is still sent on sign-up, so flipping this to true
    // once the Resend domain is verified needs no other change.
    requireEmailVerification: false,
    sendResetPassword: ({ user, url }) =>
      sendPasswordResetEmail(user.email, url),
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: ({ user, url }) =>
      sendVerificationEmail(user.email, url),
  },

  socialProviders,

  user: {
    additionalFields: {
      // Which side of the classroom the account signed up for — the "I want
      // to" choice on the register screen. Free-form on purpose: it is a
      // preference for shaping onboarding, not an authorisation role (that is
      // the admin plugin's `role`).
      intent: {
        type: "string",
        required: false,
        defaultValue: "LEARNING",
        input: true,
      },
    },
  },

  account: {
    accountLinking: {
      // Off by default, which leaves anyone who signed up with a password and
      // later linked Google/GitHub without the avatar the provider hands us.
      // Linking copies `name` and `image` across; `email`/`emailVerified` are
      // never touched, so a link can't rebind the identity.
      updateUserInfoOnLink: true,
    },
  },

  session: {
    // 30 days, because the sign-in screen promises "Keep me signed in for 30
    // days" — `rememberMe: false` still downgrades it to a browser session.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24, // refresh a rolling session once a day
    // Every `getSession()` is otherwise a round trip to Neon; a 5-minute
    // signed cookie cache keeps the common case off the database entirely.
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  rateLimit: {
    enabled: true,
    // Not "memory": each serverless instance would keep its own counters, so
    // the limit would scale with instance count instead of capping anything.
    storage: "database",
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  // `nextCookies` must stay last — it reads what the other plugins set.
  plugins: [admin(), nextCookies()],
})

export type Session = typeof auth.$Infer.Session
export type SessionUser = Session["user"]

/**
 * The current session, for Server Components. `cache` dedupes it per request,
 * so a layout and a page can both ask without a second lookup, and the cookie
 * cache configured above usually answers it without touching Postgres.
 *
 * Reading `headers()` opts the calling route into dynamic rendering — that is
 * the price of a header that knows who you are without a logged-out flash.
 */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
)
