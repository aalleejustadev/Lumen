import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/lib/generated/prisma/client"

/**
 * The Prisma client, server-side only — importing it from a Client Component
 * pulls the Postgres driver into the browser bundle and fails the build.
 *
 * Prisma 7 reaches Postgres through a driver adapter, and this one gets the
 * pooled Neon endpoint: request traffic is exactly the bursty, connection-per-
 * request pattern PgBouncer is there for. The CLI uses the direct endpoint
 * instead (see `prisma7.config.ts`).
 */
function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  })
}

// The dev server re-evaluates modules on every edit; without this cache each
// reload would open another pool until Neon starts refusing connections.
const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof createClient>
}

const db = globalForDb.db ?? createClient()

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db
}

export { db }
