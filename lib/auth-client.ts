import { adminClient, inferAdditionalFields } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import type { auth } from "@/lib/auth"

/**
 * Better Auth, browser side. No `baseURL` on purpose: the client defaults to
 * the current origin, which is what we want for a single Next.js app serving
 * both the pages and `/api/auth`. Set one only if the auth server ever moves
 * to another domain.
 *
 * The plugin list mirrors the server's — `adminClient()` is the counterpart of
 * `admin()` in `lib/auth.ts`, and the two must stay in step.
 *
 * `inferAdditionalFields<typeof auth>()` teaches the client about the extra
 * user fields declared on the server (today: `intent`), so `signUp.email()`
 * accepts them and `session.user` carries them. The import is `import type`,
 * so nothing from the server config reaches the browser bundle.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), adminClient()],
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
