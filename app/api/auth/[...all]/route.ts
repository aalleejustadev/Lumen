import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "@/lib/auth"

/**
 * Every Better Auth endpoint — sign-in, sign-up, OAuth callbacks, session —
 * is served from this one catch-all. `GET /api/auth/ok` is the health check.
 */
export const { GET, POST } = toNextJsHandler(auth)
