import "dotenv/config"
import { defineConfig } from "prisma/config"

/**
 * CLI-side configuration. Everything the Prisma CLI does — migrate, db push,
 * introspection, studio — runs over Neon's *direct* endpoint: those need
 * session state and prepared statements, which PgBouncer's transaction mode
 * doesn't carry. The app's own queries go through the pooled URL instead, in
 * `lib/db.ts`. DATABASE_URL is the fallback so a single-URL setup still works.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
})
