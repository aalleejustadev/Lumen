import { adminClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/**
 * Better Auth, browser side. No `baseURL` on purpose: the client defaults to
 * the current origin, which is what we want for a single Next.js app serving
 * both the pages and `/api/auth`. Set one only if the auth server ever moves
 * to another domain.
 *
 * The plugin list mirrors the server's — `adminClient()` is the counterpart of
 * `admin()` in `lib/auth.ts`, and the two must stay in step.
 */
export const authClient = createAuthClient({
  plugins: [adminClient()],
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
